import React, { useState, useEffect, useMemo } from 'react';
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
import { formatRuleLabel } from '../utils/rules';

export interface FieldReportItem {
  id: string;
  title: string;
  classification: string;
  timestamp: string;
  sourceModule: string;
  status: string;
  summary: string;
}

export interface TacticalActivityEvent {
  id: string;
  time: string;
  category: string;
  categoryColor: string;
  message: string;
}

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

  // Dynamic Alert Counter Calculation (Map-Derived Data)
  // Total Alerts = sum(Active Map Incidents) + sum(Tracks with Threat Score > 50) + sum(Unread System Logs)
  const activeMapIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'active' || i.status === 'in_progress').length;
  }, [incidents]);

  const highThreatTracksCount = useMemo(() => {
    return rankedThreats.filter((t) => t.score > 50).length;
  }, [rankedThreats]);

  const unreadSystemLogsCount = useMemo(() => {
    return openAlerts.length;
  }, [openAlerts]);

  const computedAlertCount = activeMapIncidentsCount + highThreatTracksCount + unreadSystemLogsCount;

  // Itemized List of Generated Field Reports for "Reports" Tab
  const generatedReports: FieldReportItem[] = useMemo(() => {
    return [
      {
        id: 'AIB-2026-08',
        title: 'Airspace Intelligence Brief',
        classification: 'TACTICAL RESTRICTED',
        timestamp: '14:28 UTC',
        sourceModule: 'skywatch',
        status: 'VERIFIED',
        summary: `${tracks.length} active tracks monitored. ${highThreatTracksCount > 0 ? `${highThreatTracksCount} elevated threat tracks detected.` : 'Corridors clear.'} Track 07 flagged incursion towards Restricted R-2.`,
      },
      {
        id: 'FHT-2026-04',
        title: 'Field Hospital Triage Summary',
        classification: 'MEDICAL CONFIDENTIAL',
        timestamp: '14:20 UTC',
        sourceModule: 'mediroute',
        status: 'SUBMITTED',
        summary: `${casualties.length} casualties catalogued at forward care stations. Priority triage queue updated for evacuation via Highway 9 / Route Echo.`,
      },
      {
        id: 'GDA-2026-112',
        title: 'GeoINT Terrain & Damage Assessment',
        classification: 'RECON INTEL',
        timestamp: '14:15 UTC',
        sourceModule: 'geointel',
        status: 'ANALYST CONFIRMED',
        summary: `Radiometric dual-temporal satellite change analysis verified primary Highway 9 river bridge structural compromise. Bypass corridor designated.`,
      },
      {
        id: 'GRL-2026-101',
        title: 'Ground Recon Incident Log',
        classification: 'FIELD OPS',
        timestamp: '14:02 UTC',
        sourceModule: 'fieldlink',
        status: 'SYNCED (FieldLink)',
        summary: `Ground team Bravo field report logged. ${incidents.length} incidents currently registered in local mesh store.`,
      },
    ];
  }, [tracks.length, highThreatTracksCount, casualties.length, incidents.length]);

  // Chronological Event Log Stream for "Activity" Tab
  const activityEvents: TacticalActivityEvent[] = useMemo(() => {
    const baseEvents = [
      {
        id: 'act-1',
        time: '14:28:10',
        category: 'RADAR',
        categoryColor: '#0284C7',
        message: 'Radar stream connected (Primary PPI sweep active)',
      },
      {
        id: 'act-2',
        time: '14:29:05',
        category: 'THREAT',
        categoryColor: '#DC2626',
        message: 'Threat score recalculation: Track 07 escalated to Threat 92',
      },
      {
        id: 'act-3',
        time: '14:29:30',
        category: 'MESH',
        categoryColor: '#16A34A',
        message: 'Mesh packet synced via FieldLink node Alpha',
      },
      {
        id: 'act-4',
        time: '14:30:12',
        category: 'INTEL',
        categoryColor: '#D97706',
        message: 'Route Bravo obstruction confirmed by GeoINT sensor',
      },
      {
        id: 'act-5',
        time: '14:30:45',
        category: 'MEDEVAC',
        categoryColor: '#DC2626',
        message: 'Triage queue updated: 2 IMMEDIATE patients awaiting evacuation',
      },
    ];

    // Dynamic alert event stream
    const dynamicAlertEvents = alerts.slice(0, 4).map((alt, idx) => ({
      id: `dyn-alt-${alt.id || idx}`,
      time: '14:29 UTC',
      category: 'ALERT',
      categoryColor: '#DC2626',
      message: `${formatRuleLabel(alt.ruleName)}: ${alt.observedValue} (${alt.trackCallsign || alt.trackId})`,
    }));

    return [...dynamicAlertEvents, ...baseEvents];
  }, [alerts]);

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
  };

  // Standardized Threat Queue derived from mockup specs & dynamic telemetry
  const displayThreats = useMemo(() => {
    const baseThreats = [
      {
        id: 'trk-07',
        callsign: 'Track 07',
        reason: 'Heading to Restricted R-2',
        score: 92,
        severity: 'critical' as const,
      },
      {
        id: 'swarm-u1',
        callsign: 'Swarm U1 to U3',
        reason: 'Loitering, no transponder',
        score: 74,
        severity: 'high' as const,
      },
      {
        id: 'trk-11',
        callsign: 'Track 11',
        reason: 'Closing on sector 33',
        score: 51,
        severity: 'high' as const,
      },
      {
        id: 'airliner-ac48',
        callsign: 'Airliner AC-48',
        reason: 'Passing, outside zones',
        score: 12,
        severity: 'low' as const,
      },
    ];

    if (!rankedThreats || rankedThreats.length === 0) {
      return baseThreats;
    }

    const dynamicExtras = rankedThreats
      .filter((t) => !baseThreats.some((b) => b.callsign.toLowerCase() === t.callsign.toLowerCase()))
      .map((t) => ({
        id: t.id,
        callsign: t.callsign,
        reason: t.reason,
        score: t.score,
        severity: t.severity,
      }));

    return [...baseThreats, ...dynamicExtras].slice(0, 5);
  }, [rankedThreats]);

  // Activity ticker: latest real event from state
  const latestActivity = (() => {
    if (alerts.length > 0 && (!incidents.length || new Date(alerts[0].timestamp) >= new Date(incidents[0].createdAt))) {
      const a = alerts[0];
      return `Airspace Alert: ${formatRuleLabel(a.ruleName)} - ${a.trackCallsign} (${formatIST(a.timestamp, { seconds: false })})`;
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
          <div
            className="intel-header"
            style={{
              padding: '8px 14px 10px',
              borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'var(--color-sheet)',
            }}
          >
            {/* Top Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1.5px solid var(--color-line, #D1D5DB)',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'alerts' ? '2.5px solid #EA580C' : '2.5px solid transparent',
                  marginBottom: '-1.5px',
                  padding: '8px 4px 6px',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: activeTab === 'alerts' ? 800 : 600,
                  color: activeTab === 'alerts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Alerts {computedAlertCount}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'reports' ? '2.5px solid #EA580C' : '2.5px solid transparent',
                  marginBottom: '-1.5px',
                  padding: '8px 4px 6px',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: activeTab === 'reports' ? 800 : 600,
                  color: activeTab === 'reports' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Reports {generatedReports.length}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'activity' ? '2.5px solid #EA580C' : '2.5px solid transparent',
                  marginBottom: '-1.5px',
                  padding: '8px 4px 6px',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: activeTab === 'activity' ? 800 : 600,
                  color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Activity
              </button>
            </div>

            {/* Persistent Top Header Status Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: isOfflineMode ? 'var(--color-crit, #DC2626)' : '#16A34A',
                      borderRadius: '1px',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.86rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {isOfflineMode ? 'Air-gap queue active' : 'Command link synchronized'}
                  </span>
                </div>

                {/* Green [■ Live] Pulse Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    border: '1px solid #16A34A',
                    borderRadius: '3px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: '#16A34A',
                    background: 'rgba(22, 163, 74, 0.08)',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ fontSize: '0.60rem' }}>■</span>
                  <span>Live</span>
                </div>
              </div>

              {/* Telemetry streaming live count text */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Telemetry streaming: {tracks.length} tracks, {incidents.length} incidents, {casualties.length} evacuation records.
              </div>
            </div>
          </div>

          {/* Intel Body (Scrollable, Tabbed Views) */}
          <div className="intel-body">
            {/* 1. ALERTS TAB VIEW (Default) */}
            {activeTab === 'alerts' && (
              <>
                {/* Critical Incident Highlight Card */}
                {criticalIncident && (
                  <div
                    style={{
                      border: '1.5px solid #991B1B',
                      borderRadius: 'var(--radius-sm, 4px)',
                      background: '#FFFFFF',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: 'var(--shadow-flat-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#991B1B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Critical incident
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.70rem',
                          color: 'var(--text-secondary, #64748B)',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                        }}
                      >
                        {criticalIncident.id || 'INC-2026-002'}, 14:29 UTC
                      </span>
                    </div>

                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', lineHeight: 1.25 }}>
                      {criticalIncident.title || 'Route Bravo Bridge Collapse'}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.4 }}>
                      {criticalIncident.notes || 'Primary bridge along Highway 9 impassable due to structural failure. Evacuation convoys must divert to Route Echo.'}
                    </div>

                    {/* Coordinate pin display above action button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        color: 'var(--text-primary, #0F172A)',
                        marginTop: '2px',
                      }}
                    >
                      <span style={{ color: '#991B1B', fontSize: '0.9rem' }}>♦</span>
                      <span>
                        {criticalIncident.location?.lat
                          ? `${criticalIncident.location.lat.toFixed(4)} N, ${Math.abs(criticalIncident.location.lng).toFixed(4)} W`
                          : '34.0620 N, 118.2310 W'}
                      </span>
                    </div>

                    {/* High-visibility solid orange tactical button */}
                    <button
                      type="button"
                      onClick={() => onNavigate('fieldlink')}
                      style={{
                        width: '100%',
                        background: '#EA580C',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        fontFamily: 'var(--font-heading)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        marginTop: '4px',
                        textAlign: 'center',
                        transition: 'background 0.15s ease',
                        boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#C2410C')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#EA580C')}
                    >
                      Open in FieldLink
                    </button>
                  </div>
                )}

                {/* Threat Queue */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Threat queue
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Ranked by score
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {displayThreats.map((threat) => {
                      const isHigh = threat.score > 70;
                      const isModerate = threat.score >= 50 && threat.score <= 70;
                      const scoreColor = isHigh ? '#991B1B' : isModerate ? '#C2410C' : '#15803D';

                      return (
                        <div
                          key={threat.id}
                          onClick={() => {
                            setSelectedEntity({ type: 'track', id: threat.id, raw: threat });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            border: '1px solid var(--color-line, #D1D5DB)',
                            borderRadius: 'var(--radius-sm, 4px)',
                            background: 'var(--color-paper, #EDF2EB)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease, background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Dynamic Ping Icon: ♦ (>70), ❖ (50-70), ▲ (<50) */}
                            {isHigh ? (
                              <span style={{ color: '#991B1B', fontSize: '1.15rem', lineHeight: 1 }}>♦</span>
                            ) : isModerate ? (
                              <span style={{ color: '#C2410C', fontSize: '1.05rem', lineHeight: 1 }}>❖</span>
                            ) : (
                              <span style={{ color: '#15803D', fontSize: '0.95rem', lineHeight: 1 }}>▲</span>
                            )}

                            <div>
                              <div style={{ fontSize: '0.84rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {threat.callsign}
                              </div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
                                {threat.reason}
                              </div>
                            </div>
                          </div>

                          {/* Score value aligned cleanly right with matching color progress indicator bar underneath */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                            <span
                              className="numeral"
                              style={{
                                fontSize: '1.22rem',
                                fontFamily: 'var(--font-numerals)',
                                fontWeight: 800,
                                color: scoreColor,
                                lineHeight: 1,
                              }}
                            >
                              {threat.score}
                            </span>
                            <div
                              style={{
                                width: '48px',
                                height: '4px',
                                background: 'var(--color-line, #D1D5DB)',
                                borderRadius: '2px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, threat.score)}%`,
                                  height: '100%',
                                  background: scoreColor,
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                      style={{ padding: '3px 8px', fontSize: '0.72rem', border: '1px solid var(--color-edge)' }}
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
                                  background: '#15803D',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
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
                                  border: '2px solid #EA580C',
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
                                    background: '#EA580C',
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: '1.5px dashed var(--color-edge, #94A3B8)',
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
                              color: isStepActive ? '#EA580C' : 'var(--text-secondary)',
                            }}
                          >
                            {s.statusText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* 2. REPORTS TAB VIEW */}
            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.86rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Field Intelligence Reports
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    {generatedReports.length} Synchronized
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {generatedReports.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        border: '1px solid var(--color-line)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        background: 'var(--color-paper)',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: 'var(--shadow-flat-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            color: '#0B5D82',
                            background: 'rgba(11, 93, 130, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          {report.classification}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {report.timestamp}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {report.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                          {report.summary}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--color-line)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            color: '#16A34A',
                          }}
                        >
                          ● {report.status}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onNavigate(report.sourceModule as any)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 600,
                          }}
                        >
                          Open Module →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ACTIVITY TAB VIEW */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.86rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tactical Event Stream
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    Chronological event log
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activityEvents.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '7px 9px',
                        border: '1px solid var(--color-line)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        background: 'var(--color-paper)',
                        fontSize: '0.74rem',
                        lineHeight: 1.35,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        [{act.time}]
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          color: act.categoryColor,
                          background: 'rgba(0, 0, 0, 0.05)',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          flexShrink: 0,
                        }}
                      >
                        {act.category}
                      </span>
                      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {act.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
