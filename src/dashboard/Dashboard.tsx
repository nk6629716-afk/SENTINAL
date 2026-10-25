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
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalIncident = incidents.find((i) => i.priority === 'critical') || incidents[0];

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

  const handleNextStep = () => {
    const next = crossModuleStep < 5 ? crossModuleStep + 1 : 1;
    setCrossModuleStep(next);
    const targetModule = missionSteps.find((s) => s.step === next)?.module;
    if (targetModule) {
      onNavigate(targetModule as any);
    }
  };

  // Threat queue contacts ranked by score
  const threatContacts = [
    {
      id: 'Track 07',
      label: 'Track 07',
      desc: 'Heading to Restricted R-2',
      score: 92,
      type: 'hostile',
    },
    {
      id: 'Swarm U1',
      label: 'Swarm U1 to U3',
      desc: 'Loitering, no transponder',
      score: 74,
      type: 'unknown',
    },
    {
      id: 'Track 11',
      label: 'Track 11',
      desc: 'Closing on sector 33',
      score: 51,
      type: 'unknown',
    },
    {
      id: 'Airliner AC-48',
      label: 'Airliner AC-48',
      desc: 'Passing, outside zones',
      score: 12,
      type: 'neutral',
    },
  ];

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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                142 ms
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Alert latency
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
                38 m
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Prediction error
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
                {incidents.filter((i) => i.syncStatus === 'synced').length || 12}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Reports synced
              </div>
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

          {/* Command Link Status Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              paddingBottom: '6px',
              borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    backgroundColor: isOfflineMode ? 'var(--color-crit)' : 'var(--color-ok)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  {isOfflineMode ? 'Air-gap queue active' : 'Command link synchronized'}
                </span>
              </div>
              <span
                style={{
                  border: '1px solid var(--color-ok)',
                  color: 'var(--color-ok)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ■ Live
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', paddingLeft: '13px' }}>
              Telemetry streaming: {tracks.length} tracks, {incidents.length} incidents, {casualties.length} evacuation records.
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
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleNextStep}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                Next step
              </button>
            </div>

            {/* Vertical Stepper List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
              {missionSteps.map((s, idx) => {
                const isStepActive = crossModuleStep === s.step;
                const isStepCompleted = crossModuleStep > s.step;

                return (
                  <div
                    key={s.step}
                    onClick={() => {
                      setCrossModuleStep(s.step);
                      onNavigate(s.module as any);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '2px 0',
                    }}
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
