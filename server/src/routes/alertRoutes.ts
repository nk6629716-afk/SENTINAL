import { Router, Request, Response } from 'express';
import { telemetryService } from '../services/telemetryService';
import { ERROR_CODES } from '../../../shared/contracts';

export const alertRouter = Router();

alertRouter.get('/', (req: Request, res: Response) => {
  const { acknowledged, trackId, severity } = req.query;
  const list = telemetryService.getAlerts({
    acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
    trackId: typeof trackId === 'string' ? trackId : undefined,
    severity: typeof severity === 'string' ? severity : undefined,
  });

  res.status(200).json({
    success: true,
    data: list,
    meta: {
      count: list.length,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

alertRouter.get('/:id', (req: Request, res: Response) => {
  const alert = telemetryService.getAlertById(req.params.id);
  if (!alert) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Alert ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: alert,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

alertRouter.patch('/:id', (req: Request, res: Response) => {
  const { acknowledged } = req.body;
  if (acknowledged !== true) {
    res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Expected { acknowledged: true }',
      },
    });
    return;
  }

  const updated = telemetryService.acknowledgeAlert(req.params.id);
  if (!updated) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Alert ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: updated,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});
