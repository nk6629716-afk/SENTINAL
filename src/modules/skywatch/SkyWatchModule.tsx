import React, { useState, useEffect } from 'react';
import {
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
} from '@shared/types';
import {
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';
import {
  selectOpenAlerts,
  selectAlertCounts,
  selectRankedThreatQueue,
} from '../../selectors';
import { formatIST } from '../../utils/time';
import { formatRuleLabel } from '../../utils/rules';
import { formatAltitude, formatSpeed } from '../../utils/units';

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
  tracks,
  alerts,
  zones,
  onRefreshAlerts,
  onStepSimulation,
  onToggleSimulationPause,
  isSimPaused = false,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Single source of truth selectors
  const openAlerts = selectOpenAlerts(alerts);
  const alertStats = selectAlertCounts(alerts);
  const rankedThreats = selectRankedThreatQueue(tracks, zones, alerts);

  // Elapsed simulation session counter
  useEffect(() => {
    if (isSimPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimPaused, sessionStartTime]);

  // Set default selected track to highest threat if not set
  useEffect(() => {
    if (!selectedTrackId && rankedThreats.length > 0) {
      setSelectedTrackId(rankedThreats[0].id);
    }
  }, [rankedThreats, selectedTrackId]);

  const activeThreat =
    rankedThreats.find((t) => t.id === selectedTrackId || t.callsign === selectedTrackId) ||
    rankedThreats[0];

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, 'Duty Watch Officer');
      await onRefreshAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

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
            color: alertStats.openCount > 0 ? 'var(--color-crit)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {alertStats.openCount}
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
            color: alertStats.criticalCount > 0 ? 'var(--color-crit)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {alertStats.criticalCount}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Critical
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
          {zones.length}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Zones active
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
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Map Canvas with Unified Flex Toolbar */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
          <TacticalMap
            tracks={tracks}
            zones={zones}
            selectedEntityId={activeThreat?.id}
            onSelectEntity={(ent) => {
              if (ent.type === 'track') {
                setSelectedTrackId(ent.id);
              }
            }}
            height="100%"
            showRadarSweep={true}
            initialMode="radar"
            topLeftContent={metricsPanel}
          />
        </div>

        {/* Right Intel Pane: Airspace Threat Ledger & Real Alerts */}
        <aside className="intel-pane" aria-label="Airspace threat ledger">
          <div className="intel-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.95rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                Threat queue
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                {rankedThreats.length} contacts
              </span>
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
              Heuristic scoring · Simulated telemetry
            </div>
          </div>

          <div className="intel-body">
            {/* Highlighted Selected Threat Card */}
            {activeThreat && (
              <div
                style={{
                  border: `var(--border-width, 1.2px) solid ${
                    activeThreat.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)'
                  }`,
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
                    <span
                      style={{
                        color: activeThreat.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)',
                        fontSize: '1.2rem',
                      }}
                    >
                      ◆
                    </span>
                    <div>
                      <div style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {activeThreat.callsign}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {activeThreat.classificationLabel ? `${activeThreat.classificationLabel} • ` : ''}{activeThreat.reason}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="numeral"
                      style={{
                        fontSize: '1.6rem',
                        fontFamily: 'var(--font-numerals)',
                        fontWeight: 800,
                        color: activeThreat.score > 80 ? 'var(--color-crit)' : 'var(--color-warn)',
                        lineHeight: 1,
                      }}
                    >
                      {activeThreat.score}
                    </span>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Heuristic score</div>
                  </div>
                </div>

                {/* Real Kinematic Telemetry Data */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-line)',
                    paddingTop: '6px',
                    fontSize: '0.72rem',
                  }}
                >
                  <div>
                    <div className="numeral" style={{ fontWeight: 700, fontFamily: 'var(--font-numerals)' }}>
                      {formatAltitude(activeThreat.altitude)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Altitude (MSL)</div>
                  </div>
                  <div>
                    <div className="numeral" style={{ fontWeight: 700, fontFamily: 'var(--font-numerals)' }}>
                      {formatSpeed(activeThreat.speed)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Airspeed</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: activeThreat.hasGeofenceBreach ? 'var(--color-crit)' : 'var(--color-ok)',
                      }}
                    >
                      {activeThreat.hasGeofenceBreach ? 'BREACHED' : 'CLEAR'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Corridor status</div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Active Tracks in Queue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rankedThreats
                .filter((t) => t.id !== activeThreat?.id)
                .map((threat) => (
                  <div
                    key={threat.id}
                    onClick={() => setSelectedTrackId(threat.id)}
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
                      <span
                        style={{
                          color:
                            threat.severity === 'critical'
                              ? 'var(--color-crit)'
                              : threat.severity === 'high'
                              ? 'var(--color-warn)'
                              : 'var(--color-ok)',
                          fontSize: '1rem',
                        }}
                      >
                        {threat.severity === 'critical' ? '◆' : threat.severity === 'high' ? '✤' : '▲'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                          {threat.callsign}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {threat.reason}
                        </div>
                      </div>
                    </div>

                    <span
                      className="numeral"
                      style={{
                        fontSize: '1.15rem',
                        fontFamily: 'var(--font-numerals)',
                        fontWeight: 800,
                        color: threat.score > 80 ? 'var(--color-crit)' : 'var(--text-primary)',
                      }}
                    >
                      {threat.score}
                    </span>
                  </div>
                ))}
            </div>

            {/* Active Airspace Alerts Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  Active alerts ({openAlerts.length})
                </div>
              </div>

              {openAlerts.length === 0 ? (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--color-edge)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  All airspace alerts acknowledged. Corridor clear.
                </div>
              ) : (
                openAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      border: `1px solid ${
                        alert.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)'
                      }`,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-sheet)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            background: alert.severity === 'critical' ? 'var(--color-crit)' : 'var(--color-warn)',
                            color: '#FFFFFF',
                            borderRadius: '1px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {alert.severity}
                        </span>
                        <span
                          title={alert.ruleName}
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          {formatRuleLabel(alert.ruleName)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {alert.explanation || alert.observedValue}
                      </div>

                      <div
                        className="mono"
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-secondary)',
                          fontVariantNumeric: 'tabular-nums',
                          marginTop: '2px',
                        }}
                      >
                        {formatIST(alert.timestamp)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{ padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}
                    >
                      Acknowledge
                    </button>
                  </div>
                ))
              )}
            </div>
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
                {isSimPaused ? 'PAUSED' : 'LIVE RADAR'}
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

        {/* Real Activity Alert Ticker */}
        {openAlerts.length > 0 && (
          <div
            style={{
              color: 'var(--color-crit)',
              fontSize: '0.72rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
              fontWeight: 600,
            }}
          >
            Alert: {openAlerts[0].trackCallsign} breached {formatRuleLabel(openAlerts[0].ruleName)} ({formatIST(openAlerts[0].timestamp, { seconds: false })})
          </div>
        )}
      </footer>
    </div>
  );
};
