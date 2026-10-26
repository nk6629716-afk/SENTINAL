import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  ShieldCheck,
  Search,
  PlusCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { SoldierProfile, SoldierVitalsRecord, CreateSoldierVitalsInput } from '@shared/types';
import { api } from '../../services/api/apiClient';
import { authService } from '../../services/auth/authService';

export const SoldierVitalsModule: React.FC = () => {
  const [soldiers, setSoldiers] = useState<SoldierProfile[]>([]);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>('SOL-101');
  const [vitalsHistory, setVitalsHistory] = useState<SoldierVitalsRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [heartRate, setHeartRate] = useState<string>('75');
  const [bpSystolic, setBpSystolic] = useState<string>('120');
  const [bpDiastolic, setBpDiastolic] = useState<string>('80');
  const [temperature, setTemperature] = useState<string>('36.8');
  const [oxygenSaturation, setOxygenSaturation] = useState<string>('98');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('16');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  // Role permissions
  const currentUser = authService.getUser();
  const canRecordVitals = authService.hasRole(['administrator', 'medical_officer']);

  // Load soldiers roster
  const loadSoldiers = async () => {
    setIsLoading(true);
    try {
      const roster = await api.getSoldiers();
      setSoldiers(roster);
      if (roster.length > 0 && !roster.some((s) => s.id === selectedSoldierId)) {
        setSelectedSoldierId(roster[0].id);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to load soldiers' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load vitals history for selected soldier
  const loadVitalsHistory = async (soldierId: string) => {
    try {
      const records = await api.getSoldierVitals(soldierId);
      setVitalsHistory(records);
    } catch (err: any) {
      console.warn('[SoldierVitals] History fetch error:', err);
    }
  };

  useEffect(() => {
    loadSoldiers();
  }, []);

  useEffect(() => {
    if (selectedSoldierId) {
      loadVitalsHistory(selectedSoldierId);
    }
  }, [selectedSoldierId]);

  const filteredSoldiers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return soldiers;
    return soldiers.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.callsign.toLowerCase().includes(q) ||
        s.unit.toLowerCase().includes(q)
    );
  }, [soldiers, searchQuery]);

  const selectedSoldier = useMemo(
    () => soldiers.find((s) => s.id === selectedSoldierId) || null,
    [soldiers, selectedSoldierId]
  );

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoldierId) return;

    if (!canRecordVitals) {
      setFeedbackMessage({
        type: 'error',
        text: 'Access Denied: Requires Medical Officer or Administrator role clearance.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const payload: CreateSoldierVitalsInput = {
        soldierId: selectedSoldierId,
        heartRateBpm: heartRate ? Number(heartRate) : undefined,
        bloodPressureSystolic: bpSystolic ? Number(bpSystolic) : undefined,
        bloodPressureDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
        temperatureCelsius: temperature ? Number(temperature) : undefined,
        oxygenSaturationPct: oxygenSaturation ? Number(oxygenSaturation) : undefined,
        respiratoryRateBpm: respiratoryRate ? Number(respiratoryRate) : undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        timestamp: new Date().toISOString(),
      };

      const saved = await api.recordSoldierVitals(payload);
      setVitalsHistory((prev) => [saved, ...prev]);
      setFeedbackMessage({
        type: 'success',
        text: `Vitals recorded for ${selectedSoldier?.callsign || selectedSoldierId} at ${new Date().toLocaleTimeString()}.`,
      });
      setClinicalNotes('');
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit vitals measurement.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', minHeight: '100%' }}>
      {/* 1. Header Banner & Medical Disclaimer */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26, 38, 57, 0.7) 0%, rgba(13, 20, 31, 0.8) 100%)',
          border: '1px solid var(--color-line, rgba(255, 255, 255, 0.12))',
          borderRadius: '8px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="#00E5FF" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Soldier Vitals & Health Monitoring
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#8D9A8F' }}>
                Operational physiological tracking and historical health telemetry
              </span>
            </div>
          </div>

          {/* Active Clearance Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '4px',
                border: canRecordVitals ? '1px solid #2D7A33' : '1px solid #B77700',
                background: canRecordVitals ? 'rgba(45, 122, 51, 0.2)' : 'rgba(183, 119, 0, 0.2)',
                color: canRecordVitals ? '#B4F0B4' : '#FFB35A',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {canRecordVitals ? <UserCheck size={13} /> : <Lock size={13} />}
              {canRecordVitals ? 'MEDICAL CLEARANCE ACTIVE' : 'READ-ONLY VIEWER'}
            </span>

            <button
              type="button"
              onClick={() => {
                loadSoldiers();
                if (selectedSoldierId) loadVitalsHistory(selectedSoldierId);
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Refresh soldier roster and history"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mandatory Clinical Oversight Disclaimer */}
        <div
          style={{
            background: 'rgba(232, 89, 12, 0.12)',
            borderLeft: '3px solid #E8590C',
            padding: '6px 12px',
            borderRadius: '0 4px 4px 0',
            fontSize: '0.75rem',
            color: '#FFB35A',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={14} color="#E8590C" style={{ flexShrink: 0 }} />
          <span>
            <strong>OVERSIGHT NOTICE:</strong> For operational situational awareness and recordkeeping under qualified
            medical officer supervision. Not an automated diagnostic or triage authority.
          </span>
        </div>
      </div>

      {/* 2. Feedback Banners */}
      {feedbackMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: feedbackMessage.type === 'success' ? '1px solid #2D7A33' : '1px solid #A61B1B',
            background: feedbackMessage.type === 'success' ? 'rgba(45, 122, 51, 0.25)' : 'rgba(166, 27, 27, 0.25)',
            color: feedbackMessage.type === 'success' ? '#B4F0B4' : '#FF9494',
          }}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* 3. Main Split View: Left Roster / Center History / Right Entry Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 340px',
          gap: '16px',
          alignItems: 'start',
        }}
        className="vitals-grid-layout"
      >
        {/* Column A: Permitted Soldier Roster */}
        <div
          style={{
            background: 'var(--color-surface, #141C28)',
            border: '1px solid var(--color-line, rgba(255, 255, 255, 0.12))',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 700 }}>Personnel Roster</h3>
            <span style={{ fontSize: '0.72rem', color: '#8D9A8F' }}>{filteredSoldiers.length} units</span>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#8D9A8F" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search callsign / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                color: '#FFFFFF',
                fontSize: '0.78rem',
              }}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredSoldiers.map((soldier) => {
              const isSelected = soldier.id === selectedSoldierId;
              return (
                <div
                  key={soldier.id}
                  onClick={() => setSelectedSoldierId(soldier.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1.2px solid #00E5FF' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#00E5FF' : '#FFFFFF' }}>
                      {soldier.callsign}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#8D9A8F', fontFamily: 'monospace' }}>{soldier.id}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8D9A8F', marginTop: '2px' }}>{soldier.unit}</div>
                  <div style={{ marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background:
                          soldier.status === 'active'
                            ? 'rgba(45, 122, 51, 0.3)'
                            : soldier.status === 'in_transit'
                            ? 'rgba(232, 89, 12, 0.3)'
                            : 'rgba(100, 116, 139, 0.3)',
                        color:
                          soldier.status === 'active'
                            ? '#B4F0B4'
                            : soldier.status === 'in_transit'
                            ? '#FFB35A'
                            : '#CBD5E1',
                        fontWeight: 600,
                      }}
                    >
                      {soldier.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B: Selected Soldier Physiological Telemetry & History */}
        <div
          style={{
            background: 'var(--color-surface, #141C28)',
            border: '1px solid var(--color-line, rgba(255, 255, 255, 0.12))',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {selectedSoldier ? (
            <>
              {/* Profile Card */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#FFFFFF', fontWeight: 800 }}>
                    {selectedSoldier.callsign}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#8D9A8F' }}>
                    {selectedSoldier.id} • {selectedSoldier.unit}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#8D9A8F' }}>Last Measurement Count</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#00E5FF' }}>
                    {vitalsHistory.length} Recorded
                  </div>
                </div>
              </div>

              {/* Latest Quick Vitals Bar (if records exist) */}
              {vitalsHistory.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '8px',
                  }}
                >
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#FF708F' }}>
                      <Heart size={12} /> Heart Rate
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                      {vitalsHistory[0].heartRateBpm ?? '--'} <span style={{ fontSize: '0.7rem', color: '#8D9A8F' }}>BPM</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#00E5FF' }}>
                      <Activity size={12} /> Blood Pressure
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                      {vitalsHistory[0].bloodPressureSystolic ?? '--'}/{vitalsHistory[0].bloodPressureDiastolic ?? '--'}{' '}
                      <span style={{ fontSize: '0.7rem', color: '#8D9A8F' }}>mmHg</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#FFB35A' }}>
                      <Thermometer size={12} /> Temp
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                      {vitalsHistory[0].temperatureCelsius ?? '--'} <span style={{ fontSize: '0.7rem', color: '#8D9A8F' }}>°C</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#B4F0B4' }}>
                      <Wind size={12} /> SpO₂
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                      {vitalsHistory[0].oxygenSaturationPct ?? '--'} <span style={{ fontSize: '0.7rem', color: '#8D9A8F' }}>%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div style={{ marginTop: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 700 }}>
                  Measurement History & Clinical Timeline
                </h4>

                {vitalsHistory.length === 0 ? (
                  <div
                    style={{
                      padding: '30px',
                      textAlign: 'center',
                      color: '#8D9A8F',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  >
                    No physiological measurement logs on file for this soldier. Use the intake form to record baseline vitals.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                    {vitalsHistory.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00E5FF' }}>{rec.id}</span>
                          <span style={{ fontSize: '0.72rem', color: '#8D9A8F', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {new Date(rec.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                          {rec.heartRateBpm && (
                            <span style={{ color: '#FFFFFF' }}>
                              HR: <strong>{rec.heartRateBpm}</strong> bpm
                            </span>
                          )}
                          {rec.bloodPressureSystolic && rec.bloodPressureDiastolic && (
                            <span style={{ color: '#FFFFFF' }}>
                              BP: <strong>{rec.bloodPressureSystolic}/{rec.bloodPressureDiastolic}</strong> mmHg
                            </span>
                          )}
                          {rec.temperatureCelsius && (
                            <span style={{ color: '#FFFFFF' }}>
                              Temp: <strong>{rec.temperatureCelsius}</strong> °C
                            </span>
                          )}
                          {rec.oxygenSaturationPct && (
                            <span style={{ color: '#FFFFFF' }}>
                              SpO₂: <strong>{rec.oxygenSaturationPct}%</strong>
                            </span>
                          )}
                          {rec.respiratoryRateBpm && (
                            <span style={{ color: '#FFFFFF' }}>
                              RR: <strong>{rec.respiratoryRateBpm}</strong> br/m
                            </span>
                          )}
                        </div>

                        {rec.clinicalNotes && (
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#B0BAC5', fontStyle: 'italic' }}>
                            "{rec.clinicalNotes}"
                          </div>
                        )}

                        <div style={{ marginTop: '4px', fontSize: '0.68rem', color: '#8D9A8F' }}>
                          Recorded By: {rec.recordedBy}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8D9A8F' }}>Select a soldier from the roster</div>
          )}
        </div>

        {/* Column C: Validated Entry Form */}
        <div
          style={{
            background: 'var(--color-surface, #141C28)',
            border: '1px solid var(--color-line, rgba(255, 255, 255, 0.12))',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={16} color="#00E5FF" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 700 }}>Record Vitals Intake</h3>
          </div>

          {!canRecordVitals ? (
            <div
              style={{
                padding: '16px',
                background: 'rgba(183, 119, 0, 0.15)',
                border: '1px solid #B77700',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#FFB35A',
              }}
            >
              <Lock size={16} style={{ marginBottom: '6px' }} />
              <div>
                <strong>Read-Only Access:</strong> You are currently authenticated as <em>{currentUser?.role || 'Viewer'}</em>.
                Recording new physiological measurements requires <strong>Medical Officer</strong> or <strong>Administrator</strong> clearance.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitVitals} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                  Target Soldier
                </label>
                <select
                  value={selectedSoldierId}
                  onChange={(e) => setSelectedSoldierId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                  }}
                >
                  {soldiers.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#141C28', color: '#FFFFFF' }}>
                      {s.callsign} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    SpO₂ Saturation (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    BP Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    BP Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="160"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    Body Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                    Resp Rate (br/min)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="60"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '4px' }}>
                  Clinical Assessment / Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record objective observations..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '6px',
                  padding: '8px 12px',
                  background: isSubmitting ? '#555555' : '#00E5FF',
                  color: '#081018',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} />
                <span>{isSubmitting ? 'Submitting to Supabase...' : 'Save Vitals Entry'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
