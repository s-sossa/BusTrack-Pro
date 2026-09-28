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
    .replace(/['"`;]/g, '')                               // strip SQL/JS injection chars
    .trim()
    .slice(0, 1000);                                      // max length guard
}

/** Recursively sanitize all string values in an object */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key too (defense in depth)
      const cleanKey = sanitizeString(key).replace(/[^a-zA-Z0-9_-]/g, '');
      clean[cleanKey] = sanitizeObject(value);
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
