import { Router, Response, NextFunction } from 'express';
import { soldierVitalsService } from '../services/soldierVitalsService';
import { validateCreateSoldierVitals } from '../validation/validators';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { ERROR_CODES } from '../../../shared/contracts';

export const soldierVitalsRouter = Router();

// Non-clinical monitoring disclaimer
const MEDICAL_OVERSIGHT_DISCLAIMER =
  'For operational tracking and situational monitoring under qualified medical oversight. Not an automated diagnostic instrument.';

// 1. Get permitted soldiers roster
soldierVitalsRouter.get('/soldiers', (_req: AuthenticatedRequest, res: Response) => {
  const soldiers = soldierVitalsService.listSoldiers();
  res.status(200).json({
    success: true,
    data: soldiers,
    meta: {
      count: soldiers.length,
      disclaimer: MEDICAL_OVERSIGHT_DISCLAIMER,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

// 2. Get vitals records (all or by soldier query)
soldierVitalsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { soldierId } = req.query;
  const list = soldierVitalsService.listVitals(typeof soldierId === 'string' ? soldierId : undefined);

  res.status(200).json({
    success: true,
    data: list,
    meta: {
      count: list.length,
      disclaimer: MEDICAL_OVERSIGHT_DISCLAIMER,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

// 3. Get history for a specific soldier
soldierVitalsRouter.get('/:soldierId', (req: AuthenticatedRequest, res: Response) => {
  const soldier = soldierVitalsService.getSoldierById(req.params.soldierId);
  if (!soldier) {
    res.status(404).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Soldier record ${req.params.soldierId} not found`,
      },
    });
    return;
  }

  const history = soldierVitalsService.listVitals(req.params.soldierId);
  res.status(200).json({
    success: true,
    data: {
      soldier,
      history,
    },
    meta: {
      count: history.length,
      disclaimer: MEDICAL_OVERSIGHT_DISCLAIMER,
      timestamp: new Date().toISOString(),
      isSimulated: true,
    },
  });
});

// 4. Record new vital measurement (requires medical_officer or administrator)
soldierVitalsRouter.post(
  '/',
  requireRole(['administrator', 'medical_officer']),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = validateCreateSoldierVitals(req.body);
      const recordedBy = req.user ? `${req.user.email} (${req.user.role})` : 'medical_officer';
      const created = soldierVitalsService.recordVitals(validated, recordedBy);

      res.status(201).json({
        success: true,
        data: created,
        meta: {
          disclaimer: MEDICAL_OVERSIGHT_DISCLAIMER,
          timestamp: new Date().toISOString(),
          isSimulated: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
