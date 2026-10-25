import { Router, Request, Response, NextFunction } from 'express';
import { syncService } from '../services/syncService';
import { validateSyncBatchRequest } from '../validation/validators';

export const syncRouter = Router();

syncRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateSyncBatchRequest(req.body);
    const result = syncService.processBatch(validated);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        isSimulated: true,
      },
    });
  } catch (err) {
    next(err);
  }
});
