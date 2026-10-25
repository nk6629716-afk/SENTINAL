import React, { useState, useEffect } from 'react';
import {
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
} from '@shared/types';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Crosshair,
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
  const [selectedTrackId, setSelectedTrackId] = useState<string>('Track 07');

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

  const selectedTrack = tracks.find((t) => t.callsign === selectedTrackId || t.id === selectedTrackId) || tracks[0];

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
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Center / Left: Map Canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
          <TacticalMap
            tracks={tracks}
            zones={zones}
            selectedEntityId={selectedTrack?.id}
            onSelectEntity={(ent) => {
              if (ent.type === 'track') {
                setSelectedTrackId(ent.raw?.callsign || ent.id);
              }
            }}
            height="100%"
            showRadarSweep={true}
            initialMode="radar"
          />

          {/* Floating Top-Left Metrics Panel (Spec 02) */}
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
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {tracks.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Tracks monitored
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {activeAlerts.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Open alerts
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                142 ms
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Alert latency
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                38 m
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Prediction error
              </div>
            </div>
          </div>
        </div>

        {/* Right Intel Pane: Threat Queue & Alerts (Spec 02) */}
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
          aria-label="Airspace threat ledger"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.95rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Threat queue
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              Scores update every second
            </span>
          </div>

          {/* Focused Highlighted Threat Card (Track 07) */}
          <div
            style={{
              border: 'var(--border-width, 1.2px) solid var(--color-crit)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-paper)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-crit)', fontSize: '1.2rem' }}>◆</span>
                <div>
                  <div style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                    {selectedTrack?.callsign || 'Track 07'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Hostile drone, heading to Restricted R-2
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '1.6rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: 'var(--color-crit)',
                  lineHeight: 1,
                }}
              >
                92
              </span>
            </div>

            {/* Why This Score */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Why this score
              </div>
              {/* Stacked breakdown bar */}
              <div style={{ display: 'flex', height: '8px', borderRadius: '1px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: '37%', background: 'var(--color-crit)' }} />
                <div style={{ width: '24%', background: '#E8590C' }} />
                <div style={{ width: '20%', background: '#FFB35A' }} />
                <div style={{ width: '13%', background: '#F6F8F3' }} />
                <div style={{ width: '6%', background: '#8D9A8F' }} />
              </div>
              {/* Legend Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>■ Heading to zone</span>
                  <strong>34</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>■ No transponder</span>
                  <strong>22</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>■ Speed</span>
                  <strong>18</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>■ Altitude</span>
                  <strong>12</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>■ Loitering</span>
                  <strong>6</strong>
                </div>
              </div>
            </div>

            {/* Kinematic Estimates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-line)', paddingTop: '6px' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  1 min 40 s
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Time to breach</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  62 m
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Closest approach</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  38 m
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Error, last 10 min</div>
              </div>
            </div>
          </div>

          {/* Other Tracks in Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'Swarm U1 to U4', label: 'Swarm U1 to U4', desc: 'Loitering, no transponder', score: 74, icon: '✤', color: 'var(--color-warn)' },
              { id: 'Track 11', label: 'Track 11', desc: 'Closing on sector 33', score: 51, icon: '✤', color: 'var(--color-warn)' },
              { id: 'Airliner AC-48', label: 'Airliner AC-48', desc: 'Passing, outside zones', score: 12, icon: '▲', color: 'var(--color-ok)' },
            ].map((trk) => (
              <div
                key={trk.id}
                onClick={() => setSelectedTrackId(trk.id)}
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
                  <span style={{ color: trk.color, fontSize: '1rem' }}>{trk.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                      {trk.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      {trk.desc}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  {trk.score}
                </span>
              </div>
            ))}
          </div>

          {/* Alerts Section (Spec 02) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Alerts {activeAlerts.length}
            </div>

            {alerts.slice(0, 3).map((alert, i) => (
              <div
                key={alert.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-sheet)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: alert.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)',
                        border: `1px solid ${alert.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)'}`,
                        padding: '0 4px',
                        borderRadius: '1px',
                      }}
                    >
                      ■ {alert.severity ? alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1) : 'Critical'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {alert.ruleName || 'Entered Restricted R-2 altitude band'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    {alert.explanation || 'Track 07, 14:31:40 UTC'}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleAcknowledge(alert.id)}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Bottom Replay Bar (Spec 02) */}
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
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

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

          <div style={{ display: 'flex', alignItems: 'center', width: '320px', height: '8px', position: 'relative', margin: '0 12px' }}>
            <div style={{ width: '100%', height: '2px', background: 'var(--color-line)' }} />
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

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Alpha to Command: contact east of bridge, 2 hops, 380 ms
        </div>
      </footer>
    </div>
  );
};
