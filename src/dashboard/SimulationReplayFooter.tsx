import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface SimulationReplayFooterProps {
  isSimPaused?: boolean;
  onToggleSimulationPause?: () => Promise<void>;
  latestActivity?: string | null;
}

export const SimulationReplayFooter = React.memo<SimulationReplayFooterProps>(
  ({ isSimPaused = false, onToggleSimulationPause, latestActivity = null }) => {
    const [sessionStartTime] = useState<number>(() => Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Elapsed simulation counter isolated to footer to prevent whole-dashboard re-renders
    useEffect(() => {
      if (isSimPaused) return;
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }, [isSimPaused, sessionStartTime]);

    return (
      <footer
        className="bottom-replay-bar"
        style={{
          height: '32px',
          minHeight: '32px',
          borderTop: '1px solid rgba(115, 138, 101, 0.20)',
          background: 'rgba(18, 22, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Simulation Pause / Resume Button */}
          {onToggleSimulationPause && (
            <button
              type="button"
              className="btn-tactical"
              onClick={onToggleSimulationPause}
              style={{
                width: '22px',
                height: '22px',
                minWidth: '22px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isSimPaused ? 'Resume simulation' : 'Pause simulation'}
            >
              {isSimPaused ? <Play size={11} /> : <Pause size={11} />}
            </button>
          )}

          {/* Live Indicator & Elapsed Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className={isSimPaused ? 'dot-glowing-amber' : 'dot-glowing-green'} />
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isSimPaused ? 'var(--highlight-amber, #d4a373)' : 'var(--telemetry-green, #588157)',
                }}
              >
                {isSimPaused ? 'PAUSED' : 'LIVE_FEED'}
              </span>
            </div>

            <span
              style={{
                color: 'var(--text-secondary, #94a192)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.04em',
              }}
            >
              T+{elapsedSeconds}s
            </span>
          </div>

          <div className="meta-coord" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            SENTINEL TACTICAL SUITE // PROTOCOLS SECURED
          </div>
        </div>

        {/* Real Activity Ticker */}
        {latestActivity ? (
          <div
            style={{
              color: 'var(--text-secondary, #94a192)',
              fontSize: '0.68rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '50%',
            }}
          >
            {latestActivity}
          </div>
        ) : (
          <div className="meta-coord" style={{ fontSize: '0.62rem' }}>
            SECTOR OMEGA-ZETA // ALL SYSTEMS NOMINAL
          </div>
        )}
      </footer>
    );
  }
);
