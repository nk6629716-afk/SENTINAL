import React, { useState } from 'react';
import {
  ExtendedCasualtyRecord,
  VitalAnomaly,
} from '../medirouteTypes';
import {
  HeartPulse,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  Zap,
} from 'lucide-react';

interface PatientMonitoringTabProps {
  casualties: ExtendedCasualtyRecord[];
  selectedCasualtyId: string | null;
  onSelectCasualty: (id: string) => void;
  isSimPaused?: boolean;
  onToggleSimPause?: () => void;
  onResetSimulation?: () => void;
  onStepSimulation?: () => void;
  onInjectAnomaly?: (patientId: string, metric: 'hr' | 'spo2' | 'rr' | 'temp') => void;
}

export const PatientMonitoringTab: React.FC<PatientMonitoringTabProps> = ({
  casualties,
  selectedCasualtyId,
  onSelectCasualty,
  onInjectAnomaly,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'anomalies_only'>('all');

  // Configurable thresholds for anomaly detection
  const [thresholds, setThresholds] = useState({
    maxHr: 125,
    minHr: 50,
    minSpo2: 90,
    maxRr: 30,
    minRr: 10,
    maxTemp: 38.5,
    minTemp: 35.5,
  });

  const selectedPatient =
    casualties.find((c) => c.id === selectedCasualtyId) || casualties[0];

  const displayedPatients = casualties.filter((c) => {
    if (filterSeverity === 'anomalies_only') {
      return (c.activeAnomalies && c.activeAnomalies.length > 0) || c.triageCategory === 'immediate';
    }
    return true;
  });

  // Calculate freshness
  const getFreshness = (lastTimeStr?: string) => {
    if (!lastTimeStr) return { label: 'Unknown', isStale: true };
    const diffSec = Math.floor((Date.now() - new Date(lastTimeStr).getTime()) / 1000);
    if (diffSec < 30) return { label: `${diffSec}s ago (Live)`, isStale: false };
    if (diffSec < 120) return { label: `${diffSec}s ago (Recent)`, isStale: false };
    return { label: `${Math.floor(diffSec / 60)}m ago (Stale feed)`, isStale: true };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Patient Split View: Left List / Right Details & Trend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Left Column: Monitored Patient Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #94a192)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Telemetry Roster ({displayedPatients.length})
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setFilterSeverity('all')}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  background: filterSeverity === 'all' ? 'var(--accent-sage, #738a65)' : 'transparent',
                  color: filterSeverity === 'all' ? '#000' : 'var(--text-secondary, #94a192)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                All Patients
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setFilterSeverity('anomalies_only')}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  background: filterSeverity === 'anomalies_only' ? 'var(--status-critical, #c85a53)' : 'transparent',
                  color: filterSeverity === 'anomalies_only' ? '#fff' : 'var(--text-secondary, #94a192)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Anomalies Only
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedPatients.map((patient) => {
              const isSelected = patient.id === selectedPatient?.id;
              const hasAnomalies = patient.activeAnomalies && patient.activeAnomalies.length > 0;
              const freshness = getFreshness(patient.lastReadingTime);

              return (
                <div
                  key={patient.id}
                  onClick={() => onSelectCasualty(patient.id)}
                  style={{
                    background: isSelected ? 'var(--bg-elevated, #1f2622)' : 'var(--bg-card, #181d1a)',
                    border: isSelected
                      ? '1px solid var(--accent-sage, #738a65)'
                      : hasAnomalies
                      ? '1px solid rgba(200, 90, 83, 0.4)'
                      : '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary, #e9ece9)',
                        }}
                      >
                        {patient.patientCode || patient.id}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background:
                            patient.triageCategory === 'immediate'
                              ? 'rgba(200, 90, 83, 0.2)'
                              : patient.triageCategory === 'delayed'
                              ? 'rgba(212, 163, 115, 0.2)'
                              : 'rgba(88, 129, 87, 0.2)',
                          color:
                            patient.triageCategory === 'immediate'
                              ? 'var(--status-critical, #c85a53)'
                              : patient.triageCategory === 'delayed'
                              ? 'var(--status-warning, #d4a373)'
                              : 'var(--status-safe, #588157)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {patient.triageCategory || 'Awaiting'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: freshness.isStale ? 'var(--status-warning, #d4a373)' : 'var(--text-muted, #667564)', fontFamily: 'var(--font-mono)' }}>
                      <Clock size={11} />
                      <span>{freshness.label}</span>
                    </div>
                  </div>

                  {/* Vitals Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      marginTop: '10px',
                      fontSize: '0.7rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted, #667564)', display: 'block', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>HR</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: (patient.heartRate || 0) > thresholds.maxHr ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)',
                        }}
                      >
                        {patient.heartRate ?? '--'} <span style={{ fontSize: '0.58rem' }}>bpm</span>
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted, #667564)', display: 'block', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>SpO₂</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: (patient.spo2 || 99) < thresholds.minSpo2 ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)',
                        }}
                      >
                        {patient.spo2 ?? '--'} <span style={{ fontSize: '0.58rem' }}>%</span>
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted, #667564)', display: 'block', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>BP</span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary, #e9ece9)' }}>
                        {patient.bpSystolic ?? 120}/{patient.bpDiastolic ?? 80}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted, #667564)', display: 'block', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>RR</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: (patient.respiratoryRate || 0) > thresholds.maxRr ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)',
                        }}
                      >
                        {patient.respiratoryRate ?? patient.vitals?.respiratoryRate ?? '--'} <span style={{ fontSize: '0.58rem' }}>/min</span>
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Badge if Present */}
                  {hasAnomalies && (
                    <div
                      style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        background: 'rgba(200, 90, 83, 0.15)',
                        border: '1px solid rgba(200, 90, 83, 0.3)',
                        fontSize: '0.65rem',
                        color: 'var(--status-critical, #c85a53)',
                        fontWeight: 600,
                      }}
                    >
                      <AlertTriangle size={11} />
                      <span>{patient.activeAnomalies![0].title}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Telemetry, Anomaly Explanations & Trends */}
        {selectedPatient && (
          <div
            style={{
              background: 'var(--bg-card, #181d1a)',
              border: '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
              borderRadius: 'var(--radius-sm, 6px)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Subject Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)' }}>
                    {selectedPatient.patientCode || selectedPatient.id}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a192)' }}>
                    ({selectedPatient.fictionalName || 'Simulated Casualty'})
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a192)', marginTop: '2px' }}>
                  Location: {selectedPatient.location?.name || 'Field Sector'} &bull; Demographics: {selectedPatient.gender || 'M'}, {selectedPatient.age || 35} yo
                </div>
              </div>

              {/* Demo Action: Trigger Simulated Anomaly */}
              {onInjectAnomaly && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onInjectAnomaly(selectedPatient.id, 'spo2')}
                  style={{
                    fontSize: '0.7rem',
                    padding: '4px 8px',
                    background: 'rgba(200, 90, 83, 0.15)',
                    color: 'var(--status-critical, #c85a53)',
                    border: '1px solid rgba(200, 90, 83, 0.4)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Inject test spike in vitals to verify triage recommendation & alert triggers"
                >
                  <Zap size={11} style={{ marginRight: '4px' }} />
                  Inject SpO₂ Drop
                </button>
              )}
            </div>

            {/* Vital Signs Grid Display */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {/* HR Card */}
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a192)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                  <HeartPulse size={13} color="var(--status-critical, #c85a53)" />
                  <span>HEART RATE</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedPatient.heartRate ?? '--'} <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>bpm</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: (selectedPatient.heartRate || 0) > thresholds.maxHr ? 'var(--status-critical, #c85a53)' : 'var(--text-muted, #667564)' }}>
                  Normal: 60-100 bpm
                </div>
              </div>

              {/* SpO2 Card */}
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a192)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                  <Droplets size={13} color="var(--accent-sage, #738a65)" />
                  <span>SPO₂ SAT</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: (selectedPatient.spo2 || 99) < thresholds.minSpo2 ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedPatient.spo2 ?? '--'} <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>%</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted, #667564)' }}>
                  Target: 94-100%
                </div>
              </div>

              {/* BP Card */}
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a192)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                  <Activity size={13} color="var(--status-warning, #d4a373)" />
                  <span>BLOOD PRESSURE</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedPatient.bpSystolic ?? 120}/{selectedPatient.bpDiastolic ?? 80}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted, #667564)' }}>
                  Unit: mmHg
                </div>
              </div>

              {/* RR Card */}
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a192)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                  <Wind size={13} color="var(--accent-sage, #738a65)" />
                  <span>RESPIRATION</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: (selectedPatient.respiratoryRate || 0) > thresholds.maxRr ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedPatient.respiratoryRate ?? selectedPatient.vitals?.respiratoryRate ?? '--'} <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>/min</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted, #667564)' }}>
                  Normal: 12-20 /min
                </div>
              </div>

              {/* Temperature Card */}
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a192)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                  <Thermometer size={13} color="var(--status-info, #738a65)" />
                  <span>BODY TEMP</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedPatient.temperature ?? 37.0} <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>°C</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted, #667564)' }}>
                  Normal: 36.5-37.5°C
                </div>
              </div>
            </div>

            {/* Active Anomaly Alerts */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #94a192)', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                Active Telemetry Anomaly Detections
              </div>

              {!selectedPatient.activeAnomalies || selectedPatient.activeAnomalies.length === 0 ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '4px',
                    background: 'rgba(88, 129, 87, 0.10)',
                    border: '1px solid rgba(88, 129, 87, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.72rem',
                    color: 'var(--status-safe, #588157)',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>No active anomaly alerts. All simulated vitals within configured limits.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPatient.activeAnomalies.map((anom) => (
                    <div
                      key={anom.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '4px',
                        background: 'rgba(200, 90, 83, 0.12)',
                        border: '1px solid rgba(200, 90, 83, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} color="var(--status-critical, #c85a53)" />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)' }}>
                            {anom.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--status-critical, #c85a53)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          Observed: {anom.observedValue} (Threshold {anom.threshold})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a192)', lineHeight: 1.4 }}>
                        {anom.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Vitals History Table */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #94a192)', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                Recent Reading Sequence
              </div>
              <div
                style={{
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))', color: 'var(--text-muted, #667564)', fontFamily: 'var(--font-mono)' }}>
                      <th style={{ padding: '8px 12px' }}>Timestamp</th>
                      <th style={{ padding: '8px 12px' }}>Heart Rate</th>
                      <th style={{ padding: '8px 12px' }}>SpO₂</th>
                      <th style={{ padding: '8px 12px' }}>Blood Pressure</th>
                      <th style={{ padding: '8px 12px' }}>Resp Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPatient.vitalsHistory || []).slice(-4).map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(115, 138, 101, 0.08)', fontFamily: 'var(--font-mono)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary, #94a192)' }}>
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ padding: '6px 12px', color: (h.heartRate || 0) > thresholds.maxHr ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)' }}>
                          {h.heartRate} bpm
                        </td>
                        <td style={{ padding: '6px 12px', color: (h.spo2 || 99) < thresholds.minSpo2 ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)' }}>
                          {h.spo2}%
                        </td>
                        <td style={{ padding: '6px 12px', color: 'var(--text-primary, #e9ece9)' }}>
                          {h.bpSystolic}/{h.bpDiastolic}
                        </td>
                        <td style={{ padding: '6px 12px', color: (h.respiratoryRate || 0) > thresholds.maxRr ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)' }}>
                          {h.respiratoryRate}/min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
