/* ==============================================================================
   BusTrack Pro — Application Server Entrypoint
   ============================================================================== */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs'; // ✅ ESM-safe
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

// ─── 0. Trust Proxy (requerido detrás de Nginx / Supabase Edge) ──────────────
// Habilita req.ip correcto y rate-limiter por IP real.
app.set('trust proxy', 1);

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
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
// ⛔ Nunca usar '*' con credentials:true. Se exige una whitelist explícita o dominios locales en dev.
const rawOrigins = (config.corsOrigin || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin o null (curl, Postman, SSR server-side, file:///)
    if (!origin || origin === 'null') return callback(null, true);
    // En desarrollo: permitir localhost y 127.0.0.1 en cualquier puerto
    if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (rawOrigins.includes('*') || rawOrigins.includes(origin)) {
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
// ⛔ Bloquear rutas sensibles antes de cualquier handler. Se compara contra
// el path URL-decodificado para evitar bypass con %73erver/ etc.
const blockedPaths = [
  '/admin', '/debug', '/phpinfo', '/wp-admin', '/wp-login',
  '/.env', '/.git', '/server', '/config', '/package.json',
  '/data', '/repomix-output', '/docker-compose',
];
app.use((req, res, next) => {
  let p;
  try {
    p = decodeURIComponent(req.path).toLowerCase();
  } catch {
    return res.status(400).type('text/plain').send('Bad Request');
  }
  if (blockedPaths.some(blocked => p === blocked || p.startsWith(blocked + '/'))) {
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
});

// ─── 6. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 7. REST API Routes ───────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 8. Legal & Auth Pages ────────────────────────────────────────────────────
// Serve auth pages as named routes
app.get('/login', (_req, res) => {
  res.sendFile(path.join(rootDir, 'login.html'));
});
app.get('/register', (_req, res) => {
  res.sendFile(path.join(rootDir, 'register.html'));
});

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
// ✅ Servir SOLO la carpeta public/ — nunca la raíz del repositorio.
// Esto evita exponer .sqlite, docker-compose.yml, repomix-output.xml, etc.
app.use('/vendor/leaflet', express.static(path.join(rootDir, 'node_modules', 'leaflet', 'dist')));

// Servir archivos estáticos del cliente desde la carpeta public/ solamente.
// Si no existe public/, se sirven los archivos HTML/CSS/JS de la raíz como fallback
// solo para compatibilidad durante la migración (ver ítem #2 del plan).
const publicDir = path.join(rootDir, 'public');
const clientDir = existsSync(publicDir) ? publicDir : rootDir;

app.use(express.static(clientDir, {
  index: 'index.html',
  maxAge: isProd ? '1d' : 0,
  dotfiles: 'deny',
  // ⛔ Nunca exponer la carpeta server/, data/, test/, docs/ ni archivos sensibles.
  setHeaders: (res, filePath) => {
    const forbidden = ['/server/', '/data/', '/test/', '/docs/', '.sqlite', '.env', '.xml'];
    if (forbidden.some(f => filePath.includes(f))) {
      res.statusCode = 403;
    }
  },
}));

// ─── 10. Custom 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// ─── 11. Centralized Error Handling ──────────────────────────────────────────
app.use(errorHandler);

// ─── 12. Real-Time WebSocket Telemetry Gateway ────────────────────────────────
// ítem #9: maxPayload limita mensajes a 64 KB; origin check rechaza conexiones externas.
const wss = new WebSocketServer({
  server,
  path: '/ws/telemetry',
  maxPayload: 64 * 1024, // ✅ 64 KB — previene payloads gigantes
  verifyClient: ({ origin }, done) => {
    // Permitir conexiones sin origin (herramientas locales, tests) solo en desarrollo
    if (!origin) return done(!isProd);
    if (rawOrigins.includes('*') || rawOrigins.includes(origin)) return done(true);
    done(false, 403, 'Origin not allowed');
  },
});

// ✅ Heartbeat: cierra sockets muertos cada 30 segundos
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
  ws.isAlive = true; // ✅ para heartbeat
  ws.on('pong', () => { ws.isAlive = true; });

  const clientIp = req.socket.remoteAddress;
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
import { supabase, isSupabaseConfigured } from './supabase.js';

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
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase no configurado: SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env están vacíos.');
      console.log('👉 Agrega tus credenciales en el archivo .env para conectar con tu proyecto Supabase real.');
    } else {
      try {
        const { data, error } = await supabase.from('buses').select('*');
        if (error) {
          console.error('Error conectando a Supabase ❌:', error.message);
        } else {
          console.log('¡Conexión exitosa a Supabase! ✅ Datos de los buses:', data);
        }
      } catch (err) {
        if (err.message && err.message.includes('fetch failed')) {
          console.error('Error conectando a Supabase ❌: No se pudo resolver la URL del proyecto. Verifica la URL en tu .env.');
        } else {
          console.error('Error conectando a Supabase ❌:', err.message);
        }
      }
    }
  });
}

export { app, server, wss };
