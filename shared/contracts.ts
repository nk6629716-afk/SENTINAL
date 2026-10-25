/**
 * SENTINEL - API Endpoint Contracts and Constants
 * Single source of truth for routes and error codes.
 */

export const API_ROUTES = {
  HEALTH: '/api/health',
  DASHBOARD: '/api/dashboard',
  INCIDENTS: '/api/incidents',
  INCIDENT_BY_ID: (id: string) => `/api/incidents/${id}`,
  SYNC: '/api/sync',
  TELEMETRY: '/api/telemetry',
  ALERTS: '/api/alerts',
  ALERT_BY_ID: (id: string) => `/api/alerts/${id}`,
  GEOINTEL_OBSERVATIONS: '/api/geointel/observations',
  GEOINTEL_OBSERVATION_BY_ID: (id: string) => `/api/geointel/observations/${id}`,
  PATIENTS: '/api/patients',
  PATIENT_BY_ID: (id: string) => `/api/patients/${id}`,
  HAZARDS: '/api/hazards',
  HAZARD_BY_ID: (id: string) => `/api/hazards/${id}`,
  ROUTES_CALCULATE: '/api/routes/calculate',
  DEMO_RESET: '/api/demo/reset',
  DEMO_SEED: '/api/demo/seed',
  EVENTS_SSE: '/api/events',
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  INVALID_STATE: 'INVALID_STATE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
