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
              fontSize: '1.05rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--text-primary, #F0FDF4)',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {moduleInfo.title}
          </h1>
          <span
            className="header-subtitle"
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-secondary, #869E96)',
              fontWeight: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {moduleInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Right: Controls Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Live IST Clock */}
        <div
          className="clock-value"
          style={{
            fontSize: '0.82rem',
            fontFamily: 'var(--font-numerals)',
            fontWeight: 700,
            color: 'var(--text-primary, #F0FDF4)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
            marginRight: '2px',
          }}
        >
          {istTime}
        </div>

        {/* Desktop-only action controls */}
        <div className="header-actions-desktop" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {/* Go Offline / Offline Mode Button */}
          <button
            type="button"
            onClick={onToggleOffline}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: 'var(--radius-sm)',
              border: isOfflineMode ? '1.2px solid rgba(255, 59, 92, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              background: isOfflineMode ? 'rgba(255, 59, 92, 0.15)' : 'transparent',
              color: isOfflineMode ? '#FF3B5C' : '#F0FDF4',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title={isOfflineMode ? 'Air-gap mode active (Click to restore online simulation)' : 'Simulate tactical radio blackout'}
          >
            {isOfflineMode ? <WifiOff size={13} color="#FF3B5C" /> : <Wifi size={13} color="#869E96" />}
            <span>{isOfflineMode ? 'Offline Mode' : 'Go offline'}</span>
          </button>

          {/* Reset Scenario Button */}
          <button
            type="button"
            onClick={onResetDemo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'transparent',
              color: '#F0FDF4',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Reset scenario to deterministic baseline fixtures"
          >
            <RotateCcw size={13} />
            <span>Reset scenario</span>
          </button>
        </div>

        {/* Sync Button */}
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            border: pendingSyncCount > 0 ? '1.2px solid #00E676' : '1px solid rgba(255, 255, 255, 0.25)',
            background: pendingSyncCount > 0 ? '#00E676' : 'transparent',
            color: pendingSyncCount > 0 ? '#060A09' : '#F0FDF4',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: pendingSyncCount > 0 ? 'pointer' : 'default',
            opacity: isOfflineMode ? 0.45 : 1,
          }}
          title="Synchronize local outbox queue"
        >
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          {pendingSyncCount > 0 && (
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#060A09',
                color: '#00E676',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
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
            gap: '6px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: isOfflineMode ? '#FF3B5C' : '#00E676',
            height: '24px',
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
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOfflineMode ? '#FF3B5C' : '#00E676',
            }}
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
