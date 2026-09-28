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

test('Auth — POST /auth/google authenticates Google OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleToken: 'mock_google_token',
      email: 'user.google.test@gmail.com',
      name: 'Google Test User',
      picture: 'https://example.com/pic.jpg',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'google');
  assert.ok(data.token);
});

test('Auth — POST /auth/apple authenticates Apple OAuth', async () => {
  const res = await fetch(`${baseUrl}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appleToken: 'mock_apple_token',
      email: 'user.apple.test@privaterelay.appleid.com',
      name: 'Apple Test User',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'success');
  assert.strictEqual(data.user.provider, 'apple');
  assert.ok(data.token);
});
