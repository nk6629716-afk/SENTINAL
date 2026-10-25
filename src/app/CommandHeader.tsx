import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RotateCcw,
  Sun,
  Moon,
  Menu,
  MoreVertical,
} from 'lucide-react';
import { themeService, ThemeMode } from '../services/theme/themeService';
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeService.getMode());
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

  // Theme subscription
  useEffect(() => {
    const unsubscribe = themeService.subscribe((mode) => {
      setThemeMode(mode);
    });
    return unsubscribe;
  }, []);

  const handleThemeChange = (newMode: ThemeMode) => {
    themeService.setMode(newMode);
    setThemeMode(newMode);
  };

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
              color: '#FFFFFF',
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
              color: '#8D9A8F',
              fontWeight: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {moduleInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Notice Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            border: '1px solid #B77700',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: '0.72rem',
            color: '#FFB35A',
            fontWeight: 600,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Simulated training data
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
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
            marginRight: '2px',
          }}
        >
          {istTime}
        </div>

        {/* Desktop-only action controls */}
        <div className="header-actions-desktop" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {/* 3-way Theme Control (Sun, Half-circle, Moon) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '1px',
            }}
            role="group"
            aria-label="Theme mode switcher"
          >
            {/* Light: Sun */}
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              style={{
                background: themeMode === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: themeMode === 'light' ? '#FFB35A' : '#8D9A8F',
                border: 'none',
                padding: '3px 6px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Light Theme"
              aria-label="Light Theme"
              aria-pressed={themeMode === 'light'}
            >
              <Sun size={13} />
            </button>

            {/* Auto/System: Half-circle */}
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              style={{
                background: themeMode === 'system' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: themeMode === 'system' ? '#FFFFFF' : '#8D9A8F',
                border: 'none',
                padding: '3px 6px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Auto System Theme"
              aria-label="Auto System Theme"
              aria-pressed={themeMode === 'system'}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14V1z" />
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>

            {/* Dark: Moon */}
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              style={{
                background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: themeMode === 'dark' ? '#FF5A3C' : '#8D9A8F',
                border: 'none',
                padding: '3px 6px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Dark Theme (Red light)"
              aria-label="Dark Theme (Red light)"
              aria-pressed={themeMode === 'dark'}
            >
              <Moon size={13} />
            </button>
          </div>

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
              border: isOfflineMode ? '1.2px solid #A61B1B' : '1px solid rgba(255, 255, 255, 0.25)',
              background: isOfflineMode ? 'rgba(166, 27, 27, 0.25)' : 'transparent',
              color: isOfflineMode ? '#FF9494' : '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title={isOfflineMode ? 'Air-gap mode active (Click to restore online simulation)' : 'Simulate tactical radio blackout'}
          >
            {isOfflineMode ? <WifiOff size={13} color="#FF9494" /> : <Wifi size={13} color="#8D9A8F" />}
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
              color: '#FFFFFF',
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
            border: pendingSyncCount > 0 ? '1.2px solid #E8590C' : '1px solid rgba(255, 255, 255, 0.25)',
            background: pendingSyncCount > 0 ? '#E8590C' : 'transparent',
            color: '#FFFFFF',
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
                background: '#FFFFFF',
                color: '#E8590C',
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

        {/* Live SSE / Command Link Status Indicator (Strictly aligned with sidebar health card) */}
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
            color: isOfflineMode ? '#FF9494' : '#B4F0B4',
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
              background: isOfflineMode ? '#FF9494' : '#2D7A33',
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
              <div style={{ fontSize: '0.72rem', color: '#8D9A8F', marginBottom: '2px' }}>Theme</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleThemeChange('light'); }}
                  style={{ flex: 1, padding: '4px' }}
                >
                  <Sun size={12} /> Light
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleThemeChange('system'); }}
                  style={{ flex: 1, padding: '4px' }}
                >
                  Auto
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleThemeChange('dark'); }}
                  style={{ flex: 1, padding: '4px' }}
                >
                  <Moon size={12} /> Dark
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

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
