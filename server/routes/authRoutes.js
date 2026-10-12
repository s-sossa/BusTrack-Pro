/* ==============================================================================
   BusTrack Pro — Authentication API Routes (Email, Google, Apple)
   ============================================================================== */

import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { db } from '../database/db.js';

export const authRouter = Router();

/** POST /api/v1/auth/register — Email Registration */
authRouter.post('/register', writeLimiter, async (req, res, next) => {
  try {
    const { email, password, name, consentTerms } = req.body;
    const result = await AuthService.registerWithEmail({ email, password, name, consentTerms });
    res.status(201).json({
      status: 'success',
      message: 'Cuenta creada exitosamente',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/login — Email Login */
authRouter.post('/login', writeLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginWithEmail({ email, password });
    res.json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      ...result,
    });
  } catch (err) {
    res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/google — Google OAuth Login / Register */
authRouter.post('/google', writeLimiter, async (req, res, next) => {
  try {
    const { googleToken, email, name, picture } = req.body;
    const result = await AuthService.loginWithGoogle({ googleToken, email, name, picture });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Google exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** POST /api/v1/auth/apple — Apple OAuth Login / Register */
authRouter.post('/apple', writeLimiter, async (req, res, next) => {
  try {
    const { appleToken, email, name } = req.body;
    const result = await AuthService.loginWithApple({ appleToken, email, name });
    res.json({
      status: 'success',
      message: 'Inicio de sesión con Apple exitoso',
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: err.message,
    });
  }
});

/** GET /api/v1/auth/me — Current User Profile */
authRouter.get('/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id) || req.user;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

/** POST /api/v1/auth/oauth-callback — Registra/actualiza usuario OAuth (Google/Apple via Supabase) */
authRouter.post('/oauth-callback', writeLimiter, async (req, res) => {
  try {
    const { supabaseId, email, name, provider, avatarUrl } = req.body;
    if (!email || !supabaseId) {
      return res.status(400).json({ status: 'error', detail: 'Email y supabaseId son obligatorios.' });
    }
    const result = await AuthService.loginWithOAuthCallback({ supabaseId, email, name, provider, avatarUrl });
    res.json({ status: 'success', message: `Sesión iniciada con ${provider}`, ...result });
  } catch (err) {
    res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: err.message });
  }
});

/** POST /api/v1/auth/logout — Client Logout */
authRouter.post('/logout', (req, res) => {
  res.json({ status: 'success', message: 'Sesión cerrada correctamente' });
});
