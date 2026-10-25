import { app } from './app';
import { config } from './config';
import { telemetryService } from './services/telemetryService';

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  SENTINEL Backend Service Active`);
  console.log(`  Environment:  ${config.nodeEnv}`);
  console.log(`  Port:         ${config.port}`);
  console.log(`  Storage Mode: ${config.storageMode}`);
  console.log(`  Data Dir:     ${config.dataDir}`);
  console.log(`  Notice:       ALL DATA IS SYNTHETIC & SIMULATED`);
  console.log(`=======================================================`);
});

// Optional periodic telemetry simulation loop
let telemetryInterval: NodeJS.Timeout | null = null;
if (config.enableAutoTelemetry) {
  telemetryInterval = setInterval(() => {
    try {
      telemetryService.stepSimulation();
    } catch (err) {
      console.error('[Telemetry] Auto-tick error:', err);
    }
  }, config.telemetryTickIntervalMs);
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
  }
  server.close(() => {
    console.log('[Server] HTTP connections closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
