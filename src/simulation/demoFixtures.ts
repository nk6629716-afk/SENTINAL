import {
  IncidentRecord,
  QueuedReport,
  TelemetryTrackPoint,
  SkyWatchAlert,
  CandidateRegion,
  CasualtyRecord,
  RoadGraph,
  SentinelSystemState
} from '../../shared/contracts';
import { MediRouteGraphRouter } from '../algorithms/mediroute/graphRouter';

/**
 * Returns deterministic initial state for the entire SENTINEL platform
 */
export function getBaselineSentinelState(): SentinelSystemState {
  const roadGraph = MediRouteGraphRouter.getDemoRoadGraph();

  const incidents: IncidentRecord[] = [
    {
      id: 'INC-BASE-001',
      clientId: 'rep-base-001',
      sourceModule: 'manual',
      type: 'Perimeter Check',
      priority: 'low',
      notes: 'Initial sector security sweep completed. All clear.',
      location: { lat: 34.050, lng: -118.250, label: 'Sector Alpha Outpost' },
      status: 'resolved',
      isSimulated: true,
      createdAt: '2026-10-25T08:00:00Z',
      updatedAt: '2026-10-25T08:05:00Z'
    }
  ];

  const queuedReports: QueuedReport[] = [];

  const activeTracks: TelemetryTrackPoint[] = [
    {
      trackId: 'SW-204',
      callsign: 'HAWK-ALPHA',
      lat: 34.052,
      lng: -118.243,
      altitudeMeters: 450,
      speedKnots: 65,
      headingDeg: 45,
      timestamp: '2026-10-25T08:00:00Z',
      isSimulated: true
    }
  ];

  const skyWatchAlerts: SkyWatchAlert[] = [];

  const candidateRegions: CandidateRegion[] = [];

  const casualties: CasualtyRecord[] = [
    {
      id: 'CAS-REC-01',
      namePlaceholder: 'Casualty Alpha (Civilian Demo)',
      ageGroup: 'adult',
      canWalk: false,
      respiratoryRate: 24,
      pulse: 92,
      mentalStatus: 'alert',
      severeBleeding: false,
      category: 'delayed_yellow',
      triageCategory: 'delayed_yellow',
      ruleVersion: 'SENTINEL-DEMO-TRIAGE-v1.4',
      triageReason: 'Delayed (Yellow): Non-ambulatory with stable vitals (RR 24, Pulse 92).',
      decisionTreePath: [
        'Non-ambulatory',
        'Spontaneous respiration present',
        'No active severe bleeding',
        'RR in safe range (24 bpm)',
        'Perfusion stable (92 bpm)',
        'Neurologically intact (alert)'
      ],
      missingDataWarnings: [],
      status: 'assessed',
      location: { lat: 34.058, lng: -118.240, label: 'Casualty Pickup Site Echo' },
      createdAt: '2026-10-25T08:05:00Z',
      isSimulated: true
    }
  ];

  return {
    incidents,
    queuedReports,
    activeTracks,
    skyWatchAlerts,
    candidateRegions,
    casualties,
    roadGraph,
    scenarioHistory: [
      {
        step: 'INITIAL_BASELINE',
        timestamp: '2026-10-25T08:00:00Z',
        title: 'System Baseline Initialized',
        description: 'All 4 modules loaded with baseline synthetic parameters. Road network open, airspace clear.',
        sourceModule: 'manual',
        relatedEntityId: 'SYS-INIT'
      }
    ],
    lastResetAt: new Date().toISOString()
  };
}
