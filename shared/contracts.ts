/**
 * SENTINEL — Shared Data Contracts & Type Definitions
 * 
 * Single source of truth for all modules:
 * - Module 1: FieldLink (Offline Reports & Queue Sync)
 * - Module 2: SkyWatch (Counter-Drone Telemetry & Anomaly Alerts)
 * - Module 3: GeoIntel (Reconnaissance Image Diff & Candidate Regions)
 * - Module 4: MediRoute (Emergency Triage & Hazard-Aware Routing)
 * - Unified Operations Dashboard & Cross-Module Scenario
 */

// ==========================================
// 1. Common & System Primitives
// ==========================================

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'triaged' | 'in_progress' | 'resolved';
export type SourceModule = 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute' | 'manual';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  label?: string;
}

export interface IncidentRecord {
  id: string;
  clientId?: string;
  sourceModule: SourceModule;
  type: string;
  priority: PriorityLevel;
  notes: string;
  location: GeoCoordinate;
  status: IncidentStatus;
  isSimulated: true;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ==========================================
// 2. FieldLink: Offline Queue & Sync
// ==========================================

export type QueueItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedReport {
  clientId: string;             // Client-generated UUID / idempotency key
  serverId?: string;             // Assigned by server once confirmed
  type: string;                 // e.g. 'Road Blockage', 'Casualty Sighting', 'Resource Need'
  priority: PriorityLevel;
  notes: string;
  location: GeoCoordinate;
  createdAt: string;            // Original creation timestamp
  status: QueueItemStatus;
  retryCount: number;
  errorMessage?: string;
  isSimulated: true;
}

export interface SyncBatchRequest {
  batchId: string;
  reports: QueuedReport[];
}

export type SyncOutcome = 'accepted' | 'already_received' | 'rejected';

export interface SyncItemResult {
  clientId: string;
  serverId: string;
  outcome: SyncOutcome;
  errorCode?: string;
  errorMessage?: string;
  syncTimestamp: string;
}

export interface SyncBatchResponse {
  batchId: string;
  results: SyncItemResult[];
  processedCount: number;
  failedCount: number;
}

// ==========================================
// 3. SkyWatch: Telemetry & Explainable Anomaly Detection
// ==========================================

export interface TelemetryTrackPoint {
  trackId: string;
  callsign: string;
  lat: number;
  lng: number;
  altitudeMeters: number;
  speedKnots: number;
  headingDeg: number;
  timestamp: string;
  isSimulated: true;
}

export type SkyWatchRuleName = 
  | 'speed_anomaly'
  | 'route_deviation'
  | 'restricted_zone_entry'
  | 'stale_telemetry';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface RestrictedZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  maxAltitudeMeters: number;
}

export interface AnomalyDetectorConfig {
  speedChangeThresholdKnots: number;   // Max permissible delta speed between steps
  routeDeviationThresholdMeters: number; // Max distance off nominal flight path
  staleTelemetryThresholdSec: number;   // Max elapsed seconds before flagging stale
  restrictedZones: RestrictedZone[];
}

export interface SkyWatchAlert {
  id: string;
  trackId: string;
  severity: AlertSeverity;
  ruleName: SkyWatchRuleName;
  observedValue: string | number;
  threshold: string | number;
  explanation: string;
  timestamp: string;
  acknowledged: boolean;
  isSimulated: true;
}

// ==========================================
// 4. GeoIntel: Matrix Image Diff & Review
// ==========================================

export interface BoundingBox {
  x: number;      // Pixel or normalized 0-1
  y: number;
  width: number;
  height: number;
}

export interface CandidateRegion {
  id: string;
  beforeImageId: string;
  afterImageId: string;
  bbox: BoundingBox;
  differenceScore: number; // 0 to 1 scale or pixel delta metric
  areaPixels: number;
  algorithmSettings: {
    threshold: number;
    minRegionSize: number;
  };
  explanation: string;
  reviewStatus: 'unreviewed' | 'confirmed' | 'dismissed';
  analystNotes?: string;
  createdAt: string;
  isSimulated: true;
}

export interface GeoIntelReport {
  id: string;
  title: string;
  beforeImageId: string;
  afterImageId: string;
  candidateRegions: CandidateRegion[];
  confirmedCount: number;
  dismissedCount: number;
  analystSummary: string;
  limitationsDisclaimer: string;
  generatedAt: string;
}

// ==========================================
// 5. MediRoute: Triage & Dijkstra Routing
// ==========================================

export type TriageCategory = 
  | 'immediate_red'
  | 'delayed_yellow'
  | 'minimal_green'
  | 'expectant_black'
  | 'undetermined';

export interface CasualtyAssessmentInput {
  namePlaceholder?: string;
  ageGroup: 'pediatric' | 'adult' | 'geriatric';
  canWalk: boolean;
  respiratoryRate?: number;       // Breaths per minute
  pulse?: number;                 // Beats per minute
  mentalStatus?: 'alert' | 'verbal' | 'pain' | 'unresponsive';
  severeBleeding?: boolean;
}

export interface TriageResult {
  category: TriageCategory;
  triageCategory?: TriageCategory;
  ruleVersion: string;
  triageReason: string;
  decisionTreePath: string[];
  missingDataWarnings: string[];
}

export interface CasualtyRecord extends CasualtyAssessmentInput, TriageResult {
  id: string;
  status: 'awaiting_assessment' | 'assessed' | 'assigned' | 'evacuated';
  location: GeoCoordinate;
  createdAt: string;
  isSimulated: true;
}

export interface RoadNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: 'aid_station' | 'hospital' | 'casualty_pickup' | 'intersection';
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  baseTravelTimeMin: number;
  isBlocked: boolean;
  blockageReason?: string;
}

export interface RoadGraph {
  nodes: RoadNode[];
  edges: RoadEdge[];
}

export interface RouteCalculationResult {
  originNodeId: string;
  destinationNodeId: string;
  pathNodeIds: string[];
  pathEdges: RoadEdge[];
  totalDistanceKm: number;
  totalTimeMin: number;
  blockedEdgesAvoided: string[];
  hasRoute: boolean;
  message: string;
}

// ==========================================
// 6. Cross-Module Scenario & System State
// ==========================================

export type ScenarioStepName = 
  | 'INITIAL_BASELINE'
  | 'FIELD_REPORT_FILED'
  | 'HAZARD_ROAD_BLOCK'
  | 'MEDIROUTE_DIVERT'
  | 'GEOINTEL_DIFF_FOUND'
  | 'SKYWATCH_ZONE_BREACH';

export interface CrossModuleEvent {
  step: ScenarioStepName;
  timestamp: string;
  title: string;
  description: string;
  sourceModule: SourceModule;
  relatedEntityId: string;
}

export interface SentinelSystemState {
  incidents: IncidentRecord[];
  queuedReports: QueuedReport[];
  activeTracks: TelemetryTrackPoint[];
  skyWatchAlerts: SkyWatchAlert[];
  candidateRegions: CandidateRegion[];
  casualties: CasualtyRecord[];
  roadGraph: RoadGraph;
  activeRoute?: RouteCalculationResult;
  scenarioHistory: CrossModuleEvent[];
  lastResetAt: string;
}
