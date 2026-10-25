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

  const pendingIncidents = incidents.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalCasualties = casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated');
  const blockedHazards = hazards.filter((h) => h.blocked);

  const primaryIncident = incidents.find((i) => i.priority === 'critical') || incidents[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Situation Status Bar (System Indicators in Neumorphic Chips) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Status Indicator 1 */}
        <div className="neu-card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              NETWORK SYNCHRONIZATION
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)' }}>
              {isOfflineMode ? 'Offline Local Storage' : 'Server Link Nominal'}
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              background: isOfflineMode ? 'var(--critical-bg)' : 'var(--healthy-bg)',
              boxShadow: 'var(--shadow-inset-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
            }}
          >
            <Activity size={18} />
          </div>
        </div>

        {/* Status Indicator 2: FieldLink Outbox */}
        <div
          className="neu-card-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => onNavigate('fieldlink')}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              FIELDLINK OUTBOX
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: pendingIncidents.length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {pendingIncidents.length} Pending / {incidents.length} Total
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Radio size={18} />
          </div>
        </div>

        {/* Status Indicator 3: SkyWatch Anomalies */}
        <div
          className="neu-card-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => onNavigate('skywatch')}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              AIRSPACE ANOMALIES
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: activeAlerts.length > 0 ? 'var(--critical)' : 'var(--text-primary)' }}>
              {activeAlerts.length} Unack / {tracks.length} Tracks
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              background: activeAlerts.length > 0 ? 'var(--critical-bg)' : 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeAlerts.length > 0 ? 'var(--critical)' : 'var(--text-secondary)',
            }}
          >
            <Crosshair size={18} />
          </div>
        </div>

        {/* Status Indicator 4: MediRoute Casualties */}
        <div
          className="neu-card-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => onNavigate('mediroute')}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              EVACUATION QUEUE
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: criticalCasualties.length > 0 ? 'var(--critical)' : 'var(--text-primary)' }}>
              {criticalCasualties.length} Critical / {blockedHazards.length} Blocked
            </div>
          </div>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--healthy)',
            }}
          >
            <HeartPulse size={18} />
          </div>
        </div>
      </div>

      {/* 2. Primary Incident Spotlight Panel (Raised Neumorphic Surface) */}
      {primaryIncident && (
        <div className="neu-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-neu badge-neu-crit">CRITICAL INCIDENT SPOTLIGHT</span>
              <span className="badge-neu badge-neu-neutral">REF: {primaryIncident.id}</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              Logged: {new Date(primaryIncident.createdAt).toLocaleTimeString()}
            </div>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {primaryIncident.title}
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px', maxWidth: '850px' }}>
            {primaryIncident.notes}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Location: <strong style={{ color: 'var(--text-primary)' }}>{primaryIncident.location.name}</strong> [{primaryIncident.location.lat.toFixed(3)}, {primaryIncident.location.lng.toFixed(3)}]
            </div>

            <button className="btn-neu btn-neu-sm" onClick={() => onNavigate('fieldlink')}>
              <span>View in FieldLink</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 3. 3-Minute Judge Demonstration Scenario (Walkthrough Tabs in Soft Recessed Bar) */}
      <div className="neu-card" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Evaluation Scenario
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Cross-Module Incident & Response Sequence
            </div>
          </div>
          <span className="badge-neu badge-neu-neutral">STEP {crossModuleStep} OF 5</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {[
            { step: 1, title: '1. FieldLink Offline', module: 'fieldlink', desc: 'Create local queued report' },
            { step: 2, title: '2. Hazard Blockage', module: 'mediroute', desc: 'Bridge collapsed on Hwy 9' },
            { step: 3, title: '3. Route Recalculation', module: 'mediroute', desc: 'Ambulance rerouted safely' },
            { step: 4, title: '4. SkyWatch Anomaly', module: 'skywatch', desc: 'Drone breaches NFZ' },
            { step: 5, title: '5. GeoIntel Recon', module: 'geointel', desc: 'Verify candidate change' },
          ].map((item) => {
            const isCurrent = crossModuleStep === item.step;
            return (
              <button
                key={item.step}
                onClick={() => {
                  setCrossModuleStep(item.step);
                  onNavigate(item.module as any);
                }}
                className={isCurrent ? 'btn-neu-primary' : 'btn-neu'}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.7rem', opacity: isCurrent ? 0.9 : 0.7, marginTop: '2px', fontWeight: 400 }}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Common Operational Picture (Tactical Map) & Activity Ledger */}
      <div className="grid grid-cols-3">
        {/* Left (2 spans): Map */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="neu-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.98rem' }}>
                <Layers size={18} color="var(--accent)" />
                <span>Common Operational Picture (COP)</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge-neu badge-neu-info">{tracks.length} Airspace Tracks</span>
                <span className="badge-neu badge-neu-warn">{incidents.length} Ground Incidents</span>
              </div>
            </div>

            <TacticalMap
              incidents={incidents}
              tracks={tracks}
              zones={zones}
              nodes={nodes}
              edges={hazards}
              height="480px"
              onSelectEntity={(e) => setSelectedEntity(e)}
            />

            {selectedEntity && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    Inspected {selectedEntity.type}: {selectedEntity.id}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedEntity.raw?.title || selectedEntity.raw?.callsign || selectedEntity.raw?.name}
                  </div>
                </div>

                <button
                  className="btn-neu btn-neu-sm"
                  onClick={() => {
                    if (selectedEntity.type === 'incident') onNavigate('fieldlink');
                    if (selectedEntity.type === 'track') onNavigate('skywatch');
                    if (selectedEntity.type === 'node') onNavigate('mediroute');
                  }}
                >
                  <span>Open in Workspace</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right (1 span): Unified Activity Ledger */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="neu-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                Operational Activity Feed
              </div>
              <span className="badge-neu badge-neu-neutral">REAL-TIME</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, maxHeight: '480px', paddingRight: '4px' }}>
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
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-inset)',
                      boxShadow: 'var(--shadow-inset-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className={`badge-neu ${item.priority === 'critical' ? 'badge-neu-crit' : item.priority === 'high' ? 'badge-neu-warn' : 'badge-neu-info'}`} style={{ fontSize: '0.65rem' }}>
                        {item.source}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
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
