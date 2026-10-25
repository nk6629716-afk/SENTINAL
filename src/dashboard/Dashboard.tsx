import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import {
  selectOpenAlerts,
  selectPendingOutbox,
  selectSyncedIncidents,
  selectRankedThreatQueue,
} from '../selectors';
import { formatIST } from '../utils/time';

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
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Single source of truth selectors
  const pendingIncidents = selectPendingOutbox(incidents);
  const openAlerts = selectOpenAlerts(alerts);
  const syncedIncidents = selectSyncedIncidents(incidents);
  const rankedThreats = selectRankedThreatQueue(tracks, zones, alerts);

  // Elapsed simulation session counter
  useEffect(() => {
    if (isSimPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimPaused, sessionStartTime]);

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

  // Activity ticker: latest real event from state
  const latestActivity = (() => {
    if (alerts.length > 0 && (!incidents.length || new Date(alerts[0].timestamp) >= new Date(incidents[0].createdAt))) {
      const a = alerts[0];
      return `Airspace Alert: ${a.ruleName} - ${a.trackCallsign} (${formatIST(a.timestamp, { seconds: false })})`;
    }
    if (incidents.length > 0) {
      const inc = incidents[0];
      return `Incident Intake: ${inc.title} - ${inc.location.name} (${formatIST(inc.createdAt, { seconds: false })})`;
    }
    return null;
  })();

  // Top-Left Metrics Panel (Passed into TacticalMap to sit with Mode Switch in ONE flex toolbar)
  const metricsPanel = (
    <div
      style={{
        background: 'var(--color-sheet)',
        border: 'var(--border-width, 1.2px) solid var(--color-edge)',
        boxShadow: 'var(--shadow-flat)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        padding: '6px 14px',
        gap: '20px',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div>
        <div
          className="metric-value"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
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

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="metric-value"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontWeight: 800,
            color: openAlerts.length > 0 ? 'var(--color-crit)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {openAlerts.length}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Open alerts
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="metric-value"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {syncedIncidents.length}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Reports synced
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="metric-value"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontWeight: 800,
            color: pendingIncidents.length > 0 ? 'var(--color-warn)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {pendingIncidents.length}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Outbox pending
        </div>
      </div>
    </div>
  );

  // Bottom-Left Legend for Overview Evacuation Graph Nodes
  const nodesLegendChip = (
    <div
      style={{
        background: 'var(--color-sheet)',
        border: '1px solid var(--color-edge)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 8px',
        fontSize: '0.68rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      title="Evacuation Network Node Key"
    >
      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Nodes:</span>
      <span><strong>I:</strong> Intake Point</span>
      <span><strong>F:</strong> Field Hospital</span>
      <span><strong>R:</strong> Ridgeline Post</span>
      <span><strong>C:</strong> Casualty Hub</span>
    </div>
  );

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
      {/* Upper Area: Full Area Tactical Map + Right Intel Pane */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Map Container */}
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
            topLeftContent={metricsPanel}
            bottomLeftContent={nodesLegendChip}
          />

          {/* Selected Entity HUD Modal */}
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
                {selectedEntity.raw?.callsign || selectedEntity.raw?.title || selectedEntity.raw?.name || selectedEntity.id}
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

        {/* Right Intel Pane */}
        <aside className="intel-pane" aria-label="Intelligence Pane">
          {/* Header & Tabs (Sticky) */}
          <div className="intel-header">
            <div style={{ display: 'flex', borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)', paddingBottom: '2px' }}>
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
                Alerts {openAlerts.length}
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
          </div>

          {/* Intel Body (Scrollable, full mission sequence reachable) */}
          <div className="intel-body">
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
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {isOfflineMode ? 'Local cache' : 'Live stream'}
                </span>
              </div>
            </div>

            {/* Critical Incident Highlight Card */}
            {criticalIncident && (
              <div
                style={{
                  border: 'var(--border-width, 1.2px) solid var(--color-crit)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-paper)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      background: 'var(--color-crit)',
                      color: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Critical Ground Incident
                  </span>
                  <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatIST(criticalIncident.createdAt, { seconds: false })}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {criticalIncident.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {criticalIncident.notes}
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginTop: '6px', width: '100%', padding: '6px' }}
                  onClick={() => onNavigate('fieldlink')}
                >
                  Open in FieldLink
                </button>
              </div>
            )}

            {/* Threat Queue built strictly from real tracks */}
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
                {rankedThreats.map((threat) => (
                  <div
                    key={threat.id}
                    onClick={() => {
                      setSelectedEntity({ type: 'track', id: threat.id, raw: threat.track });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      border: '1px solid var(--color-line)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-paper)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {threat.severity === 'critical' ? (
                        <span style={{ color: 'var(--color-crit)', fontSize: '1.1rem' }}>◆</span>
                      ) : threat.severity === 'high' ? (
                        <span style={{ color: 'var(--color-warn)', fontSize: '1rem' }}>✤</span>
                      ) : (
                        <span style={{ color: 'var(--color-ok)', fontSize: '1rem' }}>▲</span>
                      )}

                      <div>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                          {threat.callsign}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {threat.reason}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span
                        className="numeral"
                        style={{
                          fontSize: '1.15rem',
                          fontFamily: 'var(--font-numerals)',
                          fontWeight: 800,
                          color:
                            threat.score > 80
                              ? 'var(--color-crit)'
                              : threat.score > 50
                              ? 'var(--color-warn)'
                              : 'var(--text-primary)',
                          lineHeight: 1,
                        }}
                      >
                        {threat.score}
                      </span>
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
                            width: `${threat.score}%`,
                            height: '100%',
                            background:
                              threat.score > 80
                                ? 'var(--color-crit)'
                                : threat.score > 50
                                ? 'var(--color-warn)'
                                : 'var(--color-edge)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mission Sequence Stepper (Full 5-step mission sequence reachable) */}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                {missionSteps.map((s) => {
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
                        padding: '4px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            color: isStepActive
                              ? 'var(--text-primary)'
                              : isStepCompleted
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
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
          </div>
        </aside>
      </div>

      {/* Bottom Simulation Bar */}
      <footer
        className="bottom-replay-bar"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Simulation Pause / Resume Button */}
          {onToggleSimulationPause && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={onToggleSimulationPause}
              style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
              title={isSimPaused ? 'Resume simulation' : 'Pause simulation'}
            >
              {isSimPaused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          )}

          {/* Live Indicator & Elapsed Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isSimPaused ? 'var(--color-warn)' : 'var(--color-ok)',
                }}
              />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  color: isSimPaused ? 'var(--color-warn)' : 'var(--color-ok)',
                }}
              >
                {isSimPaused ? 'PAUSED' : 'LIVE'}
              </span>
            </div>

            <span
              className="mono"
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Elapsed: {elapsedSeconds}s
            </span>
          </div>
        </div>

        {/* Real Activity Ticker */}
        {latestActivity && (
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {latestActivity}
          </div>
        )}
      </footer>
    </div>
  );
};
