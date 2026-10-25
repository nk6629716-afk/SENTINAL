import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { isSupabaseConfigured } from '../db/supabaseClient';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const activeStorageMode = db.getStorageMode();
  const supabaseConfigured = isSupabaseConfigured();

  res.status(200).json({
    status: 'ok',
    service: 'sentinel-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    storageMode: activeStorageMode,
    supabaseConfigured,
    supabasePersistenceActive: false,
    isSimulated: true,
  });
});

