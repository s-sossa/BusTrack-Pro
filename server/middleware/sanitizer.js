/* ==============================================================================
   BusTrack Pro — Input Sanitizer / Validator Middleware
   Protects against XSS, injection, and malformed payloads.
   ============================================================================== */

/** Strip dangerous characters from a string value */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // strip script tags
    .replace(/<[^>]+>/g, '')                              // strip HTML tags
    // ✅ ítem #7: NO quitamos comillas ni punto y coma — eso rompe contraseñas.
    // La protección contra SQL injection es responsabilidad de prepared statements.
    .trim()
    .slice(0, 2000); // max length guard aumentado para campos largos
}

/** Recursively sanitize all string values in an object, preserving password fields */
function sanitizeObject(obj, skipKeys = new Set(['password', 'passwordHash', 'currentPassword', 'newPassword'])) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, skipKeys));
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = sanitizeString(key).replace(/[^a-zA-Z0-9_-]/g, '');
      // ✅ No sanitizar campos de contraseña (los maneja bcrypt)
      clean[cleanKey] = skipKeys.has(key) ? value : sanitizeObject(value, skipKeys);
    }
    return clean;
  }
  return obj;
}

/** Express middleware: sanitize req.body, req.query, req.params */
export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  // params are read-only in express, but we can validate them
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string' && /<|>|script|eval|javascript/i.test(value)) {
        return res.status(400).json({
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: `Invalid characters in route parameter: ${key}`,
        });
      }
    }
  }
  next();
}

/** Validate bus status enum */
export function validateBusStatus(req, res, next) {
  const allowed = ['active', 'delayed', 'stopped', 'maintenance'];
  const { status } = req.body;
  if (status !== undefined && !allowed.includes(status)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid status value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}

/** Validate alert severity enum */
export function validateAlertSeverity(req, res, next) {
  const allowed = ['critical', 'warning', 'info'];
  const { severity } = req.body;
  if (severity !== undefined && !allowed.includes(severity)) {
    return res.status(400).json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid severity value. Must be one of: ${allowed.join(', ')}`,
    });
  }
  next();
}
