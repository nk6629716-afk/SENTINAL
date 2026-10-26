import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  ChevronLeft,
  GripVertical,
  LayoutGrid,
  Map,
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { TacticalBentoGrid } from './TacticalBentoGrid';
import {
  selectOpenAlerts,
  selectPendingOutbox,
  selectSyncedIncidents,
  selectRankedThreatQueue,
} from '../selectors';
import { formatIST } from '../utils/time';
import { AlertsPanel } from './AlertsPanel';
import { SimulationReplayFooter } from './SimulationReplayFooter';

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
  const [dashboardView, setDashboardView] = useState<'bento' | 'map'>('bento');
  const [crossModuleStep, setCrossModuleStep] = useState<number>(3);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'reports' | 'activity'>('alerts');

  // Resizable Right Information Tab State
  const [rightPaneWidth, setRightPaneWidth] = useState<number>(340);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState<boolean>(false);
  const isDraggingSplitter = useRef(false);
  const startDragX = useRef(0);
  const startWidth = useRef(340);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    startDragX.current = e.clientX;
    startWidth.current = rightPaneWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const deltaX = startDragX.current - moveEvent.clientX;
      const newWidth = Math.max(240, Math.min(650, startWidth.current + deltaX));
      setRightPaneWidth(newWidth);
      setIsRightPaneCollapsed(false);
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rightPaneWidth]);

  // Single source of truth selectors - memoized to isolate re-evaluations
  const pendingIncidents = useMemo(() => selectPendingOutbox(incidents), [incidents]);
  const openAlerts = useMemo(() => selectOpenAlerts(alerts), [alerts]);
  const syncedIncidents = useMemo(() => selectSyncedIncidents(incidents), [incidents]);
  const rankedThreats = useMemo(() => selectRankedThreatQueue(tracks, zones, alerts), [tracks, zones, alerts]);

  const criticalIncident = useMemo(
    () => incidents.find((i) => i.priority === 'critical') || incidents[0] || null,
    [incidents]
  );

  const missionSteps = useMemo(
    () => [
      {
        step: 1,
        title: 'Ground report filed',
        statusText: 'Verified',
        module: 'fieldlink',
      },
      {
        step: 2,
        title: 'Airspace checked',
        statusText: 'Verified',
        module: 'skywatch',
      },
      {
        step: 3,
        title: 'Imagery compared',
        statusText: 'Active now',
        module: 'geointel',
      },
      {
        step: 4,
        title: 'Casualties triaged',
        statusText: 'Medical',
        module: 'mediroute',
      },
      {
        step: 5,
        title: 'Route cleared',
        statusText: 'Logistics',
        module: 'mediroute',
      },
    ],
    []
  );

  const handleNextStep = useCallback(() => {
    const next = crossModuleStep < 5 ? crossModuleStep + 1 : 1;
    setCrossModuleStep(next);
    const targetModule = missionSteps.find((s) => s.step === next)?.module;
    if (targetModule) {
      onNavigate(targetModule as any);
    }
  }, [crossModuleStep, missionSteps, onNavigate]);

  // Activity ticker: latest real event from state memoized
  const latestActivity = useMemo(() => {
    if (alerts.length > 0 && (!incidents.length || new Date(alerts[0].timestamp) >= new Date(incidents[0].createdAt))) {
      const a = alerts[0];
      return `Airspace Alert: ${a.ruleName} - ${a.trackCallsign} (${formatIST(a.timestamp, { seconds: false })})`;
    }
    if (incidents.length > 0) {
      const inc = incidents[0];
      return `Incident Intake: ${inc.title} - ${inc.location.name} (${formatIST(inc.createdAt, { seconds: false })})`;
    }
    return null;
  }, [alerts, incidents]);

  // Top-Left Metrics Panel (Passed into TacticalMap to sit with Mode Switch in ONE flex toolbar)
  const metricsPanel = (
    <div
      style={{
        background: 'rgba(24, 29, 26, 0.90)',
        border: '1px solid rgba(115, 138, 101, 0.25)',
        boxShadow: 'var(--shadow-flat)',
        borderRadius: '6px',
        display: 'flex',
        padding: '5px 12px',
        gap: '14px',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div>
        <div
          className="metric-value"
          style={{
            fontSize: '1.15rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: 'var(--text-primary, #e9ece9)',
            lineHeight: 1,
          }}
        >
          {tracks.length}
        </div>
        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary, #94a192)', marginTop: '2px' }}>
          Tracks
        </div>
      </div>

      <div style={{ borderLeft: '1px solid rgba(115, 138, 101, 0.20)', paddingLeft: '12px' }}>
        <div
          className="metric-value"
          style={{
            fontSize: '1.15rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: openAlerts.length > 0 ? 'var(--highlight-amber, #d4a373)' : 'var(--text-primary, #e9ece9)',
            lineHeight: 1,
          }}
        >
          {openAlerts.length}
        </div>
        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary, #94a192)', marginTop: '2px' }}>
          Alerts
        </div>
      </div>
    </div>
  );

  // Bottom-Left Legend for Overview Evacuation Graph Nodes
  const nodesLegendChip = (
    <div
      style={{
        background: 'rgba(24, 29, 26, 0.90)',
        border: '1px solid rgba(115, 138, 101, 0.25)',
        borderRadius: '6px',
        padding: '3px 8px',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary, #94a192)',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
      }}
      title="Evacuation Network Node Key"
    >
      <span style={{ fontWeight: 700, color: 'var(--text-primary, #e9ece9)' }}>NET:</span>
      <span>INTAKE</span>
      <span>•</span>
      <span>HOSPITAL</span>
      <span>•</span>
      <span>POST</span>
      <span>•</span>
      <span>HUB</span>
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
      {/* Tactical View Mode Switcher Sub-Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: 'rgba(18, 22, 20, 0.95)',
          borderBottom: '1px solid rgba(115, 138, 101, 0.20)',
          flexShrink: 0,
          gap: '12px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="segmented-switch">
            <button
              type="button"
              className={`segmented-switch-btn ${dashboardView === 'bento' ? 'active' : ''}`}
              onClick={() => setDashboardView('bento')}
            >
              <LayoutGrid size={13} />
              <span>BENTO COMMAND</span>
            </button>
            <button
              type="button"
              className={`segmented-switch-btn ${dashboardView === 'map' ? 'active' : ''}`}
              onClick={() => setDashboardView('map')}
            >
              <Map size={13} />
              <span>GEOSPATIAL C2 MAP</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="tactical-badge tactical-badge-online">
            <span className="dot-glowing-green" />
            SYS_ONLINE
          </span>
        </div>
      </div>

      {dashboardView === 'bento' ? (
        <TacticalBentoGrid
          summary={summary}
          tracksCount={tracks.length}
          alertsCount={openAlerts.length}
          incidentsCount={incidents.length}
          onNavigateModule={onNavigate}
        />
      ) : (
        /* Upper Area: Full Area Tactical Map + Right Intel Pane */
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

          {/* Floating expand tab button when information panel is collapsed */}
          {isRightPaneCollapsed && (
            <button
              type="button"
              onClick={() => setIsRightPaneCollapsed(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 30,
                background: 'var(--color-sheet)',
                border: '1px solid var(--color-edge)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-flat)',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Expand intelligence tab"
            >
              <ChevronLeft size={14} />
              <span>Intelligence</span>
            </button>
          )}
        </div>

        {/* Draggable Vertical Splitter Slider Handle */}
        <div
          onMouseDown={handleSplitterMouseDown}
          title="Drag to resize information tab (Double-click to reset)"
          onDoubleClick={() => {
            setRightPaneWidth(340);
            setIsRightPaneCollapsed(false);
          }}
          style={{
            width: '8px',
            cursor: 'col-resize',
            background: 'var(--color-paper)',
            borderLeft: '1px solid var(--color-edge)',
            borderRight: '1px solid var(--color-edge)',
            display: isRightPaneCollapsed ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            zIndex: 25,
            userSelect: 'none',
          }}
        >
          <GripVertical size={12} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
        </div>

        {/* Right Intel Pane */}
        <AlertsPanel
          width={rightPaneWidth}
          isCollapsed={isRightPaneCollapsed}
          onToggleCollapse={() => setIsRightPaneCollapsed(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          openAlerts={openAlerts}
          incidents={incidents}
          criticalIncident={criticalIncident}
          rankedThreats={rankedThreats}
          selectedEntityId={selectedEntity?.id || null}
          onSelectEntity={setSelectedEntity}
          crossModuleStep={crossModuleStep}
          missionSteps={missionSteps}
          onStepClick={(stepNum, module) => {
            setCrossModuleStep(stepNum);
            onNavigate(module as any);
          }}
          onNextStep={handleNextStep}
          isOfflineMode={isOfflineMode}
          onNavigate={onNavigate}
        />
      </div>
      )}

      {/* Bottom Simulation Bar */}
      <SimulationReplayFooter
        isSimPaused={isSimPaused}
        onToggleSimulationPause={onToggleSimulationPause}
        latestActivity={latestActivity}
      />
    </div>
  );
};
