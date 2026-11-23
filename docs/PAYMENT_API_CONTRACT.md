# BusTrack Pro — Contrato API: Módulo de Métodos de Pago

> **Versión:** 1.0 | **Fuente de Verdad** para Subagentes 2, 3 y 4.  
> Los subagentes NO pueden desviarse de este contrato sin aprobación del orquestador.

## Autenticación global

Todos los endpoints requieren:
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```
El middleware `authenticateToken` del proyecto valida tokens JWT de Supabase y emite un 401 si faltan o son inválidos.

## Base URL
```
/api/v1/payments
```

---

## Endpoints

### 1. POST `/api/v1/payments/setup-intent`
Crea un SetupIntent en Stripe y, si no existe, crea/recupera el Stripe Customer asociado al usuario autenticado.

**Request:** _(sin body)_

**Response 200:**
```json
{
  "status": "success",
  "clientSecret": "seti_xxx_secret_yyy",
  "customerId": "cus_xxx"
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o ausente |
| 500 | Error al crear SetupIntent en Stripe |

---

### 2. POST `/api/v1/payments/methods`
Guarda un método de pago confirmado (tras `stripe.confirmCardSetup` en el cliente).  
El backend valida el SetupIntent directamente con Stripe, extrae metadatos de la tarjeta y los persiste en Supabase.  
⛔ **NUNCA** acepta ni registra PAN, CVV ni número de tarjeta directamente.

**Request body:**
```json
{
  "setupIntentId": "seti_xxx"
}
```

**Validaciones:**
- `setupIntentId` requerido, debe ser string con prefijo `seti_`.
- El status del SetupIntent debe ser `"succeeded"` al consultarlo en Stripe.
- El `customer` del SetupIntent debe coincidir con el `stripe_customer_id` del usuario autenticado.

**Response 201:**
```json
{
  "status": "success",
  "paymentMethod": {
    "id": "uuid",
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2027,
    "isDefault": true,
    "createdAt": "2026-11-23T16:00:00Z"
  }
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 400 | setupIntentId faltante o formato inválido |
| 400 | SetupIntent no tiene status `succeeded` |
| 400 | Customer del SetupIntent no pertenece al usuario autenticado |
| 401 | Token inválido o ausente |
| 409 | El método de pago ya existe en la cuenta |
| 500 | Error de Stripe o Supabase |

---

### 3. GET `/api/v1/payments/methods`
Lista todos los métodos de pago guardados del usuario autenticado.

**Response 200:**
```json
{
  "status": "success",
  "paymentMethods": [
    {
      "id": "uuid",
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2027,
      "isDefault": true,
      "createdAt": "2026-11-23T16:00:00Z"
    }
  ]
}
```

---

### 4. PUT `/api/v1/payments/methods/:id/default`
Establece el método indicado como predeterminado. El trigger de base de datos desactiva el predeterminado anterior.  
⛔ Anti-IDOR: valida que el método pertenece al usuario autenticado antes de cualquier acción.

**URL param:** `id` — UUID del método en Supabase.

**Response 200:**
```json
{
  "status": "success",
  "message": "Método de pago predeterminado actualizado."
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 400 | UUID inválido |
| 401 | Token inválido o ausente |
| 404 | Método no existe o no pertenece al usuario |

---

### 5. DELETE `/api/v1/payments/methods/:id`
Elimina el método de pago:
1. Verifica que el `id` pertenece al usuario autenticado (anti-IDOR).
2. Llama a `stripe.paymentMethods.detach(provider_payment_method_id)`.
3. Elimina la fila de Supabase.
4. Si era el predeterminado, el trigger de base de datos promoverá el siguiente.

**URL param:** `id` — UUID del método en Supabase.

**Response 200:**
```json
{
  "status": "success",
  "message": "Método de pago eliminado."
}
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 400 | UUID inválido |
| 401 | Token inválido o ausente |
| 404 | Método no existe o no pertenece al usuario |
| 500 | Error al desvincular en Stripe |

---

### 6. POST `/api/v1/payments/webhook`
Endpoint para webhooks de Stripe. Verifica la firma del evento con `STRIPE_WEBHOOK_SECRET`.  
⛔ No requiere `authenticateToken` (es Stripe quien llama), pero la firma es obligatoria.

**Headers:** `stripe-signature: t=xxx,v1=yyy`

**Eventos manejados:**
- `payment_method.detached` — Marcar/eliminar método si se desvincula desde Stripe dashboard.
- `setup_intent.succeeded` — Log opcional (el guardado real ocurre en POST `/methods`).

**Response 200:**
```json
{ "received": true }
```

**Errores:**
| Código | Descripción |
|--------|-------------|
| 400 | Firma inválida o payload corrupto |

---

## Variables de Entorno requeridas (backend)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Variables de Entorno requeridas (frontend)

```
# Solo la publishable key es segura en el cliente
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Formato de Error (Problem Details — RFC 7807)
Consistente con el resto de la API del proyecto:
```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Mensaje de error descriptivo en español."
}
```

---

## Reglas de seguridad obligatorias para Subagentes 2, 3 y 4

1. ⛔ El backend NUNCA loguea `provider_payment_method_id` completo en logs de texto libre.
2. ⛔ El frontend NUNCA maneja ni almacena datos de tarjeta directamente. Stripe Elements los captura y tokeniza.
3. ⛔ La `STRIPE_SECRET_KEY` NUNCA debe aparecer en código cliente ni en logs.
4. ✅ Cada endpoint de pagos DEBE pasar por `authenticateToken` (excepto `/webhook`).
5. ✅ Antes de cualquier operación sobre un método, verificar `user_id = req.user.id`.
6. ✅ El webhook DEBE verificar `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
7. ✅ Usar `express.raw()` para el endpoint `/webhook` (Stripe requiere el body crudo para verificar firma).
8. ✅ La CSP del servidor debe incluir `https://js.stripe.com` y `https://api.stripe.com`.
