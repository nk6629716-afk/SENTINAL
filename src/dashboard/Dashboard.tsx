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
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Layers,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';

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
  const [crossModuleStep, setCrossModuleStep] = useState<number>(1);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const pendingIncidents = incidents.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalCasualties = casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated');
  const blockedHazards = hazards.filter((h) => h.blocked);

  const primaryIncident = incidents.find((i) => i.priority === 'critical') || incidents[0];

  const missionSteps = [
    {
      step: 1,
      num: '01',
      title: 'FieldLink Offline Intake',
      module: 'fieldlink',
      desc: 'Ground unit logs bridge collapse into local IndexedDB queue during remote radio blackout.',
      tag: 'GROUND',
    },
    {
      step: 2,
      num: '02',
      title: 'Road Network Blockage',
      module: 'mediroute',
      desc: 'Highway 9 corridor flagged as impassable due to structural debris and high-water hazards.',
      tag: 'LOGISTICS',
    },
    {
      step: 3,
      num: '03',
      title: 'Dijkstra Hazard Reroute',
      module: 'mediroute',
      desc: 'Routing engine calculates diversion via North Ridgeline Bypass (+1.1 km) avoiding blocked segment.',
      tag: 'EVACUATION',
    },
    {
      step: 4,
      num: '04',
      title: 'SkyWatch Airspace Incursion',
      module: 'skywatch',
      desc: 'Synthetic radar tracks drone DRONE-UAV-7 entering General Hospital No-Fly Geofence Zone.',
      tag: 'AIR DEFENSE',
    },
    {
      step: 5,
      num: '05',
      title: 'GeoIntel Satellite Recon',
      module: 'geointel',
      desc: 'Multi-temporal satellite difference analysis validates candidate anomaly at River Crossing.',
      tag: 'IMAGERY',
    },
  ];

  const handleNextStep = () => {
    const next = crossModuleStep < 5 ? crossModuleStep + 1 : 1;
    setCrossModuleStep(next);
    const targetModule = missionSteps.find((s) => s.step === next)?.module;
    if (targetModule) {
      onNavigate(targetModule as any);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Asymmetrical Situation Indicators (Operational Readiness Banner + Technical Telemetry) */}
      <div className="grid grid-cols-3" style={{ alignItems: 'stretch' }}>
        {/* Left Column (2 spans): Primary Readiness Masthead */}
        <div
          className="neu-card"
          style={{
            gridColumn: 'span 2',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TELEMETRY NETWORK & READINESS STATE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                    boxShadow: isOfflineMode ? '0 0 8px var(--critical)' : '0 0 8px var(--healthy)',
                  }}
                />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {isOfflineMode ? 'OFFLINE AIR-GAP BUFFER' : 'COMMAND LINK SYNCHRONIZED'}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge-neu ${isOfflineMode ? 'badge-neu-crit' : realtimeStatus === 'connected' ? 'badge-neu-ok' : 'badge-neu-warn'}`}>
                {isOfflineMode
                  ? 'OFFLINE BUFFER'
                  : realtimeStatus === 'connected'
                  ? 'LIVE SSE STREAM'
                  : realtimeStatus === 'reconnecting'
                  ? 'RECONNECTING...'
                  : realtimeStatus === 'stale'
                  ? 'STALE CONNECTION'
                  : 'DISCONNECTED'}
              </span>

              <span className="badge-neu badge-neu-neutral" title="Configured backend persistence adapter">
                STORAGE: {isOfflineMode ? 'LOCAL INDEXEDDB' : (backendHealth?.storageMode ? backendHealth.storageMode.toUpperCase() : 'FILE PERSISTENCE')}
              </span>

              {/* Simulation Quick Controls */}
              {onToggleSimulationPause && (
                <button
                  className={`btn-neu btn-neu-sm ${isSimPaused ? 'btn-neu-primary' : ''}`}
                  onClick={onToggleSimulationPause}
                  title={isSimPaused ? 'Resume simulated telemetry feed' : 'Pause simulated telemetry feed'}
                  style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                >
                  {isSimPaused ? '▶ Resume Sim' : '⏸ Pause Sim'}
                </button>
              )}

              {onStepSimulation && (
                <button
                  className="btn-neu btn-neu-sm"
                  onClick={onStepSimulation}
                  title="Step deterministic simulation forward by 1 tick"
                  style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                >
                  ⚡ Step 1s
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '780px', lineHeight: 1.45 }}>
            {isOfflineMode
              ? 'Tactical radio blackout simulated. Field reports and vitals are persistently queued locally in browser IndexedDB with zero telemetry loss. Reconnect to sync.'
              : 'Real-time Server-Sent Events (SSE) telemetry bus active. Cross-module data synthesizes ground reports, airspace tracks, geospatial candidate changes, and evacuation routing.'}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{tracks.length}</strong> Airspace Tracks
              </div>
              <span>•</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{incidents.length}</strong> Ground Incidents
              </div>
              <span>•</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{casualties.length}</strong> Evacuation Records
              </div>
              <span>•</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{hazards.length}</strong> Road Segments
              </div>
            </div>

            {/* Data Freshness Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <Clock size={12} color={realtimeStatus === 'stale' ? 'var(--warning)' : 'var(--accent)'} />
              <span>
                {lastEventTimestamp
                  ? `Telemetry Updated: ${new Date(lastEventTimestamp).toLocaleTimeString()} UTC`
                  : 'Telemetry: Awaiting stream'}
              </span>
              {realtimeStatus === 'stale' && (
                <span className="badge-neu badge-neu-warn" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>
                  DATA MAY BE STALE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Dense Technical Alert Strip */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Airspace Alert Metric */}
          <div
            className="neu-card-sm"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderLeft: activeAlerts.length > 0 ? '3px solid var(--critical)' : '3px solid var(--border-subtle)',
            }}
            onClick={() => onNavigate('skywatch')}
            title="Inspect Airspace Alerts in SkyWatch"
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                AIRSPACE HEURISTICS
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: activeAlerts.length > 0 ? 'var(--critical)' : 'var(--text-primary)', marginTop: '2px' }}>
                {activeAlerts.length} Unacknowledged Alerts
              </div>
            </div>
            <span className={`badge-neu ${activeAlerts.length > 0 ? 'badge-neu-crit' : 'badge-neu-ok'}`}>
              {activeAlerts.length > 0 ? 'BREACH' : 'CLEAR'}
            </span>
          </div>

          {/* MediRoute Casualties Metric */}
          <div
            className="neu-card-sm"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderLeft: criticalCasualties.length > 0 ? '3px solid var(--warning)' : '3px solid var(--border-subtle)',
            }}
            onClick={() => onNavigate('mediroute')}
            title="Inspect Evacuation Queue in MediRoute"
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                EVACUATION & CASUALTIES
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: criticalCasualties.length > 0 ? 'var(--warning)' : 'var(--text-primary)', marginTop: '2px' }}>
                {criticalCasualties.length} Critical / {blockedHazards.length} Blocked
              </div>
            </div>
            <span className={`badge-neu ${blockedHazards.length > 0 ? 'badge-neu-warn' : 'badge-neu-ok'}`}>
              {blockedHazards.length > 0 ? 'HAZARDS' : 'OPEN'}
            </span>
          </div>

          {/* FieldLink Outbox Metric */}
          <div
            className="neu-card-sm"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderLeft: pendingIncidents.length > 0 ? '3px solid var(--accent)' : '3px solid var(--border-subtle)',
            }}
            onClick={() => onNavigate('fieldlink')}
            title="Inspect Ground Outbox in FieldLink"
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                GROUND OUTBOX SYNC
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {pendingIncidents.length} Pending Local Reports
              </div>
            </div>
            <span className="badge-neu badge-neu-neutral">
              {pendingIncidents.length > 0 ? 'OUTBOX' : 'SYNCED'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Critical Incident Spotlight (Authoritative Editorial Dispatch) */}
      {primaryIncident && (
        <div
          className="neu-card"
          style={{
            borderLeft: '4px solid var(--critical)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-neu badge-neu-crit">CRITICAL INCIDENT SPOTLIGHT</span>
              <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                REF: {primaryIncident.id}
              </span>
              <span className="badge-neu badge-neu-neutral">
                {primaryIncident.sourceModule.toUpperCase()}
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} />
              <span>Logged: {new Date(primaryIncident.createdAt).toLocaleTimeString()} UTC</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              {primaryIncident.title}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, maxWidth: '900px' }}>
              {primaryIncident.notes}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <MapPin size={13} color="var(--accent)" />
              <span>Location:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{primaryIncident.location.name}</strong>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                [{primaryIncident.location.lat.toFixed(3)}, {primaryIncident.location.lng.toFixed(3)}]
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn-neu btn-neu-sm btn-neu-primary"
                onClick={() => onNavigate('fieldlink')}
              >
                <span>Inspect in FieldLink</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cross-Domain Mission Sequence (Progress Rail for Hackathon Judges) */}
      <div className="neu-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CROSS-DOMAIN MISSION SEQUENCE
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              3-Minute Multi-Domain Incident Demonstration
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Sequential workflow demonstrating incident propagation from field report through airspace monitoring, image difference, and casualty evacuation.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge-neu badge-neu-info">
              STEP {crossModuleStep} OF 5
            </span>
            <button
              className="btn-neu btn-neu-sm"
              onClick={handleNextStep}
              title="Advance to next step in demo"
            >
              <span>Next Step</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* 5-Step Connected Operational Rail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {missionSteps.map((item) => {
            const isCurrent = crossModuleStep === item.step;
            const isCompleted = crossModuleStep > item.step;

            return (
              <div
                key={item.step}
                onClick={() => {
                  setCrossModuleStep(item.step);
                  onNavigate(item.module as any);
                }}
                className={isCurrent ? 'neu-inset' : 'neu-card-sm'}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  borderLeft: isCurrent
                    ? '3px solid var(--accent)'
                    : isCompleted
                    ? '3px solid var(--healthy)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--healthy)' : 'var(--text-muted)',
                    }}
                  >
                    PHASE {item.num}
                  </span>
                  <span
                    className={`badge-neu ${isCompleted ? 'badge-neu-ok' : isCurrent ? 'badge-neu-info' : 'badge-neu-neutral'}`}
                    style={{ fontSize: '0.6rem', padding: '1px 5px' }}
                  >
                    {isCompleted ? 'VERIFIED ✓' : isCurrent ? 'ACTIVE NOW' : item.tag}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {item.title}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Common Operational Picture (Full-Width High-Resolution Radar Scope) */}
      <div className="neu-card" style={{ padding: '20px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="var(--accent)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Common Operational Picture (COP)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Full-spectrum tactical airspace tracking, ground incident telemetry, and hazard-aware evacuation corridors
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge-neu badge-neu-info">{tracks.length} Airspace Tracks</span>
            <span className="badge-neu badge-neu-warn">{incidents.length} Ground Incidents</span>
            <span className="badge-neu badge-neu-ok">{nodes.length} Evacuation Facilities</span>
          </div>
        </div>

        <TacticalMap
          incidents={incidents}
          tracks={tracks}
          zones={zones}
          nodes={nodes}
          edges={hazards}
          height="680px"
          onSelectEntity={(e) => setSelectedEntity(e)}
        />

        {/* Selected Map Entity Inspection Card */}
        {selectedEntity && (
          <div
            className="neu-inset"
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              border: '1px solid var(--accent)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                INSPECTED {selectedEntity.type}: {selectedEntity.id}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {selectedEntity.raw?.title || selectedEntity.raw?.callsign || selectedEntity.raw?.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedEntity.raw?.notes || selectedEntity.raw?.explanation || `Type: ${selectedEntity.raw?.type || 'Tactical Entity'}`}
              </div>
            </div>

            <button
              className="btn-neu btn-neu-sm btn-neu-primary"
              onClick={() => {
                if (selectedEntity.type === 'incident') onNavigate('fieldlink');
                if (selectedEntity.type === 'track') onNavigate('skywatch');
                if (selectedEntity.type === 'node') onNavigate('mediroute');
              }}
            >
              <span>Open in Dedicated Module</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 5. Operational Activity Feed (Shifted Below Radar Map) */}
      <div className="neu-card" style={{ padding: '20px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CROSS-DOMAIN CHRONOLOGY
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
              Operational Activity Feed
            </h3>
          </div>
          <span className="badge-neu badge-neu-neutral">REAL-TIME MULTI-SOURCE FEED</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {[
            ...alerts.map((a) => ({
              id: a.id,
              title: `Airspace Alert: ${a.ruleName}`,
              notes: a.explanation,
              source: 'SkyWatch',
              priority: a.severity,
              timestamp: a.timestamp,
            })),
            ...incidents.map((i) => ({
              id: i.id,
              title: i.title,
              notes: i.notes,
              source: `FieldLink (${i.sourceModule})`,
              priority: i.priority,
              timestamp: i.createdAt,
            })),
          ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((item) => (
              <div
                key={item.id}
                className="neu-inset"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className={`badge-neu ${
                      item.priority === 'critical'
                        ? 'badge-neu-crit'
                        : item.priority === 'high'
                        ? 'badge-neu-warn'
                        : 'badge-neu-info'
                    }`}
                    style={{ fontSize: '0.62rem', padding: '1px 6px' }}
                  >
                    {item.source}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {new Date(item.timestamp).toLocaleTimeString()} UTC
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  {item.title}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.notes}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
