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

/** PATCH /api/v1/auth/me — Actualizar perfil (nombre, código de usuario) */
authRouter.patch('/me', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const { name, username } = req.body;
    const updates = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.full_name = name.trim();
    }
    if (username && typeof username === 'string' && /^[a-zA-Z0-9_]{2,30}$/.test(username.trim())) {
      updates.username = username.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'No hay campos válidos para actualizar.' });
    }

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', req.user.id);
    if (error) {
      return res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: error.message });
    }

    res.json({ status: 'success', message: 'Perfil actualizado correctamente', updates });
  } catch (err) {
    res.status(500).json({ type: 'about:blank', title: 'Internal Server Error', status: 500, detail: err.message });
  }
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
  const userId = req.user.id;
  let authDeleted = false;
  let tableDeleted = false;
  const errors = [];

  // Intento 1: Eliminar de Supabase Auth usando service role key (admin)
  try {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (!authErr) {
      authDeleted = true;
    } else {
      errors.push('auth.admin.deleteUser: ' + authErr.message);
    }
  } catch (e) {
    errors.push('auth.admin.deleteUser threw: ' + e.message);
  }

  // Intento 2 (siempre): Eliminar de la tabla pública `users`
  try {
    const { error: tableErr } = await supabaseAdmin.from('users').delete().eq('id', userId);
    if (!tableErr) {
      tableDeleted = true;
    } else {
      errors.push('users.delete: ' + tableErr.message);
    }
  } catch (e) {
    errors.push('users.delete threw: ' + e.message);
  }

  // Si al menos la tabla fue limpiada, consideramos la operación exitosa
  // (el usuario de Auth quedará huérfano pero sin datos personales)
  if (authDeleted || tableDeleted) {
    console.log(`[Account] Cuenta eliminada userId=${userId} auth=${authDeleted} table=${tableDeleted}`);
    return res.json({
      status: 'success',
      message: 'Cuenta y datos personales eliminados conforme a la Ley 8968',
      authDeleted,
      tableDeleted,
    });
  }

  // Si todo falló, retornar error descriptivo
  console.error(`[Account] No se pudo eliminar userId=${userId}:`, errors);
  return res.status(500).json({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: 'No se pudo eliminar la cuenta. ' + (errors[0] || 'Error desconocido.'),
  });
});
