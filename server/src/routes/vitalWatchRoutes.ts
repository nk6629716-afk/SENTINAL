import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { getSupabaseClient, isSupabaseConfigured } from '../db/supabaseClient';
import { VitalSignRecord, UserProfile, PersonnelProfile } from '../../../shared/types';

export const vitalWatchRouter = Router();

// ============================================================================
// AUTH & ACCOUNT APPROVAL WORKFLOW
// ============================================================================

/**
 * POST /api/auth/signup
 * Self-signup for new personnel.
 * ALL new signups are strictly marked as 'pending' until an admin approves them.
 */
export const authRouter = Router();

authRouter.post('/signup', (req: Request, res: Response) => {
  const { email, name, callsign, role, teamId, teamName, missionId, missionName } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'A valid email address is required for signup.',
    });
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Full name is required for registration.',
    });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists.',
      status: existing.status,
    });
  }

  // Force default pending status for all self-signups
  // Users cannot self-grant approved or admin privileges
  const requestedRole = (role === 'medic' || role === 'operator' || role === 'commander') ? role : 'operator';
  const newUser: UserProfile = {
    id: `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role: requestedRole,
    status: 'pending', // Strictly pending until admin approval
    callsign: callsign?.trim() || undefined,
    teamId: teamId?.trim() || 'UNASSIGNED',
    teamName: teamName?.trim() || 'Unassigned Field Unit',
    missionId: missionId?.trim() || 'MSN-FALLING-SUN',
    missionName: missionName?.trim() || 'Operation Falling Sun',
    createdAt: new Date().toISOString(),
  };

  db.saveUser(newUser);

  // If Supabase is configured, attempt mirror write
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase
          .from('sentinel_users')
          .insert([{
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            callsign: newUser.callsign,
            team_name: newUser.teamName,
            mission_name: newUser.missionName,
            created_at: newUser.createdAt,
          }])
      )
        .then((result) => {
          if (result.error) console.warn('[Supabase] Non-fatal sync notice for signup:', result.error.message);
        })
        .catch((err: unknown) => console.warn('[Supabase] Exception during user sync:', err));
    }
  }

  return res.status(201).json({
    success: true,
    user: newUser,
    message: 'Registration received. Your account is pending administrator approval before access to tactical mission data is granted.',
  });
});

/**
 * POST /api/auth/login
 * Log in with existing credentials. Pending users are strictly blocked from mission data.
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Email address is required.',
    });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Account not found. Please self-register using the sign-up form.',
    });
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      success: false,
      status: 'pending',
      user,
      error: 'Account pending administrator approval. An administrator must approve your account before you can access mission data.',
    });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({
      success: false,
      status: 'rejected',
      error: 'Account access has been declined by an administrator.',
    });
  }

  return res.json({
    success: true,
    user,
    message: `Welcome back, ${user.name} (${user.role.toUpperCase()}).`,
  });
});

/**
 * GET /api/auth/users
 * Returns list of users for administration and review.
 */
authRouter.get('/users', (_req: Request, res: Response) => {
  const users = db.getUsers();
  return res.json({
    success: true,
    users,
    pendingCount: users.filter((u) => u.status === 'pending').length,
    approvedCount: users.filter((u) => u.status === 'approved').length,
  });
});

/**
 * PATCH /api/auth/users/:id/approve
 * Approves or rejects a pending user.
 */
authRouter.patch('/users/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({
      success: false,
      error: "Status must be either 'approved' or 'rejected'.",
    });
  }

  const updated = db.approveUser(id, approvedBy || 'ADMIN', status);
  if (!updated) {
    return res.status(404).json({
      success: false,
      error: `User ${id} not found.`,
    });
  }

  // Also auto-create or update Personnel Profile if approved
  if (status === 'approved') {
    const existingPers = db.getPersonnelById(updated.id);
    if (!existingPers) {
      db.savePersonnel({
        ...updated,
        locationHistory: [],
        isStale: true,
      });
    }
  }

  return res.json({
    success: true,
    user: updated,
    message: `User ${updated.name} has been ${status}.`,
  });
});


// ============================================================================
// VITALWATCH PERSONNEL & VITALS WORKFLOW
// ============================================================================

/**
 * GET /api/vitalwatch/summary
 * Returns overall VitalWatch operational health and metrics.
 */
vitalWatchRouter.get('/summary', (_req: Request, res: Response) => {
  const summary = db.getVitalWatchSummary();
  return res.json({
    success: true,
    summary,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/vitalwatch/personnel
 * Lists personnel with their team, mission, location, and staleness status.
 */
vitalWatchRouter.get('/personnel', (_req: Request, res: Response) => {
  const personnel = db.getPersonnel();
  return res.json({
    success: true,
    personnel,
    count: personnel.length,
  });
});

/**
 * GET /api/vitalwatch/personnel/:id
 */
vitalWatchRouter.get('/personnel/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const person = db.getPersonnelById(id);
  if (!person) {
    return res.status(404).json({
      success: false,
      error: `Personnel ${id} not found.`,
    });
  }
  return res.json({
    success: true,
    personnel: person,
  });
});

/**
 * POST /api/vitalwatch/personnel
 * Update team or mission assignment for personnel.
 */
vitalWatchRouter.post('/personnel', (req: Request, res: Response) => {
  const { id, name, teamId, teamName, missionId, missionName, role, callsign } = req.body;

  if (!id || !name) {
    return res.status(400).json({
      success: false,
      error: 'Personnel id and name are required.',
    });
  }

  const existing = db.getPersonnelById(id);
  const updated: PersonnelProfile = {
    ...(existing || {
      id,
      email: `${id.toLowerCase()}@sentinel.mil`,
      name,
      role: role || 'operator',
      status: 'approved',
      createdAt: new Date().toISOString(),
      locationHistory: [],
    }),
    name,
    teamId: teamId || existing?.teamId || 'TEAM-GENERAL',
    teamName: teamName || existing?.teamName || 'General Field Team',
    missionId: missionId || existing?.missionId || 'MSN-FALLING-SUN',
    missionName: missionName || existing?.missionName || 'Operation Falling Sun',
    callsign: callsign || existing?.callsign,
  };

  db.savePersonnel(updated);

  return res.json({
    success: true,
    personnel: updated,
  });
});

/**
 * POST /api/vitalwatch/location
 * Updates permission-based browser GPS location.
 */
vitalWatchRouter.post('/location', (req: Request, res: Response) => {
  const { personnelId, lat, lng, accuracyMeters, source } = req.body;

  if (!personnelId || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'personnelId, numeric lat, and numeric lng are required.',
    });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90, longitude between -180 and 180.',
    });
  }

  const updated = db.updatePersonnelLocation(personnelId, {
    lat,
    lng,
    accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : undefined,
    source: source === 'manual' ? 'manual' : 'browser_gps',
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: `Personnel with id ${personnelId} not found.`,
    });
  }

  return res.json({
    success: true,
    personnel: updated,
    message: 'Browser GPS location recorded.',
  });
});

/**
 * GET /api/vitalwatch/vitals
 * Returns saved vitals readings. Optional ?personnelId= filter.
 */
vitalWatchRouter.get('/vitals', (req: Request, res: Response) => {
  const personnelId = typeof req.query.personnelId === 'string' ? req.query.personnelId : undefined;
  const vitals = db.getVitals(personnelId);
  return res.json({
    success: true,
    vitals,
    count: vitals.length,
  });
});

/**
 * POST /api/vitalwatch/vitals
 * Manual vitals entry by authorized medical personnel.
 * Strictly validates inputs and verifies medical credentials.
 */
vitalWatchRouter.post('/vitals', (req: Request, res: Response) => {
  const {
    personnelId,
    personnelName,
    heartRate,
    spo2,
    systolicBp,
    diastolicBp,
    temperature,
    respiratoryRate,
    recordedBy,
    recorderRole,
    notes,
  } = req.body;

  // Authorization check: Only authorized medical personnel (medic or admin) can record vitals
  const normalizedRole = (recorderRole || '').toLowerCase().trim();
  if (normalizedRole !== 'medic' && normalizedRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Only authorized medical personnel (medic or admin role) are permitted to record patient vitals.',
    });
  }

  if (!personnelId) {
    return res.status(400).json({
      success: false,
      error: 'personnelId is required to attribute vitals.',
    });
  }

  // Validate heart rate (30 - 250 bpm)
  const hr = Number(heartRate);
  if (isNaN(hr) || hr < 30 || hr > 250) {
    return res.status(400).json({
      success: false,
      error: 'Heart rate must be a valid physiological measurement between 30 and 250 bpm.',
    });
  }

  // Validate SpO2 (50 - 100%)
  const ox = Number(spo2);
  if (isNaN(ox) || ox < 50 || ox > 100) {
    return res.status(400).json({
      success: false,
      error: 'Oxygen saturation (SpO2) must be a percentage between 50% and 100%.',
    });
  }

  // Validate Blood Pressure (systolic 50-260, diastolic 30-160)
  const sys = Number(systolicBp);
  const dia = Number(diastolicBp);
  if (isNaN(sys) || sys < 50 || sys > 260) {
    return res.status(400).json({
      success: false,
      error: 'Systolic blood pressure must be between 50 and 260 mmHg.',
    });
  }
  if (isNaN(dia) || dia < 30 || dia > 160) {
    return res.status(400).json({
      success: false,
      error: 'Diastolic blood pressure must be between 30 and 160 mmHg.',
    });
  }
  if (sys <= dia) {
    return res.status(400).json({
      success: false,
      error: 'Systolic pressure must exceed diastolic pressure.',
    });
  }

  // Validate Temperature (30.0 - 45.0 °C)
  const temp = Number(temperature);
  if (isNaN(temp) || temp < 30.0 || temp > 45.0) {
    return res.status(400).json({
      success: false,
      error: 'Temperature must be between 30.0°C and 45.0°C.',
    });
  }

  // Validate Respiratory Rate (4 - 60 bpm)
  const rr = Number(respiratoryRate);
  if (isNaN(rr) || rr < 4 || rr > 60) {
    return res.status(400).json({
      success: false,
      error: 'Respiratory rate must be between 4 and 60 breaths/min.',
    });
  }

  // Find personnel name if not supplied
  const person = db.getPersonnelById(personnelId);
  const nameToUse = personnelName || person?.name || personnelId;

  const record: VitalSignRecord = {
    id: `VIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
    personnelId,
    personnelName: nameToUse,
    heartRate: Math.round(hr),
    spo2: Math.round(ox),
    systolicBp: Math.round(sys),
    diastolicBp: Math.round(dia),
    temperature: parseFloat(temp.toFixed(1)),
    respiratoryRate: Math.round(rr),
    timestamp: new Date().toISOString(),
    recordedBy: recordedBy || 'Authorized Medical Officer',
    recorderRole: normalizedRole,
    notes: notes?.trim() || undefined,
    isManual: true, // Strictly labeled manual
  };

  db.saveVital(record);

  // If Supabase configured, attempt mirror write
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase
          .from('sentinel_vitals')
          .insert([{
            id: record.id,
            personnel_id: record.personnelId,
            heart_rate: record.heartRate,
            spo2: record.spo2,
            systolic_bp: record.systolicBp,
            diastolic_bp: record.diastolicBp,
            temperature: record.temperature,
            respiratory_rate: record.respiratoryRate,
            recorded_by: record.recordedBy,
            is_manual: true,
            created_at: record.timestamp,
          }])
      )
        .then((result) => {
          if (result.error) console.warn('[Supabase] Non-fatal vitals mirror notice:', result.error.message);
        })
        .catch((err: unknown) => console.warn('[Supabase] Exception during vitals sync:', err));
    }
  }

  return res.status(201).json({
    success: true,
    record,
    message: 'Manual vitals reading recorded and verified by medical personnel.',
  });
});
