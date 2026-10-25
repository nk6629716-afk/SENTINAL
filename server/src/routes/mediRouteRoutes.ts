import { Router, Request, Response, NextFunction } from 'express';
import { mediRouteService } from '../services/mediRouteService';
import { db } from '../db/database';
import {
  validateCreatePatient,
  validateUpdatePatient,
  validateCreateHazard,
  validateRouteCalculation,
} from '../validation/validators';
import { ERROR_CODES } from '../../../shared/contracts';

export const mediRouteRouter = Router();

// --------------------------------------------------------------------------
// Patients Endpoints
// --------------------------------------------------------------------------
mediRouteRouter.get('/patients', (req: Request, res: Response) => {
  const { workflowStatus, triageCategory } = req.query;
  const list = mediRouteService.listPatients({
    workflowStatus: typeof workflowStatus === 'string' ? workflowStatus : undefined,
    triageCategory: typeof triageCategory === 'string' ? triageCategory : undefined,
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

mediRouteRouter.get('/patients/:id', (req: Request, res: Response) => {
  const patient = mediRouteService.getPatientById(req.params.id);
  if (!patient) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Patient ${req.params.id} not found`,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: patient,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

mediRouteRouter.post('/patients', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateCreatePatient(req.body);
    const created = mediRouteService.createPatient(validated);
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

mediRouteRouter.patch('/patients/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateUpdatePatient(req.body);
    const updated = mediRouteService.updatePatient(req.params.id, validated);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: `Patient ${req.params.id} not found`,
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

// --------------------------------------------------------------------------
// Hazards Endpoints
// --------------------------------------------------------------------------
mediRouteRouter.get('/hazards', (req: Request, res: Response) => {
  const { blocked } = req.query;
  const list = mediRouteService.listHazards({
    blocked: blocked !== undefined ? blocked === 'true' : undefined,
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

mediRouteRouter.post('/hazards', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateCreateHazard(req.body);
    const saved = mediRouteService.saveHazard(validated);
    res.status(200).json({
      success: true,
      data: saved,
      meta: {
        timestamp: new Date().toISOString(),
        isSimulated: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------------------
// Routing Endpoints
// --------------------------------------------------------------------------
mediRouteRouter.post('/routes/calculate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = validateRouteCalculation(req.body);
    const result = mediRouteService.calculateRoute(validated);
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

mediRouteRouter.get('/routes/graph', (_req: Request, res: Response) => {
  const graph = db.getRoadGraph();
  res.status(200).json({
    success: true,
    data: graph,
    meta: {
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});
