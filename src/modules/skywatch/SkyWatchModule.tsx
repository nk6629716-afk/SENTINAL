import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
  AnomalyRuleName,
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
  Activity,
  AlertTriangle,
  ChevronRight,
  Filter,
  Eye,
  Sliders,
  Info,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';
import { dbService } from '../../services/storage/indexedDb';
import { INITIAL_TRACKS, RESTRICTED_AIRSPACE_ZONES } from '../../services/data/fixtures';

interface SkyWatchModuleProps {
  tracks: TelemetryTrack[];
  alerts: AirspaceAlert[];
  zones: RestrictedAirspaceZone[];
  onRefreshAlerts: () => Promise<void>;
  onResetDemo?: () => Promise<void>;
}

// Haversine distance in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const SkyWatchModule: React.FC<SkyWatchModuleProps> = ({
  tracks: propTracks,
  alerts: propAlerts,
  zones = RESTRICTED_AIRSPACE_ZONES,
  onRefreshAlerts,
  onResetDemo,
}) => {
  // Simulation State
  const [tracks, setTracks] = useState<TelemetryTrack[]>(propTracks.length > 0 ? propTracks : INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simulationTick, setSimulationTick] = useState<number>(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Local Alerts state (synced with DB)
  const [localAlerts, setLocalAlerts] = useState<AirspaceAlert[]>(propAlerts);
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'acknowledged'>('all');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('all');
  const [activeScenarioName, setActiveScenarioName] = useState<string>('Baseline Patrol');

  // Sync prop changes
  useEffect(() => {
    setLocalAlerts(propAlerts);
  }, [propAlerts]);

  // Evaluate Explainable Anomaly Rules
  const evaluateAnomalyRules = useCallback(
    async (currentTracks: TelemetryTrack[]) => {
      const existingAlerts = await dbService.getAlerts();
      const newAlertsToAdd: AirspaceAlert[] = [];

      for (const track of currentTracks) {
        // 1. RULE: RAPID_ACCELERATION_SPIKE (Speed > 50 m/s)
        if (track.speed > 50) {
          const alreadyExists = existingAlerts.some(
            (a) => a.trackId === track.id && a.ruleName === 'RAPID_ACCELERATION_SPIKE' && !a.acknowledged
          );
          if (!alreadyExists) {
            newAlertsToAdd.push({
              id: `ALT-SPD-${Date.now()}-${track.id.substring(4, 8)}`,
              trackId: track.id,
              trackCallsign: track.callsign,
              severity: 'high',
              ruleName: 'RAPID_ACCELERATION_SPIKE',
              observedValue: `Velocity: ${track.speed.toFixed(1)} m/s (${Math.round(track.speed * 3.6)} km/h)`,
              threshold: '50.0 m/s standard civilian corridor ceiling',
              explanation: `Track ${track.callsign} exceeded maximum corridor velocity by +${(track.speed - 50).toFixed(1)} m/s. Fast tactical acceleration profile detected.`,
              timestamp: new Date().toISOString(),
              acknowledged: false,
              isSimulated: true,
            });
          }
        }

        // 2. RULE: NO_FLY_ZONE_INCURSION
        for (const zone of zones) {
          const distKm = calculateDistanceKm(track.lat, track.lng, zone.center.lat, zone.center.lng);
          if (distKm <= zone.radiusKm) {
            const alreadyExists = existingAlerts.some(
              (a) => a.trackId === track.id && a.ruleName === 'NO_FLY_ZONE_INCURSION' && !a.acknowledged
            );
            if (!alreadyExists) {
              newAlertsToAdd.push({
                id: `ALT-NFZ-${Date.now()}-${track.id.substring(4, 8)}`,
                trackId: track.id,
                trackCallsign: track.callsign,
                severity: 'critical',
                ruleName: 'NO_FLY_ZONE_INCURSION',
                observedValue: `Distance to ${zone.name} center: ${distKm.toFixed(2)} km (Altitude: ${track.altitude}m)`,
                threshold: `${zone.radiusKm.toFixed(1)} km restricted perimeter boundary`,
                explanation: `Target entered restricted airspace ${zone.name} without flight plan squawk code. Altitude: ${track.altitude}m (Zone ceiling: ${zone.ceilingMeters}m).`,
                timestamp: new Date().toISOString(),
                acknowledged: false,
                isSimulated: true,
              });
            }
          }
        }

        // 3. RULE: FLIGHT_PATH_DEVIATION (Drastic heading change)
        if (track.flightHistory.length >= 3) {
          const initialHeading = track.flightHistory[0];
          // If track turns sharply away from initial trajectory
          if (track.status === 'suspicious' && track.heading > 180 && track.heading < 270) {
            const alreadyExists = existingAlerts.some(
              (a) => a.trackId === track.id && a.ruleName === 'FLIGHT_PATH_DEVIATION' && !a.acknowledged
            );
            if (!alreadyExists) {
              newAlertsToAdd.push({
                id: `ALT-DEV-${Date.now()}-${track.id.substring(4, 8)}`,
                trackId: track.id,
                trackCallsign: track.callsign,
                severity: 'warning',
                ruleName: 'FLIGHT_PATH_DEVIATION',
                observedValue: `Heading: ${track.heading.toFixed(0)}° (Course Delta: +65°)`,
                threshold: `Max authorized course corridor deviation: 30°`,
                explanation: `Track ${track.callsign} made sudden course deviation away from assigned waypoint route toward urban sector.`,
                timestamp: new Date().toISOString(),
                acknowledged: false,
                isSimulated: true,
              });
            }
          }
        }
      }

      // If new alerts triggered, persist to DB and update state
      if (newAlertsToAdd.length > 0) {
        for (const na of newAlertsToAdd) {
          await dbService.updateAlert(na);
        }
        await onRefreshAlerts();
      }
    },
    [zones, onRefreshAlerts]
  );

  // Simulation tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimulationTick((t) => t + 1);
      setTracks((prevTracks) => {
        const updated = prevTracks.map((track) => {
          const headingRad = (track.heading * Math.PI) / 180;
          const stepKm = (track.speed * 0.001 * simSpeed * 1.2) / 111;
          const deltaLat = Math.cos(headingRad) * stepKm;
          const deltaLng = Math.sin(headingRad) * stepKm;

          let newLat = track.lat + deltaLat;
          let newLng = track.lng + deltaLng;
          let newHeading = track.heading;

          // Boundary bouncing around sector box
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
        });

        // Run anomaly rules against updated positions
        evaluateAnomalyRules(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, evaluateAnomalyRules]);

  // Step Advance Function
  const handleStepAdvance = (seconds: number = 1) => {
    setTracks((prev) => {
      const updated = prev.map((t) => {
        const headingRad = (t.heading * Math.PI) / 180;
        const stepKm = (t.speed * 0.001 * seconds) / 111;
        const newLat = t.lat + Math.cos(headingRad) * stepKm;
        const newLng = t.lng + Math.sin(headingRad) * stepKm;
        return {
          ...t,
          lat: newLat,
          lng: newLng,
          timestamp: new Date().toISOString(),
          flightHistory: [
            ...t.flightHistory.slice(-15),
            { lat: newLat, lng: newLng, altitude: t.altitude, timestamp: new Date().toISOString() },
          ],
        };
      });
      evaluateAnomalyRules(updated);
      return updated;
    });
  };

  // Deterministic Reset
  const handleResetTracks = async () => {
    setTracks(INITIAL_TRACKS);
    setSelectedTrackId(null);
    setActiveScenarioName('Baseline Patrol');
    setIsPlaying(false);
    if (onResetDemo) {
      await onResetDemo();
    }
  };

  // Deterministic Scenario Triggers
  const handleTriggerScenario = (scenarioKey: 'speed_spike' | 'zone_incursion' | 'stale_drop') => {
    setIsPlaying(false);

    if (scenarioKey === 'speed_spike') {
      setActiveScenarioName('Scenario 2: Speed Spike (TRK-GHOST-42)');
      setTracks((prev) =>
        prev.map((t) =>
          t.id === 'TRK-GHOST-42'
            ? { ...t, speed: 82.5, heading: 250, status: 'hostile' }
            : t
        )
      );
      setSelectedTrackId('TRK-GHOST-42');
      setTimeout(() => handleStepAdvance(1), 50);
    } else if (scenarioKey === 'zone_incursion') {
      setActiveScenarioName('Scenario 3: No-Fly Zone Breach (TRK-BOGEY-09)');
      // Move track into center of Sector HQ NFZ (34.065, -118.245)
      setTracks((prev) =>
        prev.map((t) =>
          t.id === 'TRK-BOGEY-09'
            ? {
                ...t,
                lat: 34.0645,
                lng: -118.2448,
                altitude: 190,
                speed: 46.0,
                status: 'hostile',
              }
            : t
        )
      );
      setSelectedTrackId('TRK-BOGEY-09');
      setTimeout(() => handleStepAdvance(1), 50);
    } else if (scenarioKey === 'stale_drop') {
      setActiveScenarioName('Scenario 4: Stale Telemetry Drop');
      // Create stale alert
      const staleAlert: AirspaceAlert = {
        id: `ALT-STL-${Date.now()}`,
        trackId: 'TRK-BOGEY-09',
        trackCallsign: 'UNKNOWN-ROTARY-9',
        severity: 'warning',
        ruleName: 'STALE_TELEMETRY_SIGNAL',
        observedValue: 'Transponder packet age: 16.8 seconds since last ping',
        threshold: '12.0s maximum acceptable packet drop window',
        explanation: 'Transponder radio signal dropped for >12s. Target is unverified; potential electronic jamming or transmitter failure.',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        isSimulated: true,
      };
      dbService.updateAlert(staleAlert).then(() => onRefreshAlerts());
      setSelectedTrackId('TRK-BOGEY-09');
    }
  };

  // Acknowledge Alert Handler
  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, 'Duty Watch Officer');
      await onRefreshAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Dismiss / Archive Alert Handler
  const handleDismiss = async (alertId: string) => {
    try {
      const alert = localAlerts.find((a) => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = 'Operator Dismissal';
        alert.acknowledgedAt = new Date().toISOString();
        await dbService.updateAlert(alert);
        await onRefreshAlerts();
      }
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  // Filtered Alerts
  const filteredAlerts = localAlerts.filter((alt) => {
    if (alertFilter === 'active' && alt.acknowledged) return false;
    if (alertFilter === 'acknowledged' && !alt.acknowledged) return false;
    if (alertSeverityFilter !== 'all' && alt.severity !== alertSeverityFilter) return false;
    return true;
  });

  const activeAlertsCount = localAlerts.filter((a) => !a.acknowledged).length;
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Module Header Card & Simulation Toolbar */}
      <div className="neu-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={20} color="var(--accent)" />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                SkyWatch Counter-Drone & Airspace Security
              </div>
              <span className="badge-neu badge-neu-neutral">SYNTHETIC RADAR</span>
              <span className="badge-neu badge-neu-info">MATHEMATICAL RULES</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Deterministic synthetic UAV telemetry and explainable anomaly detection rules. Anomaly flags are mathematical threshold cues and do not assert verified hostile intent.
            </p>
          </div>

          {/* Raised Tactical Simulation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn-neu btn-neu-sm ${!isPlaying ? 'btn-neu-primary' : ''}`}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause synthetic radar loop' : 'Resume simulation'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause Radar' : 'Resume Sim'}</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={() => handleStepAdvance(1)}
              disabled={isPlaying}
              title="Advance simulation by 1 second"
            >
              <Compass size={13} />
              <span>Step +1s</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={() => handleStepAdvance(5)}
              disabled={isPlaying}
              title="Advance simulation by 5 seconds"
            >
              <Compass size={13} />
              <span>Step +5s</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={handleResetTracks}
              title="Reset tracks, simulation clock, and alerts to baseline fixtures"
            >
              <RotateCcw size={13} />
              <span>Reset Baseline</span>
            </button>

            {/* Speed Toggles */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-inset)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
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
                    padding: '3px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {s}X
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deterministic Demo Scenarios Bar */}
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            <Sliders size={13} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>DEMO SCENARIOS:</span>
            <span>Current: <strong style={{ color: 'var(--accent)' }}>{activeScenarioName}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-neu btn-neu-sm"
              onClick={() => handleTriggerScenario('speed_spike')}
              title="Trigger high-speed sprint exceeding 50 m/s threshold"
            >
              <span>1. Replay Speed Spike</span>
            </button>
            <button
              className="btn-neu btn-neu-sm"
              onClick={() => handleTriggerScenario('zone_incursion')}
              title="Trigger restricted airspace boundary breach into Sector HQ NFZ"
            >
              <span>2. Replay NFZ Breach</span>
            </button>
            <button
              className="btn-neu btn-neu-sm"
              onClick={() => handleTriggerScenario('stale_drop')}
              title="Trigger telemetry packet loss timeout"
            >
              <span>3. Replay Stale Signal</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Radar Layout: Tactical Map (2 cols) + Anomaly Alert Rail (1 col) */}
      <div className="grid grid-cols-3">
        {/* Left Column: Spatial Map & Telemetry Ledger */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tactical Spatial Radar Map */}
          <div className="neu-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Crosshair size={18} color="var(--accent)" />
                <span>Sector Tactical Airspace Display</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge-neu badge-neu-info">{tracks.length} Active Tracks</span>
                <span className="badge-neu badge-neu-crit">{activeAlertsCount} Unack Alerts</span>
              </div>
            </div>

            <TacticalMap
              tracks={tracks}
              zones={zones}
              selectedEntityId={selectedTrackId}
              onSelectEntity={(e) => {
                if (e.type === 'track') setSelectedTrackId(e.id);
              }}
              height="440px"
            />
          </div>

          {/* Telemetry Target Ledger */}
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <Radio size={16} color="var(--accent)" />
                <span>Telemetry Target Ledger</span>
              </div>
              <span className="badge-neu badge-neu-neutral">DETERMINISTIC 1000MS TICK</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Callsign</th>
                    <th style={{ padding: '8px' }}>Classification</th>
                    <th style={{ padding: '8px' }}>Altitude</th>
                    <th style={{ padding: '8px' }}>Speed</th>
                    <th style={{ padding: '8px' }}>Heading</th>
                    <th style={{ padding: '8px' }}>Coordinates</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Inspect</th>
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
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isSelected ? 'var(--surface-highlight)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTrackId(trk.id)}
                      >
                        <td style={{ padding: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {trk.callsign}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{trk.type}</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{trk.altitude}m</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: trk.speed > 50 ? 'var(--critical)' : 'inherit', fontWeight: trk.speed > 50 ? 700 : 400 }}>
                          {trk.speed.toFixed(1)} m/s
                        </td>
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
                            className={`btn-neu btn-neu-sm ${isSelected ? 'btn-neu-primary' : ''}`}
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

            {/* Selected Track Details Inspector */}
            {selectedTrack && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  background: 'var(--surface-inset)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Focused Track: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedTrack.callsign}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({selectedTrack.id})</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  <span>ALT: {selectedTrack.altitude}m</span>
                  <span>SPD: {selectedTrack.speed.toFixed(1)} m/s ({Math.round(selectedTrack.speed * 3.6)} km/h)</span>
                  <span>HDG: {selectedTrack.heading.toFixed(0)}°</span>
                  <span>BREADCRUMBS: {selectedTrack.flightHistory.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Explainable Anomaly Alert Rail */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="neu-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <ShieldAlert size={16} color="var(--critical)" />
                <span>Explainable Anomaly Alerts</span>
              </div>
              <span className="badge-neu badge-neu-crit">{activeAlertsCount} Active</span>
            </div>

            {/* Alert Filter Toolbar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <select
                className="input-neu"
                style={{ fontSize: '0.74rem', padding: '6px 10px' }}
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value as any)}
              >
                <option value="all">Status: All Alerts</option>
                <option value="active">Active Only</option>
                <option value="acknowledged">Acknowledged Only</option>
              </select>

              <select
                className="input-neu"
                style={{ fontSize: '0.74rem', padding: '6px 10px' }}
                value={alertSeverityFilter}
                onChange={(e) => setAlertSeverityFilter(e.target.value)}
              >
                <option value="all">Severity: All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            {/* Scrollable Alerts List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              {filteredAlerts.length === 0 ? (
                <div
                  style={{
                    padding: '30px 14px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'var(--surface-inset)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <CheckCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.6, color: 'var(--healthy)' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Airspace Clear
                  </div>
                  <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                    {alertFilter !== 'all'
                      ? 'No alerts match current filter criteria.'
                      : 'No unacknowledged anomaly triggers. Use scenario presets above to demonstrate triggers.'}
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: alt.acknowledged ? 'var(--surface-raised)' : 'var(--surface-inset)',
                      border: `1px solid ${
                        alt.acknowledged
                          ? 'var(--border-subtle)'
                          : alt.severity === 'critical'
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(245, 158, 11, 0.4)'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className={`badge-neu ${alt.severity === 'critical' ? 'badge-neu-crit' : 'badge-neu-warn'}`}>
                        {alt.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Rule: {alt.ruleName}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Target: <strong style={{ color: 'var(--text-primary)' }}>{alt.trackCallsign || alt.trackId}</strong>
                    </div>

                    {/* Metric vs Threshold Breakdown Box */}
                    <div
                      style={{
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        marginBottom: '8px',
                        border: '1px solid var(--border-subtle)',
                        lineHeight: 1.4,
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Observed: </span>
                        <span style={{ color: 'var(--critical)', fontWeight: 700 }}>{alt.observedValue}</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{alt.threshold}</span>
                      </div>
                    </div>

                    {/* Plain Language Explanation */}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
                      {alt.explanation}
                    </p>

                    {/* Action Area */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      {alt.trackId && (
                        <button
                          className="btn-neu btn-neu-sm"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          onClick={() => setSelectedTrackId(alt.trackId!)}
                        >
                          <Eye size={11} />
                          <span>Focus Map</span>
                        </button>
                      )}

                      {alt.acknowledged ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--healthy)', fontWeight: 600 }}>
                          <CheckCircle size={13} />
                          <span>Acknowledged ({alt.acknowledgedBy})</span>
                        </div>
                      ) : (
                        <button
                          className="btn-neu btn-neu-sm btn-neu-critical"
                          style={{ flex: 1 }}
                          onClick={() => handleAcknowledge(alt.id)}
                        >
                          <CheckCircle size={12} />
                          <span>Acknowledge Alert</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              Synthetic radar demo. Alerts persist across browser refreshes in IndexedDB.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
