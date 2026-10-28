/* ==============================================================================
   BusTrack Pro — Application Configuration
   ============================================================================== */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000',
  telemetryIntervalMs: parseInt(process.env.TELEMETRY_INTERVAL_MS || '3000', 10),
  activityIntervalMs: parseInt(process.env.ACTIVITY_INTERVAL_MS || '9000', 10),
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  dbStorage: process.env.DB_STORAGE || 'sqlite',
  dbFile: process.env.DB_FILE || './data/bustrack.sqlite',
};
