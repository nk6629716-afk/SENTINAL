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
  Shield,
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
  AlertTriangle,
  CheckCircle,
  Truck,
  Layers,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  PlayCircle,
  RotateCcw,
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
}) => {
  const [crossModuleStep, setCrossModuleStep] = useState<number>(1);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const pendingIncidents = incidents.filter((i) => i.syncStatus === 'pending');
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalCasualties = casualties.filter((c) => c.triageCategory === 'immediate');
  const blockedHazards = hazards.filter((h) => h.blocked);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* 1. Tactical Situational Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid var(--accent-cyan)',
          background: 'linear-gradient(90deg, rgba(14, 20, 36, 0.95) 0%, rgba(10, 16, 28, 0.85) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem' }}>SENTINEL Unified Command Center</h2>
              <span className="badge badge-simulated">SYNTHETIC OPERATIONS TESTBED</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Integrated Common Operational Picture (COP). Synthesizes offline tactical reports (FieldLink),
              counter-drone radar (SkyWatch), geospatial reconnaissance (GeoIntel), and evacuation logistics (MediRoute).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className={`badge ${isOfflineMode ? 'badge-danger' : 'badge-nominal'}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              {isOfflineMode ? 'OFFLINE CLIENT ACTIVE' : 'ALL SYSTEMS OPERATIONAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards (Real derived state) */}
      <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        {/* KPI 1: FieldLink Incidents */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('fieldlink')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FIELDLINK REPORTS</span>
            <Radio size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {incidents.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingIncidents.length > 0 ? '#f59e0b' : 'var(--text-muted)', marginTop: '4px' }}>
            {pendingIncidents.length > 0 ? `${pendingIncidents.length} awaiting offline sync` : 'All reports synced'}
          </div>
        </div>

        {/* KPI 2: SkyWatch Airspace Tracks */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('skywatch')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACTIVE DRONE TRACKS</span>
            <Crosshair size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {tracks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: activeAlerts.length > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {activeAlerts.length > 0 ? `${activeAlerts.length} unacknowledged anomalies` : 'Airspace clear'}
          </div>
        </div>

        {/* KPI 3: GeoIntel Candidate Observations */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('geointel')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>GEOINTEL RECON</span>
            <Compass size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {observations.reduce((acc, o) => acc + o.candidates.length, 0)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {observations[0]?.candidates.filter((c) => !c.reviewed).length || 0} candidate changes pending review
          </div>
        </div>

        {/* KPI 4: MediRoute Casualties */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('mediroute')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MEDIROUTE EVAC</span>
            <HeartPulse size={16} color="var(--status-nominal)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {casualties.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: criticalCasualties.length > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {criticalCasualties.length} Critical (Immediate) • {blockedHazards.length} roads blocked
          </div>
        </div>
      </div>

      {/* 3. Cross-Module Demo Scenario Stepper (Section 7 of Master Plan) */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          background: 'rgba(10, 16, 28, 0.75)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlayCircle size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
              3-Minute Judge Demonstration Scenario (Cross-Module Walkthrough)
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onResetDemo}
            style={{ fontSize: '0.72rem' }}
          >
            <RotateCcw size={13} />
            <span>Reset Demo Baseline</span>
          </button>
        </div>

        {/* Stepper Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {[
            { step: 1, title: '1. FieldLink Offline Report', module: 'fieldlink', desc: 'Personnel creates incident offline' },
            { step: 2, title: '2. Hazard Blockage', module: 'mediroute', desc: 'Bridge collapsed on Highway 9' },
            { step: 3, title: '3. MediRoute Recalculation', module: 'mediroute', desc: 'Ambulance rerouted via Ridgeline' },
            { step: 4, title: '4. SkyWatch Drone Anomaly', module: 'skywatch', desc: 'Unregistered UAV enters NFZ' },
            { step: 5, title: '5. GeoIntel Recon Proof', module: 'geointel', desc: 'Multi-temporal imagery change' },
          ].map((item) => {
            const isCurrent = crossModuleStep === item.step;
            return (
              <button
                key={item.step}
                onClick={() => {
                  setCrossModuleStep(item.step);
                  onNavigate(item.module as any);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isCurrent ? 'rgba(0, 242, 254, 0.15)' : 'rgba(14, 20, 36, 0.6)',
                  border: `1px solid ${isCurrent ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Operational Layout: Tactical Map (2 cols) & Unified Feed (1 col) */}
      <div className="grid grid-cols-3">
        {/* Left: Unified Tactical Map */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">
                <Layers size={18} color="var(--accent-cyan)" />
                <span>Integrated Common Operational Picture (COP)</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-cyan">ALL 4 MODULE LAYERS ACTIVE</span>
              </div>
            </div>

            <TacticalMap
              incidents={incidents}
              tracks={tracks}
              zones={zones}
              nodes={nodes}
              edges={hazards}
              height="500px"
              onSelectEntity={(e) => setSelectedEntity(e)}
            />

            {/* Quick Entity Preview Drawer */}
            {selectedEntity && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(14, 20, 36, 0.85)',
                  border: '1px solid var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                    INSPECTED {selectedEntity.type}: {selectedEntity.id}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedEntity.raw?.title || selectedEntity.raw?.callsign || selectedEntity.raw?.name}
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (selectedEntity.type === 'incident') onNavigate('fieldlink');
                    if (selectedEntity.type === 'track') onNavigate('skywatch');
                    if (selectedEntity.type === 'node') onNavigate('mediroute');
                  }}
                >
                  <span>Open Module</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cross-Module Unified Incident & Event Timeline */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="var(--accent-cyan)" />
                <span>Unified Tactical Timeline</span>
              </div>
              <span className="badge badge-simulated">CHRONOLOGICAL</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '540px', overflowY: 'auto' }}>
              {/* Combine alerts and incidents into one chronological stream */}
              {[
                ...alerts.map((a) => ({
                  id: a.id,
                  title: `Airspace Alert: ${a.ruleName}`,
                  notes: a.explanation,
                  source: 'skywatch' as const,
                  priority: a.severity === 'critical' ? 'critical' : 'high',
                  timestamp: a.timestamp,
                })),
                ...incidents.map((i) => ({
                  id: i.id,
                  title: i.title,
                  notes: i.notes,
                  source: i.sourceModule,
                  priority: i.priority,
                  timestamp: i.createdAt,
                })),
              ]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(14, 20, 36, 0.65)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span
                        className={`badge ${
                          item.priority === 'critical'
                            ? 'badge-danger'
                            : item.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-cyan'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {item.source.toUpperCase()} • {item.priority.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ffffff', marginBottom: '2px' }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {item.notes}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
