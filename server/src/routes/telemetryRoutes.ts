import { Router, Request, Response } from 'express';
import { telemetryService } from '../services/telemetryService';
import { ERROR_CODES } from '../../../shared/contracts';

export const telemetryRouter = Router();

telemetryRouter.get('/', (_req: Request, res: Response) => {
  const tracks = telemetryService.getTracks();
  res.status(200).json({
    success: true,
    data: tracks,
    meta: {
      count: tracks.length,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

telemetryRouter.get('/:id', (req: Request, res: Response) => {
  const track = telemetryService.getTrackById(req.params.id);
  if (!track) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Track ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: track,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

// Manual step / tick endpoint for demo control
telemetryRouter.post('/tick', (_req: Request, res: Response) => {
  const result = telemetryService.stepSimulation();
  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});
