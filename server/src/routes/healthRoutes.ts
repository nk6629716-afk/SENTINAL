import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'sentinel-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    storageMode: config.storageMode,
    isSimulated: true,
  });
});
