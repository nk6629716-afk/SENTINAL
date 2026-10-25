import { Router, Request, Response, NextFunction } from 'express';
import { geoIntelService } from '../services/geoIntelService';
import {
  validateCreateGeoObservation,
  validateUpdateGeoObservation,
} from '../validation/validators';
import { ERROR_CODES } from '../../../shared/contracts';

export const geoIntelRouter = Router();

geoIntelRouter.get('/observations', (req: Request, res: Response) => {
  const { reviewStatus, samplePairId } = req.query;
  const list = geoIntelService.listObservations({
    reviewStatus: typeof reviewStatus === 'string' ? reviewStatus : undefined,
    samplePairId: typeof samplePairId === 'string' ? samplePairId : undefined,
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

geoIntelRouter.get('/observations/:id', (req: Request, res: Response) => {
  const obs = geoIntelService.getObservationById(req.params.id);
  if (!obs) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Observation ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: obs,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

geoIntelRouter.post('/observations', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateCreateGeoObservation(req.body);
    const created = geoIntelService.createObservation(validated);
    res.status(201).json({
      success: true,
      data: created,
      meta: {
        timestamp: new Date().toISOString(),
        isSimulated: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

geoIntelRouter.patch('/observations/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateUpdateGeoObservation(req.body);
    const updated = geoIntelService.updateObservation(req.params.id, validated);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: `Observation ${req.params.id} not found`,
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
  } catch (err) {
    next(err);
  }
});
