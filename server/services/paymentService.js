/* ==============================================================================
   BusTrack Pro — Payment Service (Stripe + Supabase)
   ⛔ REGLAS DE SEGURIDAD:
     - NUNCA se loguean, almacenan ni transmiten PAN, CVV ni datos de tarjeta en crudo.
     - Solo se almacenan tokens de Stripe (pm_xxx, cus_xxx) y metadatos no sensibles.
     - STRIPE_SECRET_KEY vive exclusivamente en variables de entorno del servidor.
   ============================================================================== */

import Stripe from 'stripe';
import { supabaseAdmin } from '../supabase.js';

// ── Stripe client (singleton) ─────────────────────────────────────────────────
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no está configurada. Configura la variable de entorno antes de usar el módulo de pagos.');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Lanza un error estandarizado compatible con el handler de rutas */
function paymentError(message, status = 500, code = null) {
  const err = new Error(message);
  err.httpStatus = status;
  if (code) err.code = code;
  return err;
}

/** Obtiene el email del usuario desde Supabase Auth */
async function getUserEmail(userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return data.user.email;
}

// ==============================================================================
// FUNCIÓN 1: Obtener o crear Stripe Customer para el usuario autenticado
// ==============================================================================
export async function getOrCreateStripeCustomer(userId, email) {
  // Buscar customer existente en Supabase
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr) throw paymentError(`Error consultando stripe_customers: ${fetchErr.message}`, 500);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  // No existe → crear en Stripe
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // Guardar en Supabase
  const { error: insertErr } = await supabaseAdmin
    .from('stripe_customers')
    .insert({ user_id: userId, stripe_customer_id: customer.id });

  if (insertErr) {
    // Si es conflicto de clave única, otro proceso ya lo creó → recuperar
    if (insertErr.code === '23505') {
      const { data: race } = await supabaseAdmin
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();
      return race?.stripe_customer_id || customer.id;
    }
    throw paymentError(`Error guardando stripe_customer: ${insertErr.message}`, 500);
  }

  return customer.id;
}

// ==============================================================================
// FUNCIÓN 2: Crear SetupIntent (devuelve clientSecret al frontend)
// ==============================================================================
export async function createSetupIntent(userId) {
  const userEmail = await getUserEmail(userId);
  const customerId = await getOrCreateStripeCustomer(userId, userEmail || undefined);
  const stripe = getStripe();

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });

  return { clientSecret: setupIntent.client_secret, customerId };
}

// ==============================================================================
// FUNCIÓN 3: Guardar método de pago confirmado
// El backend valida el SetupIntent directamente con Stripe antes de guardar.
// ⛔ NUNCA acepta datos de tarjeta directamente — solo el ID del SetupIntent.
// ==============================================================================
export async function savePaymentMethod(userId, setupIntentId) {
  if (!setupIntentId || typeof setupIntentId !== 'string' || !setupIntentId.startsWith('seti_')) {
    throw paymentError('setupIntentId inválido.', 400);
  }

  const stripe = getStripe();

  // 1. Verificar el SetupIntent con Stripe
  let intent;
  try {
    intent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    });
  } catch (stripeErr) {
    throw paymentError('No se pudo verificar el SetupIntent con Stripe.', 500);
  }

  if (intent.status !== 'succeeded') {
    throw paymentError(`El SetupIntent no está confirmado (estado: ${intent.status}).`, 400);
  }

  // 2. Verificar que el customer del SetupIntent coincida con el del usuario
  const { data: sc } = await supabaseAdmin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sc?.stripe_customer_id || intent.customer !== sc.stripe_customer_id) {
    throw paymentError('El SetupIntent no pertenece a este usuario.', 400);
  }

  // 3. Extraer metadatos de la tarjeta (nunca el PAN completo)
  const pm = intent.payment_method;
  if (!pm || !pm.card) {
    throw paymentError('El SetupIntent no tiene un método de pago de tipo tarjeta.', 400);
  }

  const { brand, last4, exp_month, exp_year } = pm.card;

  // 4. Guardar en Supabase
  const { data: saved, error: insertErr } = await supabaseAdmin
    .from('payment_methods')
    .insert({
      user_id: userId,
      provider: 'stripe',
      provider_payment_method_id: pm.id,
      provider_customer_id: sc.stripe_customer_id,
      brand: brand || 'unknown',
      last4,
      exp_month,
      exp_year,
      is_default: false, // El trigger se encarga de poner true si es el primero
    })
    .select('id, brand, last4, exp_month, exp_year, is_default, created_at')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      throw paymentError('Esta tarjeta ya está guardada en tu cuenta.', 409, '23505');
    }
    throw paymentError(`Error guardando método de pago: ${insertErr.message}`, 500);
  }

  return {
    id: saved.id,
    brand: saved.brand,
    last4: saved.last4,
    expMonth: saved.exp_month,
    expYear: saved.exp_year,
    isDefault: saved.is_default,
    createdAt: saved.created_at,
  };
}

// ==============================================================================
// FUNCIÓN 4: Listar métodos de pago del usuario
// ==============================================================================
export async function listPaymentMethods(userId) {
  const { data, error } = await supabaseAdmin
    .from('payment_methods')
    .select('id, brand, last4, exp_month, exp_year, is_default, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw paymentError(`Error listando métodos de pago: ${error.message}`, 500);

  return (data || []).map(pm => ({
    id: pm.id,
    brand: pm.brand,
    last4: pm.last4,
    expMonth: pm.exp_month,
    expYear: pm.exp_year,
    isDefault: pm.is_default,
    createdAt: pm.created_at,
  }));
}

// ==============================================================================
// FUNCIÓN 5: Establecer método predeterminado (con anti-IDOR)
// ==============================================================================
export async function setDefaultPaymentMethod(userId, paymentMethodId) {
  // Anti-IDOR: verificar que el método existe y pertenece al usuario
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('payment_methods')
    .select('id, user_id')
    .eq('id', paymentMethodId)
    .maybeSingle();

  if (checkErr) throw paymentError(`Error consultando método de pago: ${checkErr.message}`, 500);
  if (!existing) throw paymentError('Método de pago no encontrado.', 404);
  if (existing.user_id !== userId) throw paymentError('Método de pago no encontrado.', 404); // 404 intencional, no revela existencia de métodos ajenos

  // Actualizar (el trigger enforce_single_default_payment se encarga de desmarcar el anterior)
  const { error: updateErr } = await supabaseAdmin
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', paymentMethodId)
    .eq('user_id', userId); // doble verificación

  if (updateErr) throw paymentError(`Error actualizando método predeterminado: ${updateErr.message}`, 500);
}

// ==============================================================================
// FUNCIÓN 6: Eliminar método de pago (desvincula en Stripe + borra en Supabase)
// ==============================================================================
export async function deletePaymentMethod(userId, paymentMethodId) {
  // Anti-IDOR: obtener el registro verificando que pertenece al usuario
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('payment_methods')
    .select('id, user_id, provider_payment_method_id')
    .eq('id', paymentMethodId)
    .maybeSingle();

  if (checkErr) throw paymentError(`Error consultando método de pago: ${checkErr.message}`, 500);
  if (!existing) throw paymentError('Método de pago no encontrado.', 404);
  if (existing.user_id !== userId) throw paymentError('Método de pago no encontrado.', 404);

  // 1. Desvincular de Stripe
  const stripe = getStripe();
  try {
    await stripe.paymentMethods.detach(existing.provider_payment_method_id);
  } catch (stripeErr) {
    // Si ya está desvinculado en Stripe, continuamos con la eliminación en Supabase
    if (stripeErr.code !== 'payment_method_not_attached') {
      throw paymentError(`Error al desvincular método en Stripe: ${stripeErr.message}`, 500);
    }
  }

  // 2. Eliminar de Supabase (el trigger promote_next_default_on_delete se encarga de promover)
  const { error: deleteErr } = await supabaseAdmin
    .from('payment_methods')
    .delete()
    .eq('id', paymentMethodId)
    .eq('user_id', userId);

  if (deleteErr) throw paymentError(`Error eliminando método de pago: ${deleteErr.message}`, 500);
}

// ==============================================================================
// FUNCIÓN 7: Procesar webhook de Stripe
// ⛔ La firma DEBE verificarse antes de procesar cualquier evento.
// ==============================================================================
export async function handleStripeWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw paymentError('STRIPE_WEBHOOK_SECRET no configurado.', 500);
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw paymentError(`Firma de webhook inválida: ${err.message}`, 400);
  }

  // Procesar eventos relevantes
  switch (event.type) {
    case 'payment_method.detached': {
      const pmId = event.data.object.id;
      // Eliminar de Supabase si existe (puede que ya se haya eliminado desde la app)
      await supabaseAdmin
        .from('payment_methods')
        .delete()
        .eq('provider_payment_method_id', pmId);
      break;
    }
    case 'setup_intent.succeeded': {
      // Log informacional — el guardado real ocurre en POST /methods
      console.info(`[Payments] SetupIntent succeeded: ${event.data.object.id}`);
      break;
    }
    default:
      // Eventos no manejados: se ignoran silenciosamente
      break;
  }

  return { received: true, type: event.type };
}
