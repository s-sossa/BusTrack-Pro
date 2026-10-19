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
import { app, wss } from '../server/index.js';
import { isSupabaseConfigured } from '../server/supabase.js';

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
