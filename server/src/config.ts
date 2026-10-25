import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  storageMode: 'file' | 'memory';
  dataDir: string;
  enableSse: boolean;
  sseHeartbeatIntervalMs: number;
  telemetryTickIntervalMs: number;
  enableAutoTelemetry: boolean;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  storageMode: (process.env.STORAGE_MODE === 'memory' ? 'memory' : 'file'),
  dataDir: process.env.DATA_DIR || path.resolve(__dirname, '../../data'),
  enableSse: process.env.ENABLE_SSE !== 'false',
  sseHeartbeatIntervalMs: parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS || '15000', 10),
  telemetryTickIntervalMs: parseInt(process.env.TELEMETRY_TICK_INTERVAL_MS || '3000', 10),
  enableAutoTelemetry: process.env.ENABLE_AUTO_TELEMETRY === 'true',
};
