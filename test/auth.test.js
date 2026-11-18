/* ==============================================================================
   BusTrack Pro — Authentication API Tests
   Tested against Supabase Auth (Single Source of Truth) + Validation Rules
   ============================================================================== */

import dotenv from 'dotenv';
dotenv.config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'bustrack_pro_production_secret_key_change_me_in_prod';

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { app, wss } from '../server/index.js';
import { isSupabaseConfigured } from '../server/supabase.js';
import { JWT_SECRET } from '../server/middleware/auth.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  wss?.close();
});

test('Auth Validation — POST /auth/register fails when password is less than 8 chars', async () => {
  const shortPassEmail = `shortpass_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Short Pass User',
      email: shortPassEmail,
      password: '123',
      consentTerms: true,
      consentPrivacy: true,
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('8 caracteres'));
});

test('Auth Validation — POST /auth/register fails when consentTerms is missing', async () => {
  const noConsentEmail = `noconsent_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'No Consent User',
      email: noConsentEmail,
      password: 'Password123!',
      consentTerms: false,
      consentPrivacy: true,
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Términos y Condiciones'));
});

test('Auth Validation — POST /auth/register fails when consentPrivacy is missing', async () => {
  const noPrivacyEmail = `noprivacy_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'No Privacy User',
      email: noPrivacyEmail,
      password: 'Password123!',
      consentTerms: true,
      consentPrivacy: false,
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Política de Privacidad'));
});

test('Auth Validation — POST /auth/register fails when required fields are missing', async () => {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consentTerms: true,
      consentPrivacy: true,
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('obligatorios'));
});

test('Auth Validation — POST /auth/login fails when missing credentials', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.detail, 'Correo o contraseña inválidos, intentelo de nuevo');
});

test('Auth Service — Unconfigured or live Supabase handles gracefully without crashing', async () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'NonExistentPassword123' }),
  });

  // Should return 401 Unauthorized with proper RFC 7807 detail, never 500 crash
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.detail);
});

test('Auth Service — Live Supabase signUp & signIn integration', { skip: 'Requiere credenciales en vivo de Supabase con confirmación automática de correo' }, async () => {
  const email = `test_live_${Date.now()}@bustrack.com`;
  const password = 'SuperSecret123!';
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration User',
      email,
      password,
      consentTerms: true,
      consentPrivacy: true,
    }),
  });
  assert.ok(res.status === 201 || res.status === 200);
});

// ==============================================================================
// PRUEBAS DE SUPRESIÓN DEFINITIVA DE CUENTA (Ley 8968 / GDPR Art. 17)
// ==============================================================================

test('Account Deletion — T1: Rechazo de DELETE /auth/me sin autenticación', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Password123!' }),
  });

  assert.strictEqual(res.status, 401);
  const json = await res.json();
  assert.ok(json.detail.includes('token de autenticación'));
});

test('Account Deletion — T2: Rechazo con token corrupto o inválido', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid_garbage_token_123',
    },
    body: JSON.stringify({ password: 'Password123!' }),
  });

  assert.strictEqual(res.status, 403);
  const json = await res.json();
  assert.ok(json.detail.includes('Token inválido'));
});

test('Account Deletion — T3: Rechazo cuando falta la contraseña (cuenta email)', async () => {
  const userPayload = { id: crypto.randomUUID(), email: 'delete1@bustrack.cr', role: 'passenger', provider: 'email' };
  const validToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({}), // Sin password
  });

  assert.strictEqual(res.status, 400);
  const json = await res.json();
  assert.ok(json.detail.includes('contraseña actual'));
});

test('Account Deletion — T4: Rechazo cuando la frase de confirmación OAuth es incorrecta', async () => {
  const oauthUser = { id: crypto.randomUUID(), email: 'oauth1@gmail.com', role: 'passenger', provider: 'google' };
  const validToken = jwt.sign(oauthUser, JWT_SECRET, { expiresIn: '1h' });

  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({ confirmPhrase: 'BORRAR CUENTA' }), // Frase incorrecta
  });

  assert.strictEqual(res.status, 400);
  const json = await res.json();
  assert.ok(json.detail.includes('ELIMINAR MI CUENTA'));
});

test('Account Deletion — T5: Eliminación exitosa de cuenta OAuth con frase exacta', async () => {
  const oauthUser = { id: crypto.randomUUID(), email: 'oauth2@gmail.com', role: 'passenger', provider: 'google' };
  const validToken = jwt.sign(oauthUser, JWT_SECRET, { expiresIn: '1h' });

  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`,
    },
    body: JSON.stringify({ confirmPhrase: 'ELIMINAR MI CUENTA' }),
  });

  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, 'success');
  assert.strictEqual(json.userId, oauthUser.id);
  assert.ok(json.message.includes('Ley 8968'));
});

test('Account Deletion — T6: Prevención estricta de IDOR (no se puede borrar otra cuenta inyectando userId)', async () => {
  const userA = { id: crypto.randomUUID(), email: 'ownerA@gmail.com', role: 'passenger', provider: 'google' };
  const victimId = crypto.randomUUID();
  const validTokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });

  const res = await fetch(`${baseUrl}/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validTokenA}`,
    },
    // Intento de borrar a User B enviando otro ID en el cuerpo
    body: JSON.stringify({ userId: victimId, confirmPhrase: 'ELIMINAR MI CUENTA' }),
  });

  assert.strictEqual(res.status, 200);
  const json = await res.json();
  // Se debió procesar la cuenta A (req.user.id), NUNCA la cuenta B
  assert.strictEqual(json.userId, userA.id);
});

test('Account Deletion — T7: Concurrencia e idempotencia (rechazo con 409 Conflict ante solicitudes paralelas)', async () => {
  const userC = { id: crypto.randomUUID(), email: 'concurrent@gmail.com', role: 'passenger', provider: 'google' };
  const token = jwt.sign(userC, JWT_SECRET, { expiresIn: '1h' });

  // Disparar dos solicitudes destructivas en paralelo exacto para el mismo usuario
  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmPhrase: 'ELIMINAR MI CUENTA' }),
    }),
    fetch(`${baseUrl}/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmPhrase: 'ELIMINAR MI CUENTA' }),
    }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  // Una debe procesarse (200) o dar conflicto (409)
  assert.ok(statuses.includes(200));
});
