import React, { useState } from 'react';
import {
  DashboardSummary,
  IncidentReport,
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
  GeoIntelObservation,
  CasualtyRecord,
  RoadHazardEdge,
  EvacuationNode,
} from '@shared/types';
import {
  Play,
  Pause,
  Check,
  Circle,
  ExternalLink,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { api } from '../services/api/apiClient';
import { meshService } from '../services/mesh/meshService';

interface DashboardProps {
  summary: DashboardSummary;
  incidents: IncidentReport[];
  tracks: TelemetryTrack[];
  alerts: AirspaceAlert[];
  zones: RestrictedAirspaceZone[];
  observations: GeoIntelObservation[];
  casualties: CasualtyRecord[];
  hazards: RoadHazardEdge[];
  nodes: EvacuationNode[];
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
  onResetDemo: () => Promise<void>;
  isOfflineMode: boolean;
  realtimeStatus?: 'connected' | 'reconnecting' | 'disconnected' | 'stale';
  lastEventTimestamp?: string | null;
  backendHealth?: {
    status: string;
    service: string;
    storageMode: string;
    supabaseConfigured?: boolean;
    uptimeSeconds?: number;
    isSimulated?: boolean;
    timestamp?: string;
  } | null;
  onStepSimulation?: () => Promise<void>;
  onToggleSimulationPause?: () => Promise<void>;
  isSimPaused?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  incidents,
  tracks,
  alerts,
  zones,
  observations,
  casualties,
  hazards,
  nodes,
  onNavigate,
  onResetDemo,
  isOfflineMode,
  realtimeStatus = 'disconnected',
  lastEventTimestamp = null,
  backendHealth = null,
  onStepSimulation,
  onToggleSimulationPause,
  isSimPaused = false,
}) => {
  const [crossModuleStep, setCrossModuleStep] = useState<number>(3);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'reports' | 'activity'>('alerts');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);

  const pendingIncidents = incidents.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
  const syncedReportsCount = incidents.filter((i) => i.syncStatus === 'synced').length;
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalIncident = incidents.find((i) => i.priority === 'critical') || incidents[0];

  // Dynamic Domain Summaries
  const pendingGeoReviewsCount = observations.filter(
    (o) => o.reviewStatus === 'unreviewed' || o.reviewStatus === 'pending' || o.reviewStatus === 'pending_review'
  ).length;
  const confirmedGeoThreatsCount = observations.filter(
    (o) => o.reviewStatus === 'confirmed' || o.reviewStatus === 'confirmed_candidate'
  ).length;

  const immediateCasualtiesCount = casualties.filter(
    (c) => c.triageCategory === 'immediate' || c.triageCategory === 'immediate_red'
  ).length;
  const delayedCasualtiesCount = casualties.filter(
    (c) => c.triageCategory === 'delayed' || c.triageCategory === 'delayed_yellow'
  ).length;
  const minimalCasualtiesCount = casualties.filter(
    (c) => c.triageCategory === 'minimal' || c.triageCategory === 'minimal_green'
  ).length;
  const expectantCasualtiesCount = casualties.filter(
    (c) => c.triageCategory === 'expectant' || c.triageCategory === 'expectant_black'
  ).length;
  const blockedRoadCount = hazards.filter((h) => h.blocked).length;

  // Realtime Telemetry Staleness & Backend Storage Mode
  const telemetryAgeSeconds = lastEventTimestamp
    ? Math.max(0, Math.round((Date.now() - new Date(lastEventTimestamp).getTime()) / 1000))
    : null;
  const isTelemetryStale =
    realtimeStatus === 'stale' || (telemetryAgeSeconds !== null && telemetryAgeSeconds > 25);
  const effectiveStorageMode = isOfflineMode
    ? 'IndexedDB (Offline PWA)'
    : backendHealth?.storageMode === 'file'
    ? 'Disk Store (sentinel_store.json)'
    : backendHealth?.storageMode === 'memory'
    ? 'In-Memory Store'
    : 'Local Storage / Disk';

  const missionSteps = [
    {
      step: 1,
      title: 'Ground report filed',
      statusText: 'Verified',
      isCompleted: true,
      module: 'fieldlink',
    },
    {
      step: 2,
      title: 'Airspace checked',
      statusText: 'Verified',
      isCompleted: true,
      module: 'skywatch',
    },
    {
      step: 3,
      title: 'Imagery compared',
      statusText: 'Active now',
      isActive: true,
      module: 'geointel',
    },
    {
      step: 4,
      title: 'Casualties triaged',
      statusText: 'Medical',
      isFuture: true,
      module: 'mediroute',
    },
    {
      step: 5,
      title: 'Route cleared',
      statusText: 'Logistics',
      isFuture: true,
      module: 'mediroute',
    },
  ];

  const [isRunningScenario, setIsRunningScenario] = useState<boolean>(false);
  const [scenarioStatusMsg, setScenarioStatusMsg] = useState<string>('');

  const executeScenarioStep = async (step: number) => {
    setScenarioStatusMsg(`Executing Step ${step}...`);
    try {
      if (step === 1) {
        // Step 1: FieldLink Ground Report Filed & Relayed
        await api.createIncident({
          id: `INC-STEP1-01`,
          sourceModule: 'fieldlink',
          type: 'road_blockage',
          priority: 'critical',
          title: 'Bridge Segment 04-East Structural Fracture',
          notes: 'Flash flood debris impact on main span; road impassable. Tactical mesh alert broadcast.',
          location: { name: 'Bridge Segment 04-East (Highway 9)', lat: 34.0620, lng: -118.2310 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
          isSimulated: true,
          clientId: `client-step1-ground`,
          syncStatus: isOfflineMode ? 'pending' : 'synced',
        });
        await meshService.sendMessage(
          '#tactical-alpha',
          'Flash flooding observed at Bridge Highway Alpha. Debris impact on main span; road impassable.',
          'Command'
        );
        setScenarioStatusMsg('Step 1 complete: Ground report filed & relayed.');
      } else if (step === 2) {
        // Step 2: SkyWatch Airspace Incursion Alert Triggered
        if (onStepSimulation) {
          await onStepSimulation();
        } else {
          await api.stepSimulation();
        }
        setScenarioStatusMsg('Step 2 complete: Airspace surveillance anomaly evaluated.');
      } else if (step === 3) {
        // Step 3: GeoIntel Satellite Matrix Difference Flagged
        const obs: GeoIntelObservation = {
          id: `GEO-STEP3-01`,
          title: 'Satellite Change Candidate (Sector Bravo Overpass)',
          zoneName: 'Sector Bravo Overpass',
          coordinates: { lat: 34.0620, lng: -118.2310 },
          captureDateBefore: new Date(Date.now() - 3600000).toISOString(),
          captureDateAfter: new Date().toISOString(),
          reviewStatus: 'pending',
          candidates: [
            {
              id: 'CAND-01',
              boundingBox: { x: 42, y: 38, width: 24, height: 18 },
              differenceScore: 0.94,
              label: 'Structural alteration on bridge deck',
              anomalyType: 'structure_alteration',
              explanation: 'Radiometric pixel cluster anomaly',
              reviewed: false,
              confidence: 0.94,
            },
          ],
          algorithmSettings: { threshold: 30, minRegionSize: 4 },
          createdAt: new Date().toISOString(),
          isSimulated: true,
        };
        await api.createGeoObservation(obs);
        setScenarioStatusMsg('Step 3 complete: Satellite difference flagged for analyst review.');
      } else if (step === 4) {
        // Step 4: MediRoute Casualties Triaged
        const casualty: CasualtyRecord = {
          id: `CAS-STEP4-01`,
          patientCode: 'CAS-01',
          fictionalName: 'Casualty Alpha (Bridge Sector)',
          location: { name: 'Bridge Segment 04-East', lat: 34.0620, lng: -118.2310 },
          triageCategory: 'immediate',
          ruleVersion: 'START-v2',
          triageReason: 'Respiratory rate > 30 and altered mental status',
          status: 'assessed',
          workflowStatus: 'assessed',
          vitals: {
            canWalk: false,
            respiratoryRate: 32,
            radialPulsePresent: true,
            mentalStatus: 'unresponsive',
          },
          createdAt: new Date().toISOString(),
          isSimulated: true,
        };
        await api.createCasualty(casualty);
        setScenarioStatusMsg('Step 4 complete: Casualty triaged (Immediate - Red).');
      } else if (step === 5) {
        // Step 5: Road Hazard Blocked & Evacuation Route Rerouted
        await api.toggleRoadBlockage('EDGE-1', true);
        await api.calculateRoute('EVAC-1', 'HOSP-1', true);
        setScenarioStatusMsg('Step 5 complete: Road blocked & evacuation rerouted around hazard.');
      }
    } catch (err: any) {
      console.warn('Scenario step error:', err);
      setScenarioStatusMsg(`Step ${step} executed: ${err.message || 'Updated'}`);
    }
  };

  const handleNextStep = async () => {
    const next = crossModuleStep < 5 ? crossModuleStep + 1 : 1;
    setCrossModuleStep(next);
    await executeScenarioStep(next);
    const targetModule = missionSteps.find((s) => s.step === next)?.module;
    if (targetModule) {
      onNavigate(targetModule as any);
    }
  };

  const handleRunAllSteps = async () => {
    if (isRunningScenario) return;
    setIsRunningScenario(true);
    for (let s = 1; s <= 5; s++) {
      setCrossModuleStep(s);
      await executeScenarioStep(s);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setIsRunningScenario(false);
  };

  // Derive threat queue dynamically from actual telemetry tracks sorted by threat score
  const threatContacts = [...tracks]
    .sort((a, b) => (b.threatScore ?? 0) - (a.threatScore ?? 0))
    .slice(0, 5)
    .map((trk) => {
      const speedKts = trk.speedKts !== undefined ? trk.speedKts : Math.round(trk.speed * 1.94384);
      let desc = `Speed ${Math.round(speedKts)} kts | Alt ${Math.round(trk.altitude)}m`;
      if (trk.anomalyFlags && trk.anomalyFlags.length > 0) {
        desc = trk.anomalyFlags[0].replace(/_/g, ' ');
      } else if (trk.predictedCPA && trk.predictedCPA.distanceMeters < 5000) {
        desc = `Incursion vector (${(trk.predictedCPA.distanceMeters / 1000).toFixed(1)} km to ${trk.predictedCPA.zoneName || 'zone'})`;
      } else if (trk.status === 'hostile') {
        desc = 'Approaching restricted perimeter';
      }

      const score = Math.round(trk.threatScore ?? 0);
      const isHostile = trk.status === 'hostile' || score >= 75;
      const isNeutral = trk.status === 'tracking' && score < 30;

      return {
        id: trk.id,
        label: trk.callsign || trk.id,
        desc,
        score,
        type: isHostile ? 'hostile' : isNeutral ? 'neutral' : 'unknown',
      };
    });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Upper Area: Map (with floating metric panels) + Right Intel Pane */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Center / Left: Full Area Tactical Map */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
          <TacticalMap
            incidents={incidents}
            tracks={tracks}
            zones={zones}
            nodes={nodes}
            edges={hazards}
            selectedEntityId={selectedEntity?.id}
            onSelectEntity={setSelectedEntity}
            height="100%"
            showRadarSweep={true}
            initialMode="chart"
          />

          {/* Floating Top-Left Metrics Panel (Spec 01) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              zIndex: 20,
              background: 'var(--color-sheet)',
              border: 'var(--border-width, 1.2px) solid var(--color-edge)',
              boxShadow: 'var(--shadow-flat)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              padding: '8px 16px',
              gap: '24px',
              pointerEvents: 'auto',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {tracks.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Tracks monitored
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: activeAlerts.length > 0 ? 'var(--color-crit)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {activeAlerts.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Open alerts
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: pendingGeoReviewsCount > 0 ? 'var(--color-warn)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {pendingGeoReviewsCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Geo reviews
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: immediateCasualtiesCount > 0 ? 'var(--color-crit)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {immediateCasualtiesCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Immediate evac
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: blockedRoadCount > 0 ? 'var(--color-warn)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {blockedRoadCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Road blockages
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {syncedReportsCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Reports synced
              </div>
            </div>
          </div>

          {/* Connection, Telemetry Staleness, and Storage Mode HUD Badge */}
          <div
            style={{
              position: 'absolute',
              top: '68px',
              left: '16px',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'auto',
            }}
          >
            {/* Realtime Connection State */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                background: 'var(--color-sheet)',
                border: '1px solid var(--color-edge)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background:
                    isOfflineMode
                      ? 'var(--color-warn)'
                      : realtimeStatus === 'connected'
                      ? 'var(--color-ok)'
                      : realtimeStatus === 'stale'
                      ? 'var(--color-warn)'
                      : 'var(--color-crit)',
                }}
              />
              <span style={{ color: 'var(--text-primary)' }}>
                {isOfflineMode
                  ? 'OFFLINE CACHE'
                  : realtimeStatus === 'connected'
                  ? 'LIVE SSE'
                  : realtimeStatus === 'stale'
                  ? 'STALE SSE'
                  : realtimeStatus.toUpperCase()}
              </span>
            </div>

            {/* Telemetry Staleness Warning */}
            {isTelemetryStale ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  background: 'rgba(217, 119, 6, 0.15)',
                  border: '1px solid var(--color-warn)',
                  color: 'var(--color-warn)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                <span>⚠ Telemetry Stale</span>
                {telemetryAgeSeconds !== null && <span>({telemetryAgeSeconds}s delay)</span>}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  background: 'var(--color-sheet)',
                  border: '1px solid var(--color-edge)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                <span>Telemetry: Fresh</span>
                {telemetryAgeSeconds !== null && <span>({telemetryAgeSeconds}s ago)</span>}
              </div>
            )}

            {/* Backend Storage Mode Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                background: 'var(--color-sheet)',
                border: '1px solid var(--color-edge)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.68rem',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Store:</span>
              <span>{effectiveStorageMode}</span>
            </div>

            {/* Honest Simulation Disclaimer Badge */}
            <div
              style={{
                padding: '3px 8px',
                background: 'var(--color-sheet)',
                border: '1px dashed var(--color-edge)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              SIMULATED DEFENSE EXERCISE DATA
            </div>
          </div>

          {/* Selected Entity Card Modal/HUD */}
          {selectedEntity && (
            <div
              style={{
                position: 'absolute',
                top: '74px',
                left: '16px',
                zIndex: 25,
                background: 'var(--color-sheet)',
                border: 'var(--border-width, 1.2px) solid var(--color-edge)',
                boxShadow: 'var(--shadow-flat)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                minWidth: '240px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {selectedEntity.type?.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-secondary)' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                {selectedEntity.raw?.callsign || selectedEntity.raw?.title || selectedEntity.id}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: '10px', width: '100%' }}
                onClick={() => {
                  if (selectedEntity.type === 'track') onNavigate('skywatch');
                  else if (selectedEntity.type === 'incident') onNavigate('fieldlink');
                  else if (selectedEntity.type === 'node') onNavigate('mediroute');
                  else onNavigate('geointel');
                }}
              >
                Open in Dedicated Module
              </button>
            </div>
          )}
        </div>

        {/* Right Intel Pane (Spec 01) */}
        <aside
          style={{
            width: '380px',
            minWidth: '380px',
            background: 'var(--color-sheet)',
            borderLeft: 'var(--border-width, 1.2px) solid var(--color-edge)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            flexShrink: 0,
            padding: '12px 14px',
            gap: '12px',
          }}
          aria-label="Intelligence Pane"
        >
          {/* Tabs: Alerts 3 | Reports 5 | Activity */}
          <div
            style={{
              display: 'flex',
              borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'alerts' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'alerts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Alerts {activeAlerts.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'reports' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'reports' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Reports {incidents.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'activity' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Activity
            </button>
          </div>

          {/* Command Link & System Status Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 10px',
              border: 'var(--border-width, 1.2px) solid var(--color-line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-paper)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isOfflineMode
                      ? 'var(--color-warn)'
                      : realtimeStatus === 'connected'
                      ? 'var(--color-ok)'
                      : 'var(--color-crit)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  {isOfflineMode
                    ? 'Offline PWA Cache (IndexedDB)'
                    : realtimeStatus === 'connected'
                    ? 'SSE Command Stream Active'
                    : realtimeStatus === 'stale'
                    ? 'Telemetry Connection Stale'
                    : 'Command Stream Disconnected'}
                </span>
              </div>
              <span
                style={{
                  border: '1px solid var(--color-edge)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {effectiveStorageMode}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {isTelemetryStale ? (
                <span style={{ color: 'var(--color-warn)', fontWeight: 600 }}>
                  ⚠ Last telemetry update was {telemetryAgeSeconds ?? '>30'}s ago. Stream heartbeat degraded.
                </span>
              ) : (
                <span>
                  Telemetry nominal: {tracks.length} tracks, {activeAlerts.length} active alerts, {syncedReportsCount} synced reports.
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Cross-Module Intelligence Summaries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* GeoIntel Card */}
            <div
              onClick={() => onNavigate('geointel')}
              style={{
                cursor: 'pointer',
                padding: '8px 10px',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-paper)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
              title="Open GeoIntel module"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  GEOINTEL
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: pendingGeoReviewsCount > 0 ? 'var(--color-warn)' : 'var(--color-ok)',
                  }}
                >
                  {pendingGeoReviewsCount} pending
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>
                {observations.length}{' '}
                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  changes
                </span>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                {confirmedGeoThreatsCount} confirmed threat vectors
              </div>
            </div>

            {/* MediRoute Card */}
            <div
              onClick={() => onNavigate('mediroute')}
              style={{
                cursor: 'pointer',
                padding: '8px 10px',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-paper)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
              title="Open MediRoute module"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  MEDIROUTE
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: immediateCasualtiesCount > 0 ? 'var(--color-crit)' : 'var(--color-ok)',
                  }}
                >
                  {immediateCasualtiesCount} immediate
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>
                {casualties.length}{' '}
                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  casualties
                </span>
              </div>
              {/* Triage mini breakdown */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '0 4px',
                    background: 'var(--color-crit)',
                    color: '#fff',
                    borderRadius: '2px',
                  }}
                >
                  I:{immediateCasualtiesCount}
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '0 4px',
                    background: '#D97706',
                    color: '#fff',
                    borderRadius: '2px',
                  }}
                >
                  D:{delayedCasualtiesCount}
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '0 4px',
                    background: 'var(--color-ok)',
                    color: '#fff',
                    borderRadius: '2px',
                  }}
                >
                  M:{minimalCasualtiesCount}
                </span>
                {expectantCasualtiesCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0 4px',
                      background: '#1E293B',
                      color: '#fff',
                      borderRadius: '2px',
                    }}
                  >
                    E:{expectantCasualtiesCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Critical Incident Spotlight Card */}
          {criticalIncident && (
            <div
              style={{
                border: 'var(--border-width, 1.2px) solid var(--color-crit)',
                borderLeft: '4px solid var(--color-crit)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-sheet)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-crit)', fontWeight: 700 }}>
                  Critical incident
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {criticalIncident.id}, 14:29 UTC
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                {criticalIncident.title}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                {criticalIncident.notes}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ color: 'var(--color-crit)' }}>⌖</span>
                <span>{criticalIncident.location.lat.toFixed(4)} N, {Math.abs(criticalIncident.location.lng).toFixed(4)} W</span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '6px', width: '100%', padding: '6px' }}
                onClick={() => onNavigate('fieldlink')}
              >
                Open in FieldLink
              </button>
            </div>
          )}

          {/* Threat Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                Threat queue
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Ranked by score
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {threatContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    border: '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Entity Icon Shape */}
                    {contact.type === 'hostile' ? (
                      <span style={{ color: 'var(--color-crit)', fontSize: '1.1rem' }}>◆</span>
                    ) : contact.type === 'neutral' ? (
                      <span style={{ color: 'var(--color-ok)', fontSize: '1rem' }}>▲</span>
                    ) : (
                      <span style={{ color: 'var(--color-warn)', fontSize: '1rem' }}>✤</span>
                    )}

                    <div>
                      <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {contact.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        {contact.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span
                      style={{
                        fontSize: '1.15rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 800,
                        color: contact.score > 80 ? 'var(--color-crit)' : contact.score > 50 ? 'var(--color-warn)' : 'var(--text-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {contact.score}
                    </span>
                    {/* Score Bar */}
                    <div
                      style={{
                        width: '42px',
                        height: '4px',
                        background: 'var(--color-line)',
                        borderRadius: '1px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${contact.score}%`,
                          height: '100%',
                          background: contact.score > 80 ? 'var(--color-crit)' : contact.score > 50 ? 'var(--color-warn)' : 'var(--color-edge)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Sequence Stepper (Spec 01) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  Mission sequence
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  Step {crossModuleStep} of 5
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleRunAllSteps}
                  disabled={isRunningScenario}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  title="Automatically execute all 5 steps sequentially"
                  aria-label="Auto replay five-step cross-module scenario"
                >
                  {isRunningScenario ? 'Replaying...' : 'Auto replay'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleNextStep}
                  disabled={isRunningScenario}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  title="Execute next scenario step"
                  aria-label="Execute next mission step"
                >
                  Next step
                </button>
              </div>
            </div>

            {/* Vertical Stepper List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }} role="list">
              {missionSteps.map((s, idx) => {
                const isStepActive = crossModuleStep === s.step;
                const isStepCompleted = crossModuleStep > s.step;

                return (
                  <div
                    key={s.step}
                    role="button"
                    tabIndex={0}
                    onClick={async () => {
                      setCrossModuleStep(s.step);
                      await executeScenarioStep(s.step);
                      onNavigate(s.module as any);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCrossModuleStep(s.step);
                        executeScenarioStep(s.step);
                        onNavigate(s.module as any);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: isStepActive ? 'rgba(232, 89, 12, 0.08)' : 'transparent',
                      border: isStepActive ? '1px solid var(--accent)' : '1px solid transparent',
                      transition: 'all 0.12s ease',
                    }}
                    aria-label={`Step ${s.step}: ${s.title} (${s.statusText})`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Step Status Icon */}
                      {isStepCompleted ? (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'var(--color-ok)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                          }}
                        >
                          ✓
                        </div>
                      ) : isStepActive ? (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '2px solid var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--accent)',
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '1.5px dashed var(--color-edge)',
                          }}
                        />
                      )}

                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: isStepActive ? 700 : 500,
                          color: isStepActive ? 'var(--text-primary)' : isStepCompleted ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {s.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: isStepActive ? 700 : 500,
                        color: isStepActive ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {s.statusText}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scenario Execution Status Feedback */}
            {scenarioStatusMsg && (
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-paper)',
                  border: '1px solid var(--color-line)',
                  fontSize: '0.68rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.3,
                }}
              >
                {scenarioStatusMsg}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Replay Bar (Spec 01) */}
      <footer
        style={{
          height: '36px',
          minHeight: '36px',
          borderTop: 'var(--border-width, 1.2px) solid var(--color-edge)',
          background: 'var(--color-sheet)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '0.74rem',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Play/Pause */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
            title={isPlaying ? 'Pause replay' : 'Play replay'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {/* Speed Toggles */}
          <div style={{ display: 'flex', border: '1px solid var(--color-edge)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setSimSpeed(speed)}
                style={{
                  background: simSpeed === speed ? 'var(--color-strip)' : 'transparent',
                  color: simSpeed === speed ? '#FFFFFF' : 'var(--text-primary)',
                  border: 'none',
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginLeft: '6px' }}>Replay</span>

          {/* Timeline Line with Step Ticks and Current Time Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '320px',
              height: '8px',
              position: 'relative',
              margin: '0 12px',
            }}
          >
            <div style={{ width: '100%', height: '2px', background: 'var(--color-line)' }} />
            {/* Step markers along timeline */}
            {[20, 40, 60, 80].map((pct, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  width: '2px',
                  height: '8px',
                  background: i === 1 ? 'var(--accent)' : 'var(--color-edge)',
                }}
              />
            ))}
            {/* Current scrubber badge */}
            <div
              style={{
                position: 'absolute',
                left: '40%',
                transform: 'translateX(-50%)',
                background: 'var(--color-strip)',
                color: '#FFFFFF',
                padding: '1px 4px',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                borderRadius: '1px',
                top: '-16px',
              }}
            >
              14:30:12
            </div>
          </div>
        </div>

        {/* Message Ticker */}
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Alpha to Command: contact east of bridge, 2 hops, 380 ms
        </div>
      </footer>
    </div>
  );
};
