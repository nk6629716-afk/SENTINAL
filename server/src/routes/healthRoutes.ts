import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { isSupabaseConfigured } from '../db/supabaseClient';
import { supabaseRepo } from '../db/supabaseRepository';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const activeStorageMode = db.getStorageMode();
  const supabaseConfigured = isSupabaseConfigured();
  let supabaseConnected = false;

  if (supabaseConfigured) {
    try {
      supabaseConnected = await supabaseRepo.ping();
    } catch {
      supabaseConnected = false;
    }
  }

  const isHealthy = config.nodeEnv !== 'production' || activeStorageMode !== 'supabase' || supabaseConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'sentinel-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    storageMode: activeStorageMode,
    supabaseConfigured,
    supabasePersistenceActive: supabaseConfigured && supabaseConnected,
    isSimulated: true,
  });
});
