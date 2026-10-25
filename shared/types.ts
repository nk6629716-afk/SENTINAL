/**
 * SENTINEL Shared Project Contracts
 * Single source of truth for frontend (Person 1), backend (Person 2), and algorithms (Person 3).
 * ALL records must explicitly carry `isSimulated: true` for honest simulation labeling.
 */

export type ModuleSource = 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GeoLocation {
  name: string;
  lat: number;
  lng: number;
}

// -------------------------------------------------------------
// MODULE 1: FIELDLINK (Offline Tactical Communication)
// -------------------------------------------------------------
export type IncidentType =
  | 'security_breach'
  | 'medical_evac'
  | 'drone_incursion'
  | 'recon_anomaly'
  | 'infrastructure_damage'
  | 'communication_loss'
  | 'road_blockage';

export type IncidentStatus = 'active' | 'in_progress' | 'resolved' | 'pending_sync';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface IncidentReport {
  id: string;
  sourceModule: ModuleSource;
  type: IncidentType;
  priority: PriorityLevel;
  title: string;
  notes: string;
  location: GeoLocation;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  status: IncidentStatus;
  isSimulated: true;
  clientId?: string; // Idempotency key for offline queue
  syncStatus?: SyncStatus;
  syncAttempts?: number;
  syncErrorMessage?: string;
}

export interface OfflineSyncPayload {
  clientId: string;
  report: IncidentReport;
  clientTimestamp: string;
}

export interface SyncResponseItem {
  clientId: string;
  serverId?: string;
  outcome: 'accepted' | 'already_received' | 'rejected';
  errorCode?: string;
  errorMessage?: string;
  syncTimestamp: string;
}

export interface BatchSyncResult {
  totalSubmitted: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  items: SyncResponseItem[];
}

// -------------------------------------------------------------
// MODULE 2: SKYWATCH (Counter-Drone Monitoring & Airspace Security)
// -------------------------------------------------------------
export type TrackType =
  | 'friendly_uav'
  | 'unknown_quadcopter'
  | 'fast_mover'
  | 'commercial_fixed_wing'
  | 'stealth_incursion';

export type TrackStatus = 'tracking' | 'suspicious' | 'hostile' | 'lost_signal';

export interface Waypoint {
  lat: number;
  lng: number;
  altitude: number;
  timestamp: string;
}

export interface TelemetryTrack {
  id: string;
  callsign: string;
  type: TrackType;
  lat: number;
  lng: number;
  altitude: number; // meters AGL
  speed: number; // m/s
  heading: number; // 0-360 degrees
  timestamp: string;
  status: TrackStatus;
  flightHistory: Waypoint[];
  isSimulated: true;
}

export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical';

export interface AirspaceAlert {
  id: string;
  trackId?: string;
  trackCallsign?: string;
  severity: AlertSeverity;
  ruleName:
    | 'NO_FLY_ZONE_INCURSION'
    | 'RAPID_ACCELERATION_SPIKE'
    | 'UNUSUAL_ALTITUDE_DROP'
    | 'FLIGHT_PATH_DEVIATION'
    | 'STALE_TELEMETRY_SIGNAL';
  observedValue: string | number;
  threshold: string | number;
  explanation: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  isSimulated: true;
}

export interface RestrictedAirspaceZone {
  id: string;
  name: string;
  type: 'no_fly' | 'military_patrol' | 'civilian_buffer';
  center: GeoLocation;
  radiusKm: number;
  ceilingMeters: number;
}

// -------------------------------------------------------------
// MODULE 3: GEOINTEL (Geospatial Intelligence & Reconnaissance)
// -------------------------------------------------------------
export interface BoundingBox {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  width: number; // 0-100 percentage
  height: number; // 0-100 percentage
}

export interface ChangeCandidate {
  id: string;
  boundingBox: BoundingBox;
  differenceScore: number; // 0.0 - 1.0 (e.g. 0.84 = 84% change)
  label: string;
  anomalyType:
    | 'structure_alteration'
    | 'vehicle_movement'
    | 'terrain_disturbance'
    | 'vegetation_clearing';
  explanation: string;
  reviewed: boolean;
  analystNotes?: string;
  confidence: number;
}

export interface GeoIntelObservation {
  id: string;
  title: string;
  zoneName: string;
  captureDateBefore: string;
  captureDateAfter: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  coordinates: GeoLocation;
  resolutionMeters: number;
  candidates: ChangeCandidate[];
  algorithmSettings: {
    sensitivityThreshold: number; // 0-100
    kernelSize: number;
    noiseReduction: boolean;
  };
  reviewStatus: 'pending' | 'reviewed' | 'escalated' | 'dismissed';
  analystNotes?: string;
  createdAt: string;
  isSimulated: true;
}

// -------------------------------------------------------------
// MODULE 4: MEDIROUTE (Emergency Medical Triage & Evacuation)
// -------------------------------------------------------------
export type TriageCategory = 'immediate' | 'delayed' | 'minimal' | 'expectant';
// Immediate = Red (immediate life threat, rapid transport needed)
// Delayed = Yellow (serious but can wait brief period)
// Minimal = Green (walking wounded, minor injury)
// Expectant = Black (unsurvivable injuries / deceased in field)

export type PatientStatus =
  | 'awaiting_assessment'
  | 'assessed'
  | 'assigned'
  | 'in_transit'
  | 'evacuated';

export interface PatientVitals {
  canWalk: boolean;
  respiratoryRate: number; // breaths/min (normal 12-20)
  radialPulsePresent: boolean;
  mentalStatus: 'can_follow_commands' | 'unresponsive' | 'altered';
  severeBleedingControlled: boolean;
}

export interface CasualtyRecord {
  id: string;
  patientCode: string;
  location: GeoLocation;
  vitals: PatientVitals;
  triageCategory: TriageCategory;
  ruleVersion: string; // e.g. "START_TACTICAL_DEMO_v1.0"
  triageReason: string;
  status: PatientStatus;
  assignedHospitalId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: true;
}

export interface RoadHazardEdge {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  blocked: boolean;
  hazardType?: 'debris' | 'hostile_activity' | 'bridge_collapse' | 'flooding' | 'unexploded_ordnance';
  reportedBy?: string;
  updatedAt: string;
  isSimulated: true;
}

export interface EvacuationNode {
  id: string;
  name: string;
  type: 'hospital' | 'aid_station' | 'casualty_pickup' | 'intersection';
  coordinates: GeoLocation;
  capacity?: number;
  occupied?: number;
}

export interface CalculatedRoute {
  id: string;
  sourceNodeId: string;
  destinationNodeId: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  pathNodeIds: string[];
  edgesTraversed: string[];
  avoidedHazardIds: string[];
  algorithmUsed: 'Dijkstra-Hazard-Aware' | 'A*-Terrain-Cost';
  hasActiveBlockage: boolean;
  alternativeFound: boolean;
  explanation: string;
  calculatedAt: string;
}

// -------------------------------------------------------------
// UNIFIED DASHBOARD SUMMARY & CROSS-MODULE
// -------------------------------------------------------------
export interface DashboardSummary {
  systemStatus: 'nominal' | 'degraded' | 'offline_mode';
  pendingSyncCount: number;
  activeIncidentsCount: number;
  activeAirspaceTracksCount: number;
  unacknowledgedAlertsCount: number;
  pendingGeoReviewsCount: number;
  criticalPatientsAwaitingEvac: number;
  blockedRoadSegmentsCount: number;
  lastSyncTimestamp: string | null;
  isSimulated: true;
}
