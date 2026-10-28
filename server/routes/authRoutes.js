/* ==============================================================================
   BusTrack Pro — Authentication API Routes
   ✅ Solo Email + Supabase Auth. No Google/Apple directo.
   ============================================================================== */

import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { supabaseAdmin } from '../supabase.js';

export const authRouter = Router();

/** POST /api/v1/auth/register — Email Registration */
authRouter.post('/register', writeLimiter, async (req, res) => {
  try {
    const { email, password, name, consentTerms, consentPrivacy } = req.body;
    const result = await AuthService.registerWithEmail({ email, password, name, consentTerms, consentPrivacy });
    if (result.pendingConfirmation) {
      return res.status(201).json({
        status: 'pending',
        message: 'Revisa tu correo para confirmar la cuenta antes de iniciar sesión.',
      });
    }
    res.status(201).json({ status: 'success', message: 'Cuenta creada exitosamente', ...result });
  } catch (err) {
    res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: err.message });
  }
});

/** POST /api/v1/auth/login — Email Login */
authRouter.post('/login', writeLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginWithEmail({ email, password });
    res.json({ status: 'success', message: 'Inicio de sesión exitoso', ...result });
  } catch (err) {
    res.status(401).json({ type: 'about:blank', title: 'Unauthorized', status: 401, detail: err.message });
  }
});

/** GET /api/v1/auth/me — Current User Profile */
authRouter.get('/me', authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, auth_provider, avatar_url')
    .eq('id', req.user.id)
    .maybeSingle();
  if (error || !data) {
    return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Usuario no encontrado.' });
  }
  res.json({
    user: {
      id: data.id, email: data.email, name: data.full_name,
      role: data.role, provider: data.auth_provider, avatarUrl: data.avatar_url,
    },
  });
});

/** POST /api/v1/auth/oauth-callback — Registra/actualiza usuario OAuth via token */
authRouter.post('/oauth-callback', writeLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1] : null;
    const result = await AuthService.loginWithOAuthCallback(token);
    res.json({ status: 'success', message: 'Sesión iniciada', ...result });
  } catch (err) {
    res.status(401).json({ type: 'about:blank', title: 'Unauthorized', status: 401, detail: err.message });
  }
});

/** POST /api/v1/auth/logout — Client Logout */
authRouter.post('/logout', (req, res) => {
  res.json({ status: 'success', message: 'Sesión cerrada correctamente' });
});

/** GET /api/v1/auth/me/export — ARCO: Exportación de datos personales (Ley 8968) */
authRouter.get('/me/export', authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();
  if (error || !data) {
    return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Usuario no encontrado.' });
  }
  res.setHeader('Content-Disposition', `attachment; filename="bustrack-datos-${req.user.id}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    legalBasis: 'Ley 8968 Costa Rica - Derecho de Acceso y Portabilidad',
    user: data,
  });
});

/** DELETE /api/v1/auth/me — ARCO: Supresión / Cancelación de cuenta (Ley 8968) */
authRouter.delete('/me', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (authErr) {
      await supabaseAdmin.from('users').delete().eq('id', req.user.id);
    }
    res.json({ status: 'success', message: 'Cuenta y datos personales eliminados conforme a la Ley 8968' });
  } catch (err) {
    res.status(500).json({ type: 'about:blank', title: 'Internal Server Error', status: 500, detail: err.message });
  }
});
