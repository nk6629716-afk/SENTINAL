import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { eventBus } from '../realtime/eventBus';

export const demoRouter = Router();

demoRouter.post('/reset', (req: Request, res: Response) => {
  const preservePending = req.query.preservePending !== 'false';
  db.resetToBaseline(preservePending);
  eventBus.publish('demo:reset', { resetAt: new Date().toISOString() });

  res.status(200).json({
    success: true,
    message: 'Demo state successfully restored to clean baseline',
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

demoRouter.post('/seed', (_req: Request, res: Response) => {
  // Restore baseline
  db.resetToBaseline();
  eventBus.publish('demo:reset', { resetAt: new Date().toISOString() });

  res.status(200).json({
    success: true,
    message: 'Demo state initialized with cross-module scenario data',
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});
