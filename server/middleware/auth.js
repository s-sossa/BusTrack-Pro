/* ==============================================================================
   BusTrack Pro — JWT Authentication & Authorization Middleware
   ============================================================================== */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bustrack_super_secret_jwt_key_2026_cr';

/** Middleware: Authenticate Request via Bearer Token or Cookie */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.query.token;

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
    : null;

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
