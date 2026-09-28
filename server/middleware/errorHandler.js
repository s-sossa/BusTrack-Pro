/* ==============================================================================
   BusTrack Pro — Centralized Error Handler (RFC 7807 Compliant)
   ============================================================================== */

export class ApiError extends Error {
  constructor(statusCode, title, detail, type = 'about:blank') {
    super(detail);
    this.statusCode = statusCode;
    this.title = title;
    this.detail = detail;
    this.type = type;
  }

  static badRequest(detail, title = 'Bad Request') {
    return new ApiError(400, title, detail);
  }

  static notFound(detail, title = 'Not Found') {
    return new ApiError(404, title, detail);
  }

  static conflict(detail, title = 'Conflict') {
    return new ApiError(409, title, detail);
  }

  static internal(detail = 'An unexpected internal error occurred.', title = 'Internal Server Error') {
    return new ApiError(500, title, detail);
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const title = err.title || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
  const detail = err.detail || err.message || 'An error occurred processing the request';

  const problemDetails = {
    type: err.type || 'about:blank',
    title,
    status: statusCode,
    detail,
    instance: req.originalUrl || req.url,
    correlationId: req.correlationId || null,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    console.error(`[ERROR] [${req.correlationId || 'no-id'}] ${err.stack || err}`);
  }

  res.status(statusCode).type('application/problem+json').json(problemDetails);
}
