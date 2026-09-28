/* ==============================================================================
   BusTrack Pro — Request Logger & Correlation Middleware
   ============================================================================== */

import { randomUUID } from 'crypto';

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    // Format compact structured log
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `[${logEntry.timestamp}] [${logEntry.correlationId.slice(0, 8)}] ` +
      `${logEntry.method} ${logEntry.path} -> ${statusColor}${logEntry.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
}
