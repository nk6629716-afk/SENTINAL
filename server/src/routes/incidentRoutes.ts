import { Router, Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incidentService';
import {
  validateCreateIncident,
  validateUpdateIncident,
} from '../validation/validators';
import { ERROR_CODES } from '../../../shared/contracts';

export const incidentRouter = Router();

incidentRouter.get('/', (req: Request, res: Response) => {
  const { sourceModule, type, priority, status, search } = req.query;
  const list = incidentService.listIncidents({
    sourceModule: typeof sourceModule === 'string' ? sourceModule : undefined,
    type: typeof type === 'string' ? type : undefined,
    priority: typeof priority === 'string' ? priority : undefined,
    status: typeof status === 'string' ? status : undefined,
    search: typeof search === 'string' ? search : undefined,
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

incidentRouter.get('/:id', (req: Request, res: Response) => {
  const incident = incidentService.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Incident ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: incident,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

incidentRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateCreateIncident(req.body);
    const created = incidentService.createIncident(validated);
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

incidentRouter.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateUpdateIncident(req.body);
    const updated = incidentService.updateIncident(req.params.id, validated);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: `Incident ${req.params.id} not found`,
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
