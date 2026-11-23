/* ==============================================================================
   BusTrack Pro — Payment Routes
   Contrato: docs/PAYMENT_API_CONTRACT.md
   ⛔ Todos los endpoints (excepto /webhook) requieren autenticación JWT válida.
   ============================================================================== */

import { Router } from 'express';
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { writeLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import {
  createSetupIntent,
  savePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  createPremiumPaymentIntent,
  chargePremiumWithSavedCard,
  confirmPremiumPayment,
  getPremiumStatus,
  cancelPremiumSubscription,
  handleStripeWebhook,
} from '../services/paymentService.js';

export const paymentRouter = Router();

/** Validación de UUID v4 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Helper: formatea errores según el estándar del proyecto (Problem Details RFC 7807) */
function problemJson(res, status, title, detail) {
  return res.status(status).json({ type: 'about:blank', title, status, detail });
}

/** Helper: maneja errores del servicio de pagos */
function handleServiceError(res, err) {
  const status = err.httpStatus || 500;
  const titles = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error' };
  const title = titles[status] || 'Error';
  console.error(`[Payments] Error (${status}):`, err.message);
  return problemJson(res, status, title, err.message || 'Error interno del módulo de pagos.');
}

// ==============================================================================
// GET /api/v1/payments/config (y fallback /config/payments)
// ==============================================================================
paymentRouter.get('/config', generalLimiter, (_req, res) => {
  res.json({
    provider: process.env.PAYMENT_PROVIDER || 'onvopay',
    stripePk: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_sample_bustrack_pro',
    onvoPk: process.env.ONVO_PUBLISHABLE_KEY || 'onvo_test_pk_sample_bustrack_pro',
  });
});

// ==============================================================================
// POST /api/v1/payments/setup-intent
// ==============================================================================
paymentRouter.post('/setup-intent', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const { clientSecret, customerId } = await createSetupIntent(req.user.id);
    res.json({ status: 'success', clientSecret, customerId });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// POST /api/v1/payments/methods
// ==============================================================================
paymentRouter.post('/methods', authenticateToken, writeLimiter, async (req, res) => {
  const { setupIntentId } = req.body || {};

  if (!setupIntentId || typeof setupIntentId !== 'string') {
    return problemJson(res, 400, 'Bad Request', 'El campo setupIntentId es obligatorio.');
  }

  try {
    const paymentMethod = await savePaymentMethod(req.user.id, setupIntentId);
    res.status(201).json({ status: 'success', paymentMethod });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// GET /api/v1/payments/methods
// ==============================================================================
paymentRouter.get('/methods', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const paymentMethods = await listPaymentMethods(req.user.id);
    res.json({ status: 'success', paymentMethods });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// PUT /api/v1/payments/methods/:id/default
// ==============================================================================
paymentRouter.put('/methods/:id/default', authenticateToken, writeLimiter, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return problemJson(res, 400, 'Bad Request', 'El ID del método de pago no tiene un formato UUID válido.');
  }

  try {
    await setDefaultPaymentMethod(req.user.id, req.params.id);
    res.json({ status: 'success', message: 'Método de pago predeterminado actualizado.' });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// DELETE /api/v1/payments/methods/:id
// ==============================================================================
paymentRouter.delete('/methods/:id', authenticateToken, writeLimiter, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return problemJson(res, 400, 'Bad Request', 'El ID del método de pago no tiene un formato UUID válido.');
  }

  try {
    await deletePaymentMethod(req.user.id, req.params.id);
    res.json({ status: 'success', message: 'Método de pago eliminado.' });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// PREMIUM ENDPOINTS
// ==============================================================================

// POST /api/v1/payments/premium/create-intent
paymentRouter.post('/premium/create-intent', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const result = await createPremiumPaymentIntent(req.user.id);
    res.json({ status: 'success', ...result });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// POST /api/v1/payments/premium/charge-saved
paymentRouter.post('/premium/charge-saved', authenticateToken, writeLimiter, async (req, res) => {
  const { paymentMethodId } = req.body || {};
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return problemJson(res, 400, 'Bad Request', 'El campo paymentMethodId es obligatorio.');
  }

  try {
    const result = await chargePremiumWithSavedCard(req.user.id, paymentMethodId);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// POST /api/v1/payments/premium/confirm
paymentRouter.post('/premium/confirm', authenticateToken, writeLimiter, async (req, res) => {
  const { paymentIntentId } = req.body || {};
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return problemJson(res, 400, 'Bad Request', 'El campo paymentIntentId es obligatorio.');
  }

  try {
    const result = await confirmPremiumPayment(req.user.id, paymentIntentId);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// GET /api/v1/payments/premium/status
paymentRouter.get('/premium/status', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const status = await getPremiumStatus(req.user.id);
    res.json({ status: 'success', ...status });
  } catch (err) {
    handleServiceError(res, err);
  }
});

// POST /api/v1/payments/premium/cancel
paymentRouter.post('/premium/cancel', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const result = await cancelPremiumSubscription(req.user.id);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ==============================================================================
// POST /api/v1/payments/webhook
// ==============================================================================
paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return problemJson(res, 400, 'Bad Request', 'Falta la firma del webhook (stripe-signature).');
    }

    try {
      const result = await handleStripeWebhook(req.body, signature);
      res.json(result);
    } catch (err) {
      const status = err.httpStatus || 400;
      console.error('[Payments Webhook] Error:', err.message);
      return problemJson(res, status, status === 400 ? 'Bad Request' : 'Internal Server Error', err.message);
    }
  }
);
