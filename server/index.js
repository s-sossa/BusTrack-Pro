/* ==============================================================================
   BusTrack Pro — Application Server Entrypoint
   ============================================================================== */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { correlationMiddleware, requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitizer.js';
import { apiRouter } from './routes/api.js';
import { telemetryEngine } from './services/telemetrySimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);

const isProd = config.nodeEnv === 'production';

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // needed for inline app.js scripts
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket connections
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow external fonts
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = config.corsOrigin === '*'
  ? true
  : config.corsOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// ─── 3. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));   // hard cap on payload size
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 4. Cross-Cutting Middlewares ─────────────────────────────────────────────
app.use(correlationMiddleware);
app.use(requestLogger);
app.use(sanitizeInputs);

// ─── 5. Block debug/admin endpoints ───────────────────────────────────────────
// These paths should NEVER be accessible in production
const blockedPaths = [
  '/admin', '/debug', '/phpinfo', '/wp-admin', '/wp-login',
  '/.env', '/.git', '/server', '/config', '/package.json',
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (blockedPaths.some(blocked => p === blocked || p.startsWith(blocked + '/'))) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 7. REST API Routes ───────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 8. Legal / Static Pages ──────────────────────────────────────────────────
// Serve legal pages as named routes
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(rootDir, 'privacy.html'));
});
app.get('/terms', (_req, res) => {
  res.sendFile(path.join(rootDir, 'terms.html'));
});
app.get('/cookies', (_req, res) => {
  res.sendFile(path.join(rootDir, 'cookies.html'));
});
app.get('/refunds', (_req, res) => {
  res.sendFile(path.join(rootDir, 'refunds.html'));
});
app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(rootDir, 'thanks.html'));
});

// ─── 9. Static Client Serving ─────────────────────────────────────────────────
app.use(express.static(rootDir, {
  index: 'index.html',
  // Cache static assets aggressively
  maxAge: isProd ? '1d' : 0,
  // Don't expose server directory
  dotfiles: 'deny',
}));

// ─── 10. Custom 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// ─── 11. Centralized Error Handling ──────────────────────────────────────────
app.use(errorHandler);

// ─── 12. Real-Time WebSocket Telemetry Gateway ────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Simple rate-limit: track message counts per client
const wsMessageCounts = new WeakMap();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);
  telemetryEngine.registerClient(ws);
  wsMessageCounts.set(ws, { count: 0, resetAt: Date.now() + 60_000 });

  ws.on('message', (message) => {
    // Rate-limit WS messages: max 60 per minute
    const tracker = wsMessageCounts.get(ws);
    if (tracker) {
      if (Date.now() > tracker.resetAt) {
        tracker.count = 0;
        tracker.resetAt = Date.now() + 60_000;
      }
      tracker.count++;
      if (tracker.count > 60) {
        ws.send(JSON.stringify({ event: 'error', detail: 'Rate limit exceeded' }));
        return;
      }
    }

    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {
      // Ignore unparseable frames
    }
  });

  ws.on('close', () => {
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error: ${err.message}`);
    telemetryEngine.unregisterClient(ws);
    wsMessageCounts.delete(ws);
  });
});

// ─── 13. Graceful Shutdown Handlers ───────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Initiating graceful shutdown...`);
  telemetryEngine.stop();

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.close(1001, 'Server shutting down');
    }
  });

  server.close(() => {
    console.log('[SERVER] HTTP & WebSocket servers closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SERVER] Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── 14. Server Bootstrap ─────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

import { initPostgresDatabase } from './database/initDb.js';
import { db } from './database/db.js';
import { supabase } from './supabase.js';

if (isMain) {
  server.listen(config.port, async () => {
    if (config.databaseUrl) {
      await initPostgresDatabase(config.databaseUrl);
    }
    const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
    telemetryEngine.start();
    console.log('============================================================');
    console.log(`  🚍 BusTrack Pro Backend & Telemetry Server Online`);
    console.log(`  🗄️ Database:   ${dbStatus ? `${dbStatus.engine} (${dbStatus.storage}: ${dbStatus.filePath || 'memory'})` : 'Active'}`);
    if (dbStatus && dbStatus.totalRows) {
      console.log(`  📊 DB Records: ${dbStatus.totalRows} filas relacionales cargadas`);
    }
    console.log(`  🔒 Security:   Helmet + Rate Limiting + Input Sanitization`);
    console.log(`  🔗 REST API:   http://localhost:${config.port}/api/v1/health`);
    console.log(`  ⚡ WebSocket:  ws://localhost:${config.port}/ws/telemetry`);
    console.log(`  🖥️ Dashboard:  http://localhost:${config.port}/`);
    console.log(`  📄 Privacy:    http://localhost:${config.port}/privacy`);
    console.log(`  📄 Terms:      http://localhost:${config.port}/terms`);
    console.log('============================================================');

    // Probando conexión a Supabase en el backend
    try {
      const { data, error } = await supabase.from('buses').select('*');
      if (error) {
        console.error('Error conectando a Supabase ❌:', error.message);
      } else {
        console.log('¡Conexión exitosa a Supabase! ✅ Datos de los buses:', data);
      }
    } catch (err) {
      console.error('Error conectando a Supabase ❌:', err.message);
    }
  });
}

export { app, server, wss };
