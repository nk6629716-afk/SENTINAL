import React, { useState, useEffect } from 'react';
import {
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
} from '@shared/types';
import {
  Crosshair,
  Play,
  Pause,
  RotateCcw,
  Compass,
  CheckCircle,
  Radio,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';

interface SkyWatchModuleProps {
  tracks: TelemetryTrack[];
  alerts: AirspaceAlert[];
  zones: RestrictedAirspaceZone[];
  onRefreshAlerts: () => Promise<void>;
  onStepSimulation?: () => Promise<void>;
  onToggleSimulationPause?: () => Promise<void>;
  isSimPaused?: boolean;
}

export const SkyWatchModule: React.FC<SkyWatchModuleProps> = ({
  tracks: initialTracks,
  alerts,
  zones,
  onRefreshAlerts,
  onStepSimulation,
  onToggleSimulationPause,
  isSimPaused = false,
}) => {
  const [tracks, setTracks] = useState<TelemetryTrack[]>(initialTracks);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  useEffect(() => {
    setTracks(initialTracks);
  }, [initialTracks]);

  // Simulation tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTracks((prevTracks) =>
        prevTracks.map((track) => {
          const headingRad = (track.heading * Math.PI) / 180;
          const stepKm = (track.speed * 0.001 * simSpeed * 1.5) / 111;
          const deltaLat = Math.cos(headingRad) * stepKm;
          const deltaLng = Math.sin(headingRad) * stepKm;

          let newLat = track.lat + deltaLat;
          let newLng = track.lng + deltaLng;
          let newHeading = track.heading;

          if (newLat > 34.085 || newLat < 34.035) {
            newHeading = (newHeading + 180) % 360;
            newLat = Math.max(34.036, Math.min(34.084, newLat));
          }
          if (newLng > -118.210 || newLng < -118.280) {
            newHeading = (newHeading + 180) % 360;
            newLng = Math.max(-118.279, Math.min(-118.211, newLng));
          }

          const newHistory = [
            ...track.flightHistory.slice(-15),
            { lat: newLat, lng: newLng, altitude: track.altitude, timestamp: new Date().toISOString() },
          ];

          return {
            ...track,
            lat: newLat,
            lng: newLng,
            heading: newHeading,
            flightHistory: newHistory,
            timestamp: new Date().toISOString(),
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  const handleStepOnce = async () => {
    if (onStepSimulation) {
      await onStepSimulation();
      return;
    }
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        lat: t.lat + 0.001 * Math.cos((t.heading * Math.PI) / 180),
        lng: t.lng + 0.001 * Math.sin((t.heading * Math.PI) / 180),
        timestamp: new Date().toISOString(),
      }))
    );
  };

  const handleTogglePlay = async () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (onToggleSimulationPause) {
      await onToggleSimulationPause();
    }
  };

  const handleResetTracks = () => {
    setTracks(initialTracks);
    setIsPlaying(false);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, 'Duty Watch Officer');
      await onRefreshAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Module Header Card & Simulation Toolbar */}
      <div className="neu-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={20} color="var(--accent)" />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                SkyWatch Counter-Drone & Airspace Station
              </div>
              <span className="badge-neu badge-neu-neutral">SIMULATED RADAR</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Deterministic synthetic UAV telemetry and explainable anomaly detection rules. Anomaly flags are review cues and do not establish hostile intent.
            </p>
          </div>

          {/* Raised Tactile Simulation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn-neu btn-neu-sm ${!isPlaying ? 'btn-neu-primary' : ''}`}
              onClick={handleTogglePlay}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause Radar' : 'Resume Sim'}</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={handleStepOnce}
              disabled={isPlaying}
            >
              <Compass size={13} />
              <span>Step 1s</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={handleResetTracks}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            {/* Speed Toggles in Recessed Pill Container */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset-sm)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px',
                border: '1px solid rgba(210, 216, 225, 0.4)',
              }}
            >
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  style={{
                    background: simSpeed === s ? 'var(--accent)' : 'transparent',
                    color: simSpeed === s ? '#FFFFFF' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    padding: '3px 9px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s}X
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Radar Map (2 cols) & Anomaly Alert Rail (1 col) */}
      <div className="grid grid-cols-3">
        {/* Left Column: Map & Telemetry Ledger */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="neu-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crosshair size={18} color="var(--accent)" />
                <span>Sector Tactical Airspace Display</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge-neu badge-neu-info">{tracks.length} Active Tracks</span>
                <span className="badge-neu badge-neu-crit">{activeAlerts.length} Unack Alerts</span>
              </div>
            </div>

            <TacticalMap
              tracks={tracks}
              zones={zones}
              selectedEntityId={selectedTrackId}
              onSelectEntity={(e) => {
                if (e.type === 'track') setSelectedTrackId(e.id);
              }}
              height="450px"
            />
          </div>

          {/* Telemetry Target Ledger */}
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={16} color="var(--accent)" />
                <span>Telemetry Target Ledger</span>
              </div>
              <span className="badge-neu badge-neu-neutral">1000MS INTERVAL</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Callsign</th>
                    <th style={{ padding: '8px' }}>Classification</th>
                    <th style={{ padding: '8px' }}>Altitude</th>
                    <th style={{ padding: '8px' }}>Speed</th>
                    <th style={{ padding: '8px' }}>Heading</th>
                    <th style={{ padding: '8px' }}>Coordinates</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((trk) => {
                    const isSelected = selectedTrackId === trk.id;
                    const isHostile = trk.status === 'hostile' || trk.status === 'suspicious';
                    return (
                      <tr
                        key={trk.id}
                        style={{
                          borderBottom: '1px solid rgba(210, 216, 225, 0.4)',
                          background: isSelected ? 'var(--surface-inset)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTrackId(trk.id)}
                      >
                        <td style={{ padding: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>{trk.callsign}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{trk.type}</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{trk.altitude}m</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{trk.speed} m/s</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{trk.heading.toFixed(0)}°</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {trk.lat.toFixed(4)}, {trk.lng.toFixed(4)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span className={`badge-neu ${isHostile ? 'badge-neu-crit' : 'badge-neu-ok'}`} style={{ fontSize: '0.65rem' }}>
                            {trk.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            className="btn-neu btn-neu-sm"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrackId(trk.id);
                            }}
                          >
                            Focus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Explainable Anomaly Rail */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="neu-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} color="var(--critical)" />
                <span>Explainable Anomaly Alerts</span>
              </div>
              <span className="badge-neu badge-neu-crit">{activeAlerts.length} Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: alt.acknowledged ? 'var(--surface-raised)' : 'var(--surface-inset)',
                    boxShadow: alt.acknowledged ? 'var(--shadow-raised-sm)' : 'var(--shadow-inset-sm)',
                    border: '1px solid rgba(210, 216, 225, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={`badge-neu ${alt.severity === 'critical' ? 'badge-neu-crit' : 'badge-neu-warn'}`}>
                      {alt.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {new Date(alt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Rule: {alt.ruleName}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Target: <strong style={{ color: 'var(--text-primary)' }}>{alt.trackCallsign}</strong>
                  </div>

                  {/* Explicit Metric vs Threshold breakdown */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Observed: </span>
                      <span style={{ color: 'var(--critical)', fontWeight: 700 }}>{alt.observedValue}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
                      <span>{alt.threshold}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
                    {alt.explanation}
                  </p>

                  <div>
                    {alt.acknowledged ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--healthy)', fontWeight: 700 }}>
                        <CheckCircle size={14} />
                        <span>Acknowledged by {alt.acknowledgedBy}</span>
                      </div>
                    ) : (
                      <button
                        className="btn-neu btn-neu-sm btn-neu-critical"
                        style={{ width: '100%' }}
                        onClick={() => handleAcknowledge(alt.id)}
                      >
                        <CheckCircle size={13} />
                        <span>Acknowledge Threat Alert</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '14px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Synthetic radar demonstration. Alerts represent mathematical threshold triggers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
