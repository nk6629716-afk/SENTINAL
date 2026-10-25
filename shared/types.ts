/**
 * SENTINEL - Shared Types and Domain Contracts
 * Shared across Person 1 (Frontend), Person 2 (Backend), and Person 3 (Algorithms).
 * 
 * NOTE: All data is fictional and clearly labeled as simulated.
 */

// --------------------------------------------------------------------------
// Core & Common Types
// --------------------------------------------------------------------------

export type SourceModule = 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute' | 'system';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface GeoPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: {
    timestamp: string;
    isSimulated: true;
  };
}

// --------------------------------------------------------------------------
// 1. Incident Reports (FieldLink & Shared Awareness)
// --------------------------------------------------------------------------

export type IncidentType =
  | 'medical'
  | 'hazard'
  | 'hostile_drone'
  | 'infrastructure'
  | 'recon'
  | 'general';

export type IncidentStatus = 'active' | 'in_progress' | 'resolved' | 'archived';

export interface Incident {
  id: string;
  clientId?: string; // Client-side idempotency/tracking key
  sourceModule: SourceModule;
  type: IncidentType;
  priority: PriorityLevel;
  status: IncidentStatus;
  title: string;
  notes: string;
  location: GeoPoint;
  createdAt: string; // ISO 8601 (preserved client creation time)
  updatedAt: string; // ISO 8601
  syncedAt?: string;  // ISO 8601 (server receipt time)
  isSimulated: true;
}

export interface CreateIncidentInput {
  clientId?: string;
  sourceModule: SourceModule;
  type: IncidentType;
  priority: PriorityLevel;
  title: string;
  notes: string;
  location: GeoPoint;
  status?: IncidentStatus;
  createdAt?: string;
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  priority?: PriorityLevel;
  notes?: string;
  title?: string;
}

// --------------------------------------------------------------------------
// 2. Offline Synchronization (FieldLink Batch Sync)
// --------------------------------------------------------------------------

export type SyncItemOutcome = 'accepted' | 'already_received' | 'rejected';

export interface SyncBatchItem {
  clientId: string; // Unique client-generated ID
  sourceModule: SourceModule;
  type: IncidentType;
  priority: PriorityLevel;
  title: string;
  notes: string;
  location: GeoPoint;
  createdAt: string; // Client-side generation timestamp
  status?: IncidentStatus;
}

export interface SyncItemResult {
  clientId: string;
  serverId: string | null;
  status: SyncItemOutcome;
  reason?: string;
  syncedAt: string;
}

export interface SyncBatchRequest {
  batchId?: string;
  items: SyncBatchItem[];
}

export interface SyncBatchResponse {
  results: SyncItemResult[];
  processedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  processedAt: string;
}

// --------------------------------------------------------------------------
// 3. Counter-Drone Monitoring (SkyWatch)
// --------------------------------------------------------------------------

export interface TelemetryPosition {
  lat: number;
  lng: number;
  altitudeMeters: number;
}

export interface TelemetryTrack {
  id: string; // e.g. "TRK-001"
  callsign: string;
  position: TelemetryPosition;
  speedKts: number;
  headingDeg: number;
  timestamp: string; // ISO 8601
  isSimulated: true;
  anomalyFlags?: string[];
}

export type AnomalyRuleName =
  | 'SUDDEN_ACCELERATION'
  | 'ZONE_INCURSION'
  | 'ROUTE_DEVIATION'
  | 'STALE_TELEMETRY';

export interface Alert {
  id: string;
  trackId: string;
  severity: PriorityLevel;
  ruleName: AnomalyRuleName;
  observedValue: string | number;
  threshold: string | number;
  explanation: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  isSimulated: true;
}

export interface UpdateAlertInput {
  acknowledged: boolean;
}

// --------------------------------------------------------------------------
// 4. Geospatial Intelligence & Change Detection (GeoIntel)
// --------------------------------------------------------------------------

export type GeoIntelReviewStatus =
  | 'pending_review'
  | 'confirmed_candidate'
  | 'dismissed_false_positive';

export interface BoundingBox {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
  width: number;
  height: number;
}

export interface GeoIntelObservation {
  id: string;
  samplePairId: string;
  beforeImageId: string;
  afterImageId: string;
  normalizedCoordinates: BoundingBox;
  geoCoordinates?: GeoPoint;
  differenceScore: number; // 0.0 - 1.0
  algorithmSettings: {
    threshold: number;
    minRegionSize: number;
    blurRadius?: number;
  };
  explanation: string;
  analystNotes: string;
  reviewStatus: GeoIntelReviewStatus;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: true;
}

export interface CreateGeoObservationInput {
  samplePairId: string;
  beforeImageId: string;
  afterImageId: string;
  normalizedCoordinates: BoundingBox;
  geoCoordinates?: GeoPoint;
  differenceScore: number;
  algorithmSettings: {
    threshold: number;
    minRegionSize: number;
    blurRadius?: number;
  };
  explanation: string;
  analystNotes?: string;
}

export interface UpdateGeoObservationInput {
  reviewStatus?: GeoIntelReviewStatus;
  analystNotes?: string;
}

// --------------------------------------------------------------------------
// 5. Emergency Medical Triage & Evacuation Routing (MediRoute)
// --------------------------------------------------------------------------

export type TriageCategory = 'immediate' | 'delayed' | 'minimal' | 'expectant';

export type PatientWorkflowStatus =
  | 'awaiting_assessment'
  | 'assessed'
  | 'assigned'
  | 'evacuated';

export interface PatientVitals {
  respiratoryRate?: number;
  pulsePresent?: boolean;
  canFollowCommands?: boolean;
  ambulatory?: boolean;
}

export interface Patient {
  id: string;
  fictionalName: string;
  age: number;
  gender?: string;
  triageCategory: TriageCategory;
  ruleVersion: string; // e.g. "DEMO_START_TRIAGE_V1"
  triageReason: string;
  workflowStatus: PatientWorkflowStatus;
  vitals: PatientVitals;
  location: GeoPoint;
  assignedFacilityId?: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: true;
}

export interface CreatePatientInput {
  fictionalName: string;
  age: number;
  gender?: string;
  triageCategory?: TriageCategory;
  vitals: PatientVitals;
  location: GeoPoint;
  workflowStatus?: PatientWorkflowStatus;
}

export interface UpdatePatientInput {
  workflowStatus?: PatientWorkflowStatus;
  triageCategory?: TriageCategory;
  assignedFacilityId?: string;
  triageReason?: string;
}

export interface HazardEdge {
  id: string;
  edgeId: string;
  fromNode: string;
  toNode: string;
  hazardType: 'road_blocked' | 'structural_damage' | 'unexploded_ordnance' | 'flooding';
  blocked: boolean;
  reportedBy: string;
  reportedAt: string;
  isSimulated: true;
}

export interface CreateHazardInput {
  edgeId: string;
  fromNode: string;
  toNode: string;
  hazardType?: 'road_blocked' | 'structural_damage' | 'unexploded_ordnance' | 'flooding';
  blocked: boolean;
  reportedBy?: string;
}

export interface RoadGraphNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: 'aid_station' | 'hospital' | 'casualty_site' | 'intersection';
}

export interface RoadGraphEdge {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  roadName: string;
}

export interface RouteCalculationRequest {
  startNodeId: string;
  destinationNodeId: string;
  avoidHazards?: boolean;
}

export interface RouteCalculationResponse {
  routeFound: boolean;
  pathNodeIds: string[];
  edgesTraversed: Array<{
    id: string;
    from: string;
    to: string;
    distanceKm: number;
    roadName: string;
  }>;
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
  hazardsAvoided: string[];
  message?: string;
}

// --------------------------------------------------------------------------
// 6. Unified Dashboard Aggregate Summary
// --------------------------------------------------------------------------

export interface DashboardSummary {
  metrics: {
    openIncidentsCount: number;
    activeTracksCount: number;
    pendingGeoReviewsCount: number;
    patientsAwaitingEvacCount: number;
    activeHazardsCount: number;
  };
  recentIncidents: Incident[];
  activeAlerts: Alert[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    lastSyncTimestamp: string;
    uptimeSeconds: number;
    storageMode: string;
  };
  isSimulated: true;
}

// --------------------------------------------------------------------------
// 7. Realtime Event Payloads
// --------------------------------------------------------------------------

export type RealtimeEventType =
  | 'incident:created'
  | 'incident:updated'
  | 'sync:completed'
  | 'telemetry:update'
  | 'alert:triggered'
  | 'alert:acknowledged'
  | 'geointel:candidate_added'
  | 'geointel:reviewed'
  | 'patient:created'
  | 'patient:updated'
  | 'hazard:updated'
  | 'demo:reset';

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
}
