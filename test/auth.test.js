/* ==============================================================================
   BusTrack Pro — Authentication API Unit Tests
   ============================================================================== */

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.js';

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
});

test('Auth — POST /auth/register creates new user with consent', async () => {
  const testEmail = `test_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Pruebas',
      email: testEmail,
      password: 'Password123!',
      consentTerms: true,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/login authenticates registered user', async () => {
  const testEmail = `login_test_${Date.now()}@bustrack.com`;
  
  // First register
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Login Test',
      email: testEmail,
      password: 'MySecretPassword123',
      consentTerms: true,
    }),
  });

  // Then login
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'MySecretPassword123',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.email, testEmail);
  assert.ok(data.token);
});

test('Auth — POST /auth/register fails when password is less than 8 chars', async () => {
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

test('Auth — POST /auth/register fails when consent is missing', async () => {
  const noConsentEmail = `noconsent_${Date.now()}@bustrack.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'No Consent User',
      email: noConsentEmail,
      password: 'Password123!',
      consentTerms: false,
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Términos') || data.detail.includes('Privacidad'));
});

test('Auth — POST /auth/register fails on duplicate email', async () => {
  const dupEmail = `dup_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 1', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 2', email: dupEmail, password: 'Password123!', consentTerms: true }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.detail.includes('Ya existe una cuenta'));
});

test('Auth — POST /auth/login fails with wrong password', async () => {
  const testEmail = `wrongpass_${Date.now()}@bustrack.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Wrong Pass User', email: testEmail, password: 'CorrectPassword123', consentTerms: true }),
  });

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword123' }),
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.detail.includes('inválidos') || data.detail.includes('incorrectos'));
});

test('Auth — GET /auth/me returns profile for valid JWT token', async () => {
  const meEmail = `me_${Date.now()}@bustrack.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Profile Me', email: meEmail, password: 'MyPassword123!', consentTerms: true }),
  });
  const regData = await regRes.json();

  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${regData.token}` },
  });

  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, meEmail);
});

