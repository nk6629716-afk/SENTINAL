import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req: Request, res: Response) => {
  const summary = dashboardService.getSummary();
  res.status(200).json({
    success: true,
    data: summary,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});
