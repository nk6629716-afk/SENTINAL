/**
 * SENTINEL - Deterministic Demo Fixtures
 * Contains the baseline dataset used for initial boot and demo reset.
 * All records are fictional and clearly marked as simulated.
 */

import {
  Incident,
  TelemetryTrack,
  Alert,
  GeoIntelObservation,
  Patient,
  HazardEdge,
  RoadGraphNode,
  RoadGraphEdge,
} from './types';

export const DEMO_BASELINE_TIMESTAMP = '2026-10-25T08:00:00.000Z';

// --------------------------------------------------------------------------
// 1. Initial Incidents
// --------------------------------------------------------------------------
export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-101',
    clientId: 'cli-inc-101',
    sourceModule: 'fieldlink',
    type: 'infrastructure',
    priority: 'high',
    status: 'active',
    title: 'Bridge Structural Impairment on Sector Alpha',
    notes: 'Ground unit Bravo reports primary crossing bridge damaged by flash surge. Vehicle traffic suspended.',
    location: {
      lat: 34.0522,
      lng: -118.2437,
      name: 'Sector Alpha - River Crossing',
    },
    createdAt: '2026-10-25T07:45:00.000Z',
    updatedAt: '2026-10-25T07:45:00.000Z',
    syncedAt: '2026-10-25T07:46:12.000Z',
    isSimulated: true,
  },
  {
    id: 'INC-102',
    clientId: 'cli-inc-102',
    sourceModule: 'mediroute',
    type: 'medical',
    priority: 'critical',
    status: 'active',
    title: 'Multi-Casualty Extraction Request',
    notes: 'Three casualties requiring immediate stabilization near checkpoint Charlie.',
    location: {
      lat: 34.0620,
      lng: -118.2380,
      name: 'Checkpoint Charlie',
    },
    createdAt: '2026-10-25T07:50:00.000Z',
    updatedAt: '2026-10-25T07:50:00.000Z',
    syncedAt: '2026-10-25T07:50:30.000Z',
    isSimulated: true,
  },
  {
    id: 'INC-103',
    clientId: 'cli-inc-103',
    sourceModule: 'skywatch',
    type: 'hostile_drone',
    priority: 'high',
    status: 'in_progress',
    title: 'Unidentified UAS Intrusion Sector Echo',
    notes: 'Rogue drone detected loitering above restricted humanitarian aid corridor.',
    location: {
      lat: 34.0580,
      lng: -118.2510,
      name: 'Sector Echo - Aid Corridor',
    },
    createdAt: '2026-10-25T07:55:00.000Z',
    updatedAt: '2026-10-25T07:55:00.000Z',
    syncedAt: '2026-10-25T07:55:10.000Z',
    isSimulated: true,
  },
];

// --------------------------------------------------------------------------
// 2. SkyWatch Telemetry Tracks & Alerts
// --------------------------------------------------------------------------
export const INITIAL_TRACKS: TelemetryTrack[] = [
  {
    id: 'TRK-001',
    callsign: 'SENTINEL-RECON-1',
    position: {
      lat: 34.0550,
      lng: -118.2450,
      altitudeMeters: 120,
    },
    speedKts: 42,
    headingDeg: 85,
    timestamp: '2026-10-25T08:00:00.000Z',
    isSimulated: true,
    anomalyFlags: [],
  },
  {
    id: 'TRK-002',
    callsign: 'UAS-UNKNOWN-X7',
    position: {
      lat: 34.0585,
      lng: -118.2515,
      altitudeMeters: 350,
    },
    speedKts: 78,
    headingDeg: 195,
    timestamp: '2026-10-25T08:00:00.000Z',
    isSimulated: true,
    anomalyFlags: ['SUDDEN_ACCELERATION', 'ZONE_INCURSION'],
  },
  {
    id: 'TRK-003',
    callsign: 'MEDEVAC-HELI-3',
    position: {
      lat: 34.0680,
      lng: -118.2300,
      altitudeMeters: 450,
    },
    speedKts: 110,
    headingDeg: 230,
    timestamp: '2026-10-25T08:00:00.000Z',
    isSimulated: true,
    anomalyFlags: [],
  },
];

export const INITIAL_ALERTS: Alert[] = [
  {
    id: 'ALT-201',
    trackId: 'TRK-002',
    severity: 'critical',
    ruleName: 'ZONE_INCURSION',
    observedValue: 'Entering Restricted Zone Echo (Radius 500m)',
    threshold: 'Restricted Airspace Perimeter',
    explanation: 'Track breached predefined non-fly humanitarian corridor boundary without authorized transponder code.',
    timestamp: '2026-10-25T07:58:30.000Z',
    acknowledged: false,
    isSimulated: true,
  },
  {
    id: 'ALT-202',
    trackId: 'TRK-002',
    severity: 'high',
    ruleName: 'SUDDEN_ACCELERATION',
    observedValue: '+36 kts in 3s (78 kts)',
    threshold: '> 25 kts/3s delta',
    explanation: 'Rapid kinetic acceleration detected exceeding standard civilian UAS flight profile.',
    timestamp: '2026-10-25T07:59:10.000Z',
    acknowledged: false,
    isSimulated: true,
  },
];

// --------------------------------------------------------------------------
// 3. GeoIntel Observations
// --------------------------------------------------------------------------
export const INITIAL_GEO_OBSERVATIONS: GeoIntelObservation[] = [
  {
    id: 'GEO-301',
    samplePairId: 'PAIR-ALPHA-2026',
    beforeImageId: 'IMG-BASE-001',
    afterImageId: 'IMG-POST-001',
    normalizedCoordinates: {
      x: 0.32,
      y: 0.44,
      width: 0.18,
      height: 0.15,
    },
    geoCoordinates: {
      lat: 34.0535,
      lng: -118.2460,
      name: 'Supply Depot Roadway Junction',
    },
    differenceScore: 0.74,
    algorithmSettings: {
      threshold: 0.25,
      minRegionSize: 50,
      blurRadius: 2,
    },
    explanation: 'Substantial structural profile alteration detected in primary arterial junction. High probability of surface crater or debris deposit.',
    analystNotes: 'Initial scan flagged debris blockage. Ground verification requested.',
    reviewStatus: 'confirmed_candidate',
    reviewedAt: '2026-10-25T07:52:00.000Z',
    createdAt: '2026-10-25T07:48:00.000Z',
    updatedAt: '2026-10-25T07:52:00.000Z',
    isSimulated: true,
  },
  {
    id: 'GEO-302',
    samplePairId: 'PAIR-BRAVO-2026',
    beforeImageId: 'IMG-BASE-002',
    afterImageId: 'IMG-POST-002',
    normalizedCoordinates: {
      x: 0.65,
      y: 0.20,
      width: 0.12,
      height: 0.10,
    },
    geoCoordinates: {
      lat: 34.0610,
      lng: -118.2390,
      name: 'East Canal Embankment',
    },
    differenceScore: 0.42,
    algorithmSettings: {
      threshold: 0.25,
      minRegionSize: 50,
      blurRadius: 2,
    },
    explanation: 'Moderate reflectance variance observed along embankment slope.',
    analystNotes: '',
    reviewStatus: 'pending_review',
    createdAt: '2026-10-25T07:56:00.000Z',
    updatedAt: '2026-10-25T07:56:00.000Z',
    isSimulated: true,
  },
];

// --------------------------------------------------------------------------
// 4. MediRoute Patients & Road Graph
// --------------------------------------------------------------------------
export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'PAT-401',
    fictionalName: 'Casualty Alpha-1 (Simulated)',
    age: 34,
    gender: 'Female',
    triageCategory: 'immediate',
    ruleVersion: 'DEMO_START_TRIAGE_V1',
    triageReason: 'Respiratory rate > 30/min; capillary refill > 2s. High priority evacuation required.',
    workflowStatus: 'assessed',
    vitals: {
      respiratoryRate: 34,
      pulsePresent: true,
      canFollowCommands: false,
      ambulatory: false,
    },
    location: {
      lat: 34.0620,
      lng: -118.2380,
      name: 'Checkpoint Charlie Evacuation Point',
    },
    assignedFacilityId: 'NODE-HOSPITAL-CENTRAL',
    createdAt: '2026-10-25T07:51:00.000Z',
    updatedAt: '2026-10-25T07:51:00.000Z',
    isSimulated: true,
  },
  {
    id: 'PAT-402',
    fictionalName: 'Casualty Alpha-2 (Simulated)',
    age: 46,
    gender: 'Male',
    triageCategory: 'delayed',
    ruleVersion: 'DEMO_START_TRIAGE_V1',
    triageReason: 'Non-ambulatory, breathing normally (RR 18), radial pulse present, follows commands. Stable under monitoring.',
    workflowStatus: 'awaiting_assessment',
    vitals: {
      respiratoryRate: 18,
      pulsePresent: true,
      canFollowCommands: true,
      ambulatory: false,
    },
    location: {
      lat: 34.0618,
      lng: -118.2378,
      name: 'Checkpoint Charlie Assembly Zone',
    },
    createdAt: '2026-10-25T07:52:30.000Z',
    updatedAt: '2026-10-25T07:52:30.000Z',
    isSimulated: true,
  },
  {
    id: 'PAT-403',
    fictionalName: 'Casualty Alpha-3 (Simulated)',
    age: 22,
    gender: 'Non-binary',
    triageCategory: 'minimal',
    ruleVersion: 'DEMO_START_TRIAGE_V1',
    triageReason: 'Ambulatory walking wounded with minor abrasions. Self-sufficient.',
    workflowStatus: 'assigned',
    vitals: {
      respiratoryRate: 16,
      pulsePresent: true,
      canFollowCommands: true,
      ambulatory: true,
    },
    location: {
      lat: 34.0615,
      lng: -118.2375,
      name: 'Checkpoint Charlie Field Post',
    },
    assignedFacilityId: 'NODE-AID-STATION-EAST',
    createdAt: '2026-10-25T07:53:00.000Z',
    updatedAt: '2026-10-25T07:53:00.000Z',
    isSimulated: true,
  },
];

// Fictional Road Network Graph for MediRoute
export const ROAD_GRAPH_NODES: RoadGraphNode[] = [
  { id: 'NODE-CASUALTY-1', label: 'Casualty Site Alpha', lat: 34.0620, lng: -118.2380, type: 'casualty_site' },
  { id: 'NODE-JUNCTION-A', label: 'Route 10 North Junction', lat: 34.0590, lng: -118.2410, type: 'intersection' },
  { id: 'NODE-JUNCTION-B', label: 'Main St & 5th Ave', lat: 34.0560, lng: -118.2430, type: 'intersection' },
  { id: 'NODE-JUNCTION-C', label: 'River Bypass Road', lat: 34.0650, lng: -118.2350, type: 'intersection' },
  { id: 'NODE-JUNCTION-D', label: 'East Hill Boulevard', lat: 34.0680, lng: -118.2320, type: 'intersection' },
  { id: 'NODE-HOSPITAL-CENTRAL', label: 'Sentinel Central Medical Center', lat: 34.0510, lng: -118.2470, type: 'hospital' },
  { id: 'NODE-AID-STATION-EAST', label: 'East Perimeter Aid Post', lat: 34.0700, lng: -118.2280, type: 'aid_station' },
];

export const ROAD_GRAPH_EDGES: RoadGraphEdge[] = [
  // Primary Direct Corridor: Casualty Site -> Junction A -> Junction B -> Central Hospital
  { id: 'EDGE-1', from: 'NODE-CASUALTY-1', to: 'NODE-JUNCTION-A', distanceKm: 1.2, roadName: 'Grand Expressway South' },
  { id: 'EDGE-2', from: 'NODE-JUNCTION-A', to: 'NODE-JUNCTION-B', distanceKm: 1.0, roadName: 'Arterial Central Parkway' },
  { id: 'EDGE-3', from: 'NODE-JUNCTION-B', to: 'NODE-HOSPITAL-CENTRAL', distanceKm: 1.4, roadName: 'Medical Center Access Way' },

  // Alternate Bypass Corridor: Casualty Site -> Junction C -> Junction D -> East Aid / South Connector
  { id: 'EDGE-4', from: 'NODE-CASUALTY-1', to: 'NODE-JUNCTION-C', distanceKm: 0.9, roadName: 'Bypass North Access' },
  { id: 'EDGE-5', from: 'NODE-JUNCTION-C', to: 'NODE-JUNCTION-D', distanceKm: 1.5, roadName: 'East Ridge Scenic Drive' },
  { id: 'EDGE-6', from: 'NODE-JUNCTION-D', to: 'NODE-AID-STATION-EAST', distanceKm: 0.8, roadName: 'Perimeter Auxiliary Road' },
  
  // Cross-link connector from Bypass to Hospital via Junction B
  { id: 'EDGE-7', from: 'NODE-JUNCTION-C', to: 'NODE-JUNCTION-B', distanceKm: 2.1, roadName: 'Western Cross Connector' },
];

export const INITIAL_HAZARDS: HazardEdge[] = [
  {
    id: 'HAZ-501',
    edgeId: 'EDGE-2', // Arterial Central Parkway is blocked!
    fromNode: 'NODE-JUNCTION-A',
    toNode: 'NODE-JUNCTION-B',
    hazardType: 'road_blocked',
    blocked: true,
    reportedBy: 'Ground Scout Team 4',
    reportedAt: '2026-10-25T07:47:00.000Z',
    isSimulated: true,
  },
];
