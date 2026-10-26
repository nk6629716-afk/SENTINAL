import {
  CasualtyRecord,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
  TriageCategory,
  GeoLocation,
} from '@shared/types';

export type MediRouteSubTab =
  | 'overview'
  | 'monitoring'
  | 'triage'
  | 'routing'
  | 'facilities'
  | 'dispatch';

export interface VitalReading {
  patientId: string;
  heartRate: number; // bpm
  spo2: number; // %
  bpSystolic: number; // mmHg
  bpDiastolic: number; // mmHg
  respiratoryRate: number; // breaths/min
  temperature: number; // °C
  timestamp: string;
  isSimulated: true;
  anomalies: VitalAnomaly[];
}

export interface VitalAnomaly {
  id: string;
  patientId: string;
  metric: 'hr' | 'spo2' | 'bp' | 'rr' | 'temp';
  severity: 'critical' | 'warning';
  title: string;
  explanation: string;
  observedValue: string;
  threshold: string;
  timestamp: string;
}

export type FacilityType =
  | 'Field Hospital'
  | 'Casualty Hub'
  | 'Intake Point'
  | 'Ridgeline Medical Post';

export interface MedicalFacility {
  id: string;
  name: string;
  type: FacilityType;
  location: GeoLocation;
  nodeId: string;
  totalBeds: number;
  availableBeds: number;
  surgicalCapacity: number; // total surgical suites
  surgicalAvailable: number;
  assignedCasualtyIds: string[];
  status: 'available' | 'limited' | 'full' | 'unavailable';
  lastUpdated: string;
  isSimulated: true;
}

export type TransportType = 'ground_ambulance' | 'air_medevac';
export type TransportStatus =
  | 'available'
  | 'dispatched'
  | 'in_transit'
  | 'returning'
  | 'maintenance';

export interface TransportUnit {
  id: string;
  callsign: string;
  type: TransportType;
  status: TransportStatus;
  stationName: string;
  currentLocation: GeoLocation;
  assignedCasualtyId: string | null;
  destinationFacilityId: string | null;
  routeDistanceKm?: number;
  etaMinutes?: number;
  capabilities: string[];
  lastUpdated: string;
  isSimulated: true;
}

export interface EvacuationTask {
  id: string;
  casualtyId: string;
  transportUnitId: string;
  pickupLocation: GeoLocation;
  destinationFacilityId: string;
  status: 'dispatched' | 'in_transit' | 'completed' | 'cancelled';
  priority: TriageCategory;
  dispatchedAt: string;
  completedAt?: string;
  routeDistanceKm: number;
  etaMinutes: number;
  hazardsAvoided: string[];
}

export interface MedicalActivityItem {
  id: string;
  timestamp: string;
  type:
    | 'vital_anomaly'
    | 'triage_update'
    | 'dispatch'
    | 'facility_update'
    | 'route_recalculated'
    | 'evacuation_complete';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  targetTab?: MediRouteSubTab;
  targetId?: string;
}

export interface ExtendedCasualtyRecord extends CasualtyRecord {
  temperature?: number;
  activeAnomalies?: VitalAnomaly[];
  assignedTransportUnitId?: string;
  lastReadingTime?: string;
  isStale?: boolean;
}
