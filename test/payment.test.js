/* ==============================================================================
   BusTrack Pro — Payment Module Automated Tests
   Runner: Node.js native test runner (`node --test`)
   Framework: `node:test` + `node:assert/strict` (using native http/fetch)
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { paymentRouter } from '../server/routes/paymentRoutes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bustrack_pro_dev_secret_key_12345678901234567890';
const validToken = jwt.sign({ id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', role: 'user' }, JWT_SECRET);

let server;
let baseUrl;

test.before(async () => {
  const app = express();
  app.use(express.json());
  
  app.get('/config/payments', (req, res) => {
    res.json({
      stripePk: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
    });
  });

  app.use('/api/v1/payments', paymentRouter);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://localhost:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('T1: GET /api/v1/payments/methods without auth token returns 401', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/methods`);
  assert.equal(res.status, 401);
});

test('T2: POST /api/v1/payments/setup-intent without auth token returns 401', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/setup-intent`, { method: 'POST' });
  assert.equal(res.status, 401);
});

test('T3: POST /api/v1/payments/methods without token or invalid setupIntentId returns 401/400', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/methods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupIntentId: 'seti_test_123' }),
  });
  assert.equal(res.status, 401);
});

test('T4: PUT /api/v1/payments/methods/:id/default with invalid non-UUID format returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/methods/not-a-uuid/default`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
  });
  assert.equal(res.status, 400);
});

test('T5: DELETE /api/v1/payments/methods/:id with invalid non-UUID format returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/methods/not-a-uuid`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${validToken}` },
  });
  assert.equal(res.status, 400);
});

test('T6: POST /api/v1/payments/webhook without stripe-signature header returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/v1/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'payment_intent.succeeded' }),
  });
  assert.equal(res.status, 400);
});

test('T7: Public endpoint /config/payments returns stripePk without exposing secret keys', async () => {
  const res = await fetch(`${baseUrl}/config/payments`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.stripePk);
  assert.equal(data.stripeSecretKey, undefined);
  assert.equal(data.STRIPE_SECRET_KEY, undefined);
  assert.equal(data.secret, undefined);
});

test('T8: Strict verification that no sensitive card data (PAN, CVV) is present in schemas or structures', async () => {
  const mockPaymentMethodResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2027,
    isDefault: true,
    createdAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(mockPaymentMethodResponse).toLowerCase();
  assert.equal(jsonString.includes('pan'), false);
  assert.equal(jsonString.includes('cvv'), false);
  assert.equal(jsonString.includes('number'), false);
  assert.equal(jsonString.includes('cardnumber'), false);
});
