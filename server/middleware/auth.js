/* ==============================================================================
   BusTrack Pro — JWT Authentication & Authorization Middleware
   ============================================================================== */

import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// ⛔ Validar o autogenerar JWT_SECRET con alta entropía (256-bit)
let secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.includes('change_me') || secret.includes('secret_key')) {
  if (process.env.NODE_ENV === 'production') {
    secret = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = secret;
    console.warn('[SECURITY] ADVERTENCIA: JWT_SECRET no configurado o contiene placeholders en producción. Se autogeneró un secreto criptográfico seguro (256 bits) para esta sesión.');
  } else {
    secret = secret || 'bustrack_pro_dev_secret_key_12345678901234567890';
    console.warn('[SECURITY] ADVERTENCIA: JWT_SECRET en modo desarrollo/pruebas.');
  }
}

const JWT_SECRET = secret;

/** Middleware: Authenticate Request via Bearer Token or Cookie */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null; // ⛔ No se acepta token por query string (seguridad)

  if (!token) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Acceso denegado. Se requiere un token de autenticación válido.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Token inválido o expirado. Por favor inicia sesión nuevamente.',
      });
    }
    req.user = user;
    next();
  });
}

/** Optional Auth: Attaches user if valid token present, doesn't block if missing */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null; // ⛔ No se acepta token por query string

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/** Role Guard Middleware */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Inicia sesión para realizar esta acción.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: `Requiere permisos de: ${roles.join(' o ')}.`,
      });
    }

    next();
  };
}

export { JWT_SECRET };
