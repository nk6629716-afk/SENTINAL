import React, { useState, useEffect, useRef } from 'react';
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
  FastForward,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Eye,
  Radio,
  Clock,
  Compass,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';

interface SkyWatchModuleProps {
  tracks: TelemetryTrack[];
  alerts: AirspaceAlert[];
  zones: RestrictedAirspaceZone[];
  onRefreshAlerts: () => Promise<void>;
}

export const SkyWatchModule: React.FC<SkyWatchModuleProps> = ({
  tracks: initialTracks,
  alerts,
  zones,
  onRefreshAlerts,
}) => {
  const [tracks, setTracks] = useState<TelemetryTrack[]>(initialTracks);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    setTracks(initialTracks);
  }, [initialTracks]);

  // Simulation tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTracks((prevTracks) =>
        prevTracks.map((track) => {
          // Advance track position along its heading vector
          const headingRad = (track.heading * Math.PI) / 180;
          // Approximate speed to degree offset
          const stepKm = (track.speed * 0.001 * simSpeed * 1.5) / 111;
          const deltaLat = Math.cos(headingRad) * stepKm;
          const deltaLng = Math.sin(headingRad) * stepKm;

          let newLat = track.lat + deltaLat;
          let newLng = track.lng + deltaLng;
          let newHeading = track.heading;

          // Boundary bounce or turn to stay inside sector
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

  const handleStepOnce = () => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        lat: t.lat + 0.001 * Math.cos((t.heading * Math.PI) / 180),
        lng: t.lng + 0.001 * Math.sin((t.heading * Math.PI) / 180),
        timestamp: new Date().toISOString(),
      }))
    );
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
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid #a855f7',
          background: 'linear-gradient(90deg, rgba(14, 20, 36, 0.9) 0%, rgba(10, 16, 28, 0.8) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={22} color="#a855f7" />
              <h2 style={{ fontSize: '1.25rem' }}>SkyWatch Counter-Drone & Airspace Security</h2>
              <span className="badge badge-simulated">SYNTHETIC RADAR SIMULATION</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Deterministic synthetic UAV tracking with transparent anomaly detection rules (No-Fly Zone incursion, speed surge, flight path deviation).
              All telemetry and threat classifications are simulated for hackathon evaluation.
            </p>
          </div>

          {/* Simulation Control Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`btn btn-sm ${isPlaying ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause Radar' : 'Resume Sim'}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleStepOnce}
              disabled={isPlaying}
              title="Advance simulation by 1 step"
            >
              <Compass size={14} />
              <span>Step 1s</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetTracks}
              title="Reset tracks to initial deterministic seed"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            {/* Speed Multiplier */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(21, 30, 52, 0.9)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '2px',
              }}
            >
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  style={{
                    background: simSpeed === s ? 'var(--accent-cyan)' : 'transparent',
                    color: simSpeed === s ? '#070a12' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Map + Radar, Right Telemetry & Alerts */}
      <div className="grid grid-cols-3">
        {/* Left Column (2 spans): Tactical Airspace Map */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">
                <Crosshair size={18} color="var(--accent-cyan)" />
                <span>Sector Tactical Airspace Display</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-cyan">{tracks.length} ACTIVE TRACKS</span>
                <span className="badge badge-danger">{activeAlerts.length} UNACK ALERTS</span>
              </div>
            </div>

            <TacticalMap
              tracks={tracks}
              zones={zones}
              selectedEntityId={selectedTrackId}
              onSelectEntity={(e) => {
                if (e.type === 'track') setSelectedTrackId(e.id);
              }}
              height="460px"
            />
          </div>

          {/* Active Live Telemetry Tracks Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Radio size={18} color="#a855f7" />
                <span>Track Telemetry Feed</span>
              </div>
              <span className="badge badge-simulated">1000ms TELEMETRY INTERVAL</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>CALLSIGN</th>
                    <th style={{ padding: '8px' }}>TYPE</th>
                    <th style={{ padding: '8px' }}>ALTITUDE</th>
                    <th style={{ padding: '8px' }}>SPEED</th>
                    <th style={{ padding: '8px' }}>HEADING</th>
                    <th style={{ padding: '8px' }}>COORDINATES</th>
                    <th style={{ padding: '8px' }}>STATUS</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>ACTION</th>
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
                          borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                          background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTrackId(trk.id)}
                      >
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#ffffff' }}>{trk.callsign}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{trk.type}</td>
                        <td style={{ padding: '8px', color: 'var(--accent-cyan)' }}>{trk.altitude}m</td>
                        <td style={{ padding: '8px' }}>{trk.speed} m/s</td>
                        <td style={{ padding: '8px' }}>{trk.heading.toFixed(0)}°</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                          {trk.lat.toFixed(4)}, {trk.lng.toFixed(4)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span className={`badge ${isHostile ? 'badge-danger' : 'badge-nominal'}`}>
                            {trk.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
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

        {/* Right Column: Explainable Anomaly Alert Feed & Rule Explanations */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={18} color="var(--status-danger)" />
                <span>Explainable Anomaly Alerts</span>
              </div>
              <span className="badge badge-danger">{activeAlerts.length} PENDING</span>
            </div>

            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                No active airspace alerts detected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map((alt) => {
                  return (
                    <div
                      key={alt.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: alt.acknowledged
                          ? 'rgba(14, 20, 36, 0.4)'
                          : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${
                          alt.acknowledged ? 'var(--border-subtle)' : 'var(--border-danger)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span
                          className={`badge ${
                            alt.severity === 'critical'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {alt.severity.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {new Date(alt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', marginBottom: '4px' }}>
                        Rule: {alt.ruleName}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginBottom: '8px' }}>
                        Target: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{alt.trackCallsign}</span>
                      </div>

                      {/* Explicit Metric vs Threshold breakdown (Required by plan) */}
                      <div
                        style={{
                          background: 'rgba(7, 10, 18, 0.8)',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          marginBottom: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.08)',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Observed: </span>
                          <span style={{ color: '#ffffff' }}>{alt.observedValue}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
                          <span style={{ color: 'var(--text-cyan)' }}>{alt.threshold}</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {alt.explanation}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {alt.acknowledged ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-nominal)', fontSize: '0.72rem' }}>
                            <CheckCircle size={13} />
                            <span>Acknowledged by {alt.acknowledgedBy}</span>
                          </div>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ width: '100%', fontSize: '0.72rem' }}
                            onClick={() => handleAcknowledge(alt.id)}
                          >
                            <CheckCircle size={13} />
                            <span>Acknowledge Threat Alert</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
