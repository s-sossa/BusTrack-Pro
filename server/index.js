/* ==============================================================================
   BusTrack Pro — Application Server Entrypoint
   ============================================================================== */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { correlationMiddleware, requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, writeLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitizer.js';
import { authenticateToken, requireRole, JWT_SECRET } from './middleware/auth.js';
import { apiRouter } from './routes/api.js';
import { telemetryEngine } from './services/telemetrySimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const app = express();
const server = http.createServer(app);

const isProd = config.nodeEnv === 'production';

// ─── 0. Trust Proxy (requerido detrás de Nginx / Supabase Edge) ──────────────
app.set('trust proxy', 1);

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://unpkg.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://unpkg.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.tile.openstreetmap.org',
        'https://tile.openstreetmap.org',
        'https://server.arcgisonline.com',
        'https://services.arcgisonline.com',
        'https://*.arcgisonline.com',
        'https://*.basemaps.cartocdn.com',
        'https://basemaps.cartocdn.com',
        'https://api.dicebear.com',
        'https://unpkg.com',
        'https://cdnjs.cloudflare.com',
      ],
      connectSrc: [
        "'self'",
        'ws:',
        'wss:',
        'https://*.supabase.co',
        'https://*.tile.openstreetmap.org',
        'https://tile.openstreetmap.org',
        'https://server.arcgisonline.com',
        'https://services.arcgisonline.com',
        'https://*.arcgisonline.com',
        'https://*.basemaps.cartocdn.com',
        'https://basemaps.cartocdn.com',
      ],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow external fonts and tiles
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
// ⛔ Nunca usar '*' con credentials:true ni permitir origin 'null'. Se exige whitelist explícita.
const rawOrigins = (config.corsOrigin || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin cabecera origin (curl, Postman, llamadas internas de servidor)
    if (!origin) return callback(null, true);
    // ⛔ Nunca permitir origin 'null' con credentials:true (evita ataques sandbox/data URI)
    if (origin === 'null') return callback(new Error('CORS: Origen null no permitido'));
    // En desarrollo: permitir localhost y 127.0.0.1 en cualquier puerto
    if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (rawOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!isProd && rawOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
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

// ─── 5. Block debug/admin/sensitive endpoints ──────────────────────────────────
const blockedPaths = [
  '/admin', '/debug', '/phpinfo', '/wp-admin', '/wp-login',
  '/.env', '/.git', '/server', '/config', '/package.json',
  '/data', '/repomix-output', '/docker-compose',
  '/docs', '/test', '/.expo', '/.agents', '/.claude',
];
const blockedExtensions = [
  '.sqlite', '.sqlite-shm', '.sqlite-wal', '.sql', '.env', '.xml', '.jsonl', '.log',
];

app.use((req, res, next) => {
  let p;
  try {
    p = decodeURIComponent(req.path).toLowerCase();
  } catch {
    return res.status(400).type('text/plain').send('Bad Request');
  }
  if (
    blockedPaths.some(blocked => p === blocked || p.startsWith(blocked + '/')) ||
    blockedExtensions.some(ext => p.endsWith(ext) || p.includes(ext + '/'))
  ) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 7. REST API Routes ───────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 8. Legal & Auth Pages ────────────────────────────────────────────────────
app.get('/login', (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});
app.get('/register', (_req, res) => {
  res.sendFile(path.join(publicDir, 'register.html'));
});

// Serve legal pages as named routes
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});
app.get('/terms', (_req, res) => {
  res.sendFile(path.join(publicDir, 'terms.html'));
});
app.get('/cookies', (_req, res) => {
  res.sendFile(path.join(publicDir, 'cookies.html'));
});
app.get('/refunds', (_req, res) => {
  res.sendFile(path.join(publicDir, 'refunds.html'));
});
app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(publicDir, 'thanks.html'));
});

// ─── 9. Static Client Serving ─────────────────────────────────────────────────
// ✅ Servir SOLO la carpeta public/ — nunca la raíz del repositorio.
app.use('/vendor/leaflet', express.static(path.join(rootDir, 'node_modules', 'leaflet', 'dist')));
app.use('/vendor/supabase', express.static(path.join(rootDir, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd')));

app.use(express.static(publicDir, {
  index: 'index.html',
  maxAge: isProd ? '1d' : 0,
  dotfiles: 'deny',
}));

// ─── 10. Custom 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

// ─── 11. Centralized Error Handling ──────────────────────────────────────────
app.use(errorHandler);

// ─── 12. Real-Time WebSocket Telemetry Gateway ────────────────────────────────
const wss = new WebSocketServer({
  server,
  path: '/ws/telemetry',
  maxPayload: 64 * 1024, // 64 KB — previene payloads gigantes
  verifyClient: ({ origin }, done) => {
    if (!origin) return done(!isProd);
    if (rawOrigins.includes('*') || rawOrigins.includes(origin)) return done(true);
    done(false, 403, 'Origin not allowed');
  },
});

// Heartbeat: cierra sockets muertos cada 30 segundos
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);
wss.on('close', () => clearInterval(wsHeartbeat));

// Rate-limit: track message counts per client
const wsMessageCounts = new WeakMap();

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  let isAdmin = false;
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const token = urlObj.searchParams.get('token');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && (decoded.role === 'admin' || decoded.role === 'dispatcher')) {
        isAdmin = true;
      }
    }
  } catch {
    isAdmin = false;
  }

  telemetryEngine.registerClient(ws, isAdmin);
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
      } else if (parsed.action === 'authenticate' && parsed.token) {
        try {
          const decoded = jwt.verify(parsed.token, JWT_SECRET);
          if (decoded && (decoded.role === 'admin' || decoded.role === 'dispatcher')) {
            ws.isAdmin = true;
            telemetryEngine.sendSnapshot(ws);
            ws.send(JSON.stringify({ event: 'authenticated', role: decoded.role }));
          } else {
            ws.send(JSON.stringify({ event: 'error', detail: 'Permisos insuficientes' }));
          }
        } catch {
          ws.send(JSON.stringify({ event: 'error', detail: 'Token inválido' }));
        }
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
import { supabase, isSupabaseConfigured } from './supabase.js';

if (isMain) {
  server.listen(config.port, async () => {
    if (config.databaseUrl) {
      await initPostgresDatabase(config.databaseUrl);
    }
    const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
    telemetryEngine.start();

    // ─── Telemetry / Activity Retention (Ley 8968 — minimización de datos) ──────
    // Elimina registros de actividad con más de 30 días al arrancar y cada 24 h.
    const RETENTION_DAYS = 30;
    const pruneActivities = () => {
      try {
        const deleted = typeof db.pruneOldActivities === 'function'
          ? db.pruneOldActivities(RETENTION_DAYS)
          : 0;
        if (deleted > 0) {
          console.log(`[RETENTION] Eliminados ${deleted} registros de actividad con más de ${RETENTION_DAYS} días.`);
        }
      } catch (err) {
        console.error('[RETENTION] Error al podar actividades:', err.message);
      }
    };
    pruneActivities(); // Ejecución inmediata al arrancar
    setInterval(pruneActivities, 24 * 60 * 60 * 1000).unref(); // Cada 24 horas

    console.log('============================================================');
    console.log(`  🚍 BusTrack Pro Backend & Telemetry Server Online`);
    console.log(`  🗄️ Database:   ${dbStatus ? `${dbStatus.engine} (${dbStatus.storage})` : 'Active'}`);
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

    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase no configurado: credenciales vacías en .env');
    } else {
      try {
        const { data, error } = await supabase.from('buses').select('*');
        if (error) {
          console.error('Error conectando a Supabase ❌:', error.message);
        } else {
          console.log('¡Conexión exitosa a Supabase! ✅');
        }
      } catch (err) {
        console.error('Error conectando a Supabase ❌:', err.message);
      }
    }
  });
}

export { app, server, wss };
