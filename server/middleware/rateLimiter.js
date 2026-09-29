/* ==============================================================================
   BusTrack Pro — Rate Limiter Middleware
   Protects public API endpoints from abuse and DDoS attempts.
   ============================================================================== */

import { rateLimit } from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/** General API rate limit: 100 requests per 15 minutes per IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'You have exceeded the request limit. Please try again later.',
  },
  skip: (req) => req.path === '/health' || req.path === '/database/status', // health and DB status checks are exempt
});

/** Stricter limit for write operations: 20 requests per 15 minutes per IP */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    type: 'https://bustrack.example.com/errors/rate-limit',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Write operation limit reached. Please slow down and try again.',
  },
});
