import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RotateCcw,
  Menu,
  MoreVertical,
} from 'lucide-react';
import { getLiveIST } from '../utils/time';

export interface CommandHeaderProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  pendingSyncCount: number;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  onTriggerSync: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  isSyncing: boolean;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  isHeaderCompact?: boolean;
  onToggleHeaderCompact?: () => void;
  isHeaderMinimized?: boolean;
  onToggleHeaderMinimized?: () => void;
  realtimeStatus?: 'connected' | 'reconnecting' | 'disconnected' | 'stale';
  lastEventTimestamp?: string | null;
  simSpeed?: number;
  onSetSimSpeed?: (speed: 1 | 2 | 5) => void;
  onToggleSimPause?: () => void;
  isSimPaused?: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  activeModule,
  pendingSyncCount,
  isOfflineMode,
  onToggleOffline,
  onTriggerSync,
  onResetDemo,
  isSyncing,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  isHeaderCompact = false,
  onToggleHeaderCompact,
  isHeaderMinimized = false,
  onToggleHeaderMinimized,
  realtimeStatus = 'disconnected',
  lastEventTimestamp = null,
}) => {
  const [istTime, setIstTime] = useState<string>(() => getLiveIST());
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  // Live IST Clock (ticking each second in Asia/Kolkata UTC+05:30)
  useEffect(() => {
    const update = () => {
      setIstTime(getLiveIST());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard':
        return {
          title: 'Overview & COP',
          subtitle: 'Common operational picture and live situation',
        };
      case 'fieldlink':
        return {
          title: 'FieldLink Reports',
          subtitle: 'Offline-first ground incident intake',
        };
      case 'skywatch':
        return {
          title: 'SkyWatch Airspace',
          subtitle: 'Airspace surveillance and geofence alerts',
        };
      case 'geointel':
        return {
          title: 'GeoIntel Recon',
          subtitle: 'Satellite change detection and analyst review',
        };
      case 'mediroute':
        return {
          title: 'MediRoute Logistics',
          subtitle: 'Triage scoring and evacuation routing',
        };
    }
  };

  const moduleInfo = getModuleTitle();

  return (
    <header className="command-header" aria-label="Command Header">
      {/* Left: Mobile Toggle & Module Name + Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            className="btn btn-sm btn-mobile-nav"
            onClick={onToggleMobileMenu}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              padding: '4px 8px',
            }}
            aria-label="Toggle mobile menu"
          >
            <Menu size={16} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0, whiteSpace: 'nowrap' }}>
          <h1
            style={{
              fontSize: '0.95rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-primary, #e9ece9)',
              letterSpacing: '0.04em',
              margin: 0,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {moduleInfo.title}
          </h1>
          <span
            className="header-subtitle"
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary, #94a192)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.03em',
            }}
          >
            // {moduleInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Tactical Status Indicators & Coordinates Readout */}
      <div className="header-notice-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div className="tactical-badge tactical-badge-online">
          <span className="dot-glowing-green" />
          <span>SYS_ONLINE</span>
        </div>
        <div className="tactical-badge tactical-badge-secure" style={{ display: 'none' }} id="hdr-secure-pill">
          SECURE
        </div>
        <div
          className="meta-coord"
          style={{
            fontSize: '0.65rem',
            background: 'rgba(18, 22, 20, 0.60)',
            border: '1px solid rgba(115, 138, 101, 0.20)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}
        >
          28.6139° N, 77.2090° E // OMEGA-ZETA
        </div>
      </div>
      {/* Right: Controls Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Live Clock with Telemetry Monospace */}
        <div
          className="clock-value"
          style={{
            fontSize: '0.80rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--text-primary, #e9ece9)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            background: 'rgba(18, 22, 20, 0.60)',
            border: '1px solid rgba(115, 138, 101, 0.20)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {istTime}
        </div>

        {/* Desktop-only action controls */}
        <div className="header-actions-desktop" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {/* Go Offline / Offline Mode Button */}
          <button
            type="button"
            className="btn-tactical"
            onClick={onToggleOffline}
            style={{
              padding: '4px 10px',
              fontSize: '0.68rem',
              borderColor: isOfflineMode ? 'rgba(212, 163, 115, 0.45)' : 'rgba(115, 138, 101, 0.25)',
              background: isOfflineMode ? 'rgba(212, 163, 115, 0.12)' : 'rgba(24, 29, 26, 0.60)',
              color: isOfflineMode ? 'var(--highlight-amber, #d4a373)' : 'var(--text-secondary, #94a192)',
            }}
            title={isOfflineMode ? 'Air-gap mode active (Click to restore online simulation)' : 'Simulate tactical radio blackout'}
          >
            {isOfflineMode ? <WifiOff size={13} color="var(--highlight-amber, #d4a373)" /> : <Wifi size={13} color="var(--text-secondary, #94a192)" />}
            <span>{isOfflineMode ? 'BLACKOUT_ACTIVE' : 'GO_OFFLINE'}</span>
          </button>

          {/* Reset Scenario Button */}
          <button
            type="button"
            className="btn-tactical"
            onClick={onResetDemo}
            style={{
              padding: '4px 10px',
              fontSize: '0.68rem',
              color: 'var(--text-secondary, #94a192)',
            }}
            title="Reset scenario to deterministic baseline fixtures"
          >
            <RotateCcw size={12} />
            <span>RESET_SCENARIO</span>
          </button>
        </div>

        {/* Sync Button */}
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
          className={pendingSyncCount > 0 ? 'btn-tactical btn-tactical-olive' : 'btn-tactical'}
          style={{
            padding: '4px 12px',
            fontSize: '0.70rem',
            opacity: isOfflineMode ? 0.45 : 1,
            cursor: pendingSyncCount > 0 ? 'pointer' : 'default',
          }}
          title="Synchronize local outbox queue"
        >
          <span>{isSyncing ? 'SYNCING...' : 'SYNC_OUTBOX'}</span>
          {pendingSyncCount > 0 && (
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#121614',
                color: 'var(--highlight-amber, #d4a373)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
                border: '1px solid #d4a373',
              }}
            >
              {pendingSyncCount}
            </span>
          )}
        </button>

        {/* Live SSE / Command Link Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isOfflineMode ? 'var(--status-critical, #FF3B5C)' : 'var(--status-safe, #00E676)',
            height: '22px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={
            isOfflineMode
              ? 'Telemetry Bus: Offline Simulation Active'
              : 'Telemetry Bus: Command Link Active & Realtime Stream Synchronized'
          }
        >
          <span
            className={isOfflineMode ? 'status-dot status-dot-crit' : 'status-dot status-dot-live'}
          />
          <span>
            {isOfflineMode ? 'OFFLINE' : 'LINK ACTIVE'}
          </span>
        </div>

        {/* Mobile Overflow Menu Button (under 768px) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-sm header-overflow-trigger"
            onClick={() => setIsOverflowOpen(!isOverflowOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              padding: '4px 6px',
            }}
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical size={14} />
          </button>

          {isOverflowOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--color-strip)',
                border: '1px solid var(--color-edge)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 100,
                minWidth: '180px',
              }}
              onClick={() => setIsOverflowOpen(false)}
            >
              <button
                type="button"
                className="btn btn-sm"
                onClick={(e) => { e.stopPropagation(); onToggleOffline(); }}
                style={{ justifyContent: 'flex-start', padding: '6px 8px' }}
              >
                {isOfflineMode ? <Wifi size={13} /> : <WifiOff size={13} />}
                <span>{isOfflineMode ? 'Switch to Online' : 'Go Offline'}</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={(e) => { e.stopPropagation(); onResetDemo(); }}
                style={{ justifyContent: 'flex-start', padding: '6px 8px' }}
              >
                <RotateCcw size={13} />
                <span>Reset scenario</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
