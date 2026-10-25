import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  Clock,
  Sun,
  Moon,
  Monitor,
  Menu,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  Check,
} from 'lucide-react';
import { themeService, ThemeMode } from '../services/theme/themeService';

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
  const [currentTime, setCurrentTime] = useState<string>('');
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeService.getMode());
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const overflowRef = useRef<HTMLDivElement>(null);

  // IST clock update (Asia/Kolkata, UTC+05:30)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const timeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      setCurrentTime(`${dateStr} ${timeStr} IST`);
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

  // Resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click-outside and Escape listener for overflow menu
  useEffect(() => {
    if (!isOverflowOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOverflowOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOverflowOpen]);

  const handleThemeChange = (newMode: ThemeMode) => {
    themeService.setMode(newMode);
    setThemeMode(newMode);
  };

  const getModuleInfo = () => {
    switch (activeModule) {
      case 'dashboard':
        return {
          code: 'COP',
          tag: 'OPERATIONAL LEVEL 1',
          title: 'Common Operational Picture',
          subtitle: 'Multi-domain threat synthesis, tactical asset map, and incident response overview',
        };
      case 'fieldlink':
        return {
          code: 'FLK',
          tag: 'TACTICAL COMMUNICATIONS',
          title: 'FieldLink Ground Reports',
          subtitle: 'Offline-first asynchronous incident reporting and resilient outbox dispatch',
        };
      case 'skywatch':
        return {
          code: 'SKY',
          tag: 'AIR DEFENSE & RADAR',
          title: 'SkyWatch Airspace Security',
          subtitle: 'Real-time telemetry tracking, geofence monitoring, and explainable rule heuristics',
        };
      case 'geointel':
        return {
          code: 'GEO',
          tag: 'GEOSPATIAL INTELLIGENCE',
          title: 'GeoIntel Reconnaissance',
          subtitle: 'Multi-spectral satellite difference analysis and analyst review candidate workflow',
        };
      case 'mediroute':
        return {
          code: 'MED',
          tag: 'CASUALTY & EVACUATION',
          title: 'MediRoute Logistics',
          subtitle: 'Algorithmic START triage justification and hazard-aware Dijkstra corridor routing',
        };
    }
  };

  const moduleInfo = getModuleInfo();
  const isMobile = windowWidth < 600;
  const isTablet = windowWidth < 900;

  // 1. Minimized Mode (38px strip - clear, prominent & easy to read)
  if (isHeaderMinimized) {
    return (
      <header
        className="command-header minimized"
        aria-label="Command Header Minimized Strip"
        style={{
          height: '38px',
          minHeight: '38px',
          maxHeight: '38px',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
              boxShadow: `0 0 8px ${isOfflineMode ? 'var(--critical)' : 'var(--healthy)'}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: 'var(--accent)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              background: 'var(--surface-inset)',
              padding: '0 10px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxSizing: 'border-box',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}
          >
            <span style={{ display: 'inline-block', lineHeight: 1, transform: 'translateY(0.5px)' }}>
              SENTINEL v2.6
            </span>
          </span>
          <span
            className="badge-neu badge-neu-info"
            style={{
              fontSize: '0.64rem',
              padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
            }}
          >
            {moduleInfo.code}
          </span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {moduleInfo.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              background: 'var(--surface-inset)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Clock size={11} color="var(--accent)" />
            {currentTime ? currentTime.substring(11) : ''}
          </span>
          <button
            type="button"
            className="btn-neu btn-neu-sm btn-neu-primary"
            onClick={onToggleHeaderMinimized}
            aria-label="Restore full header"
            title="Restore full header (56px)"
            style={{
              padding: '3px 12px',
              height: '26px',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <ChevronDown size={14} />
            <span>Restore Header</span>
          </button>
        </div>
      </header>
    );
  }

  // 2. Normal (56px) or Compact (44px) Mode
  return (
    <header className="command-header" aria-label="Command Header">
      {/* Left: Navigation toggles, SENTINEL badge, Module Title & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Mobile Hamburger toggle (< 900px) */}
        {isTablet && onToggleMobileMenu && (
          <button
            type="button"
            className="btn-neu header-icon-btn btn-mobile-nav"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation drawer"
            title="Open navigation menu"
          >
            <Menu size={16} />
          </button>
        )}

        {/* SENTINEL v2.6 Badge */}
        <span
          style={{
            height: '26px',
            padding: '0 10px',
            display: isMobile ? 'none' : 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--accent)',
            background: 'var(--surface-inset)',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '0.04em',
            lineHeight: 1,
            flexShrink: 0,
            boxShadow: '0 0 8px var(--accent-light)',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
              boxShadow: `0 0 6px ${isOfflineMode ? 'var(--critical)' : 'var(--healthy)'}`,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              display: 'inline-block',
              lineHeight: 1,
              transform: 'translateY(0.5px)',
            }}
          >
            SENTINEL v2.6
          </span>
        </span>

        {/* Module Title & Subtitle */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1
              style={{
                fontSize: isHeaderCompact ? '1.05rem' : '1.2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {moduleInfo.title}
            </h1>
            <span
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              [{moduleInfo.code}]
            </span>
          </div>

          {!isHeaderCompact && (
            <p
              className="header-subtitle"
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                margin: '1px 0 0 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {moduleInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Grouped controls with consistent 8px gaps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Theme Segmented Switcher (Visible on desktop >= 900px) */}
        {!isTablet && (
          <div
            className="neu-inset"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: 'var(--radius-pill)',
              gap: '2px',
              height: '32px',
            }}
            role="group"
            aria-label="Appearance Mode"
          >
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              title="System Theme (Follows OS)"
              aria-label="System Theme"
              style={{
                border: 'none',
                background: themeMode === 'system' ? 'var(--surface-raised)' : 'transparent',
                boxShadow: themeMode === 'system' ? 'var(--shadow-raised-sm)' : 'none',
                color: themeMode === 'system' ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-pill)',
                width: '26px',
                height: '26px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Monitor size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              title="Light Theme"
              aria-label="Light Theme"
              style={{
                border: 'none',
                background: themeMode === 'light' ? 'var(--surface-raised)' : 'transparent',
                boxShadow: themeMode === 'light' ? 'var(--shadow-raised-sm)' : 'none',
                color: themeMode === 'light' ? 'var(--warning)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-pill)',
                width: '26px',
                height: '26px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Sun size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              title="Dark Theme"
              aria-label="Dark Theme"
              style={{
                border: 'none',
                background: themeMode === 'dark' ? 'var(--surface-raised)' : 'transparent',
                boxShadow: themeMode === 'dark' ? 'var(--shadow-raised-sm)' : 'none',
                color: themeMode === 'dark' ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-pill)',
                width: '26px',
                height: '26px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Moon size={13} />
            </button>
          </div>
        )}

        {/* Live SSE Stream Status Indicator */}
        <div
          className="neu-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 9px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: isOfflineMode
              ? 'var(--critical)'
              : realtimeStatus === 'connected'
              ? 'var(--healthy)'
              : realtimeStatus === 'reconnecting'
              ? 'var(--warning)'
              : realtimeStatus === 'stale'
              ? 'var(--warning)'
              : 'var(--text-muted)',
            height: '32px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={`Realtime Data Stream: ${isOfflineMode ? 'OFFLINE SIMULATION' : realtimeStatus.toUpperCase()}${lastEventTimestamp ? ` (Updated ${new Date(lastEventTimestamp).toLocaleTimeString()})` : ''}`}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isOfflineMode
                ? 'var(--critical)'
                : realtimeStatus === 'connected'
                ? 'var(--healthy)'
                : realtimeStatus === 'reconnecting'
                ? 'var(--warning)'
                : realtimeStatus === 'stale'
                ? 'var(--warning)'
                : 'var(--text-muted)',
              boxShadow: realtimeStatus === 'connected' && !isOfflineMode ? '0 0 6px var(--healthy)' : 'none',
            }}
          />
          <span>
            {isOfflineMode
              ? 'OFFLINE'
              : realtimeStatus === 'connected'
              ? 'LIVE SSE'
              : realtimeStatus === 'reconnecting'
              ? 'RECONNECT'
              : realtimeStatus === 'stale'
              ? 'STALE'
              : 'DISCONNECTED'}
          </span>
        </div>

        {/* Live IST Clock (Always visible; compact format on mobile) */}
        <div
          className="neu-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            height: '32px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title="Live IST Synchronized Clock (UTC+05:30)"
        >
          <Clock size={12} color="var(--accent)" />
          <span>{isMobile ? (currentTime ? currentTime.substring(11, 16) + ' IST' : '') : currentTime}</span>
        </div>

        {/* Go Offline / Offline Mode Icon Button (Visible on screens >= 600px) */}
        {!isMobile && (
          <button
            type="button"
            className={`btn-neu header-icon-btn ${isOfflineMode ? 'btn-neu-critical' : ''}`}
            onClick={onToggleOffline}
            aria-label={isOfflineMode ? 'Restore online telemetry link' : 'Simulate remote offline blackout'}
            title={
              isOfflineMode
                ? 'Offline buffer active (Click to go online)'
                : 'Command link active (Click to simulate offline)'
            }
          >
            {isOfflineMode ? <WifiOff size={15} color="var(--critical)" /> : <Wifi size={15} />}
          </button>
        )}

        {/* Sync Outbox Button (Visible on screens >= 600px) */}
        {!isMobile && (
          <button
            type="button"
            className={`btn-neu header-icon-btn ${pendingSyncCount > 0 ? 'btn-neu-primary' : ''}`}
            onClick={onTriggerSync}
            disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
            aria-label={`Synchronize pending outbox (${pendingSyncCount} pending)`}
            title={`Synchronize pending outbox (${pendingSyncCount} pending)`}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {pendingSyncCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '15px',
                  height: '15px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px',
                  boxShadow: '0 0 6px var(--accent-light)',
                }}
              >
                {pendingSyncCount}
              </span>
            )}
          </button>
        )}

        {/* Reset Scenario Button (Visible on screens >= 900px) */}
        {!isTablet && (
          <button
            type="button"
            className="btn-neu header-icon-btn"
            onClick={onResetDemo}
            aria-label="Reset scenario to deterministic baseline fixtures"
            title="Reset scenario to baseline fixtures"
            style={{ color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            <RotateCcw size={14} />
          </button>
        )}

        {/* Header Compact Height Toggle (Visible on desktop >= 900px) */}
        {!isTablet && onToggleHeaderCompact && (
          <button
            type="button"
            className="btn-neu header-icon-btn"
            onClick={onToggleHeaderCompact}
            aria-label={isHeaderCompact ? 'Default header height (56px)' : 'Compact header height (44px)'}
            title={isHeaderCompact ? 'Default Header (56px)' : 'Compact Header (44px)'}
          >
            <ChevronsUpDown size={14} />
          </button>
        )}

        {/* Minimize Header Strip Toggle (Visible on desktop >= 900px) */}
        {!isTablet && onToggleHeaderMinimized && (
          <button
            type="button"
            className="btn-neu header-icon-btn"
            onClick={onToggleHeaderMinimized}
            aria-label="Minimize header"
            title="Minimize header"
          >
            <ChevronUp size={14} />
          </button>
        )}

        {/* Overflow Menu Button (Visible under 900px) */}
        {isTablet && (
          <div ref={overflowRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-neu header-icon-btn"
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              aria-label="More actions"
              aria-expanded={isOverflowOpen}
              aria-haspopup="menu"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>

            {/* Overflow Dropdown Menu */}
            {isOverflowOpen && (
              <div
                className="header-overflow-menu"
                role="menu"
                aria-label="Additional Actions"
              >
                {/* Mobile-only offline toggle (< 600px) */}
                {isMobile && (
                  <button
                    type="button"
                    className="btn-neu btn-neu-sm"
                    onClick={() => {
                      onToggleOffline();
                      setIsOverflowOpen(false);
                    }}
                    role="menuitem"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isOfflineMode ? <WifiOff size={14} color="var(--critical)" /> : <Wifi size={14} />}
                      <span>{isOfflineMode ? 'Disable Offline' : 'Simulate Offline'}</span>
                    </div>
                    <span
                      className={`badge-neu ${isOfflineMode ? 'badge-neu-crit' : 'badge-neu-ok'}`}
                      style={{ fontSize: '0.6rem' }}
                    >
                      {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
                    </span>
                  </button>
                )}

                {/* Mobile-only sync outbox (< 600px) */}
                {isMobile && (
                  <button
                    type="button"
                    className="btn-neu btn-neu-sm"
                    onClick={() => {
                      onTriggerSync();
                      setIsOverflowOpen(false);
                    }}
                    disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
                    role="menuitem"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Outbox'}</span>
                    </div>
                    <span className="badge-neu badge-neu-info" style={{ fontSize: '0.6rem' }}>
                      {pendingSyncCount}
                    </span>
                  </button>
                )}

                {/* Appearance Theme Selector */}
                <div style={{ padding: '4px 6px' }}>
                  <div
                    style={{
                      fontSize: '0.64rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Appearance Theme
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn-neu btn-neu-sm ${themeMode === 'system' ? 'btn-neu-primary' : ''}`}
                      onClick={() => handleThemeChange('system')}
                      style={{ flex: 1, padding: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Monitor size={12} />
                      <span>Auto</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-neu btn-neu-sm ${themeMode === 'light' ? 'btn-neu-primary' : ''}`}
                      onClick={() => handleThemeChange('light')}
                      style={{ flex: 1, padding: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Sun size={12} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-neu btn-neu-sm ${themeMode === 'dark' ? 'btn-neu-primary' : ''}`}
                      onClick={() => handleThemeChange('dark')}
                      style={{ flex: 1, padding: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Moon size={12} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Reset Scenario Button */}
                <button
                  type="button"
                  className="btn-neu btn-neu-sm"
                  onClick={() => {
                    onResetDemo();
                    setIsOverflowOpen(false);
                  }}
                  role="menuitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    color: 'var(--warning)',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Scenario Baseline</span>
                </button>

                {/* Header Height Toggle */}
                {onToggleHeaderCompact && (
                  <button
                    type="button"
                    className="btn-neu btn-neu-sm"
                    onClick={() => {
                      onToggleHeaderCompact();
                      setIsOverflowOpen(false);
                    }}
                    role="menuitem"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                    }}
                  >
                    <ChevronsUpDown size={14} />
                    <span>{isHeaderCompact ? 'Default Height (56px)' : 'Compact Height (44px)'}</span>
                  </button>
                )}

                {/* Minimize Header Toggle */}
                {onToggleHeaderMinimized && (
                  <button
                    type="button"
                    className="btn-neu btn-neu-sm"
                    onClick={() => {
                      onToggleHeaderMinimized();
                      setIsOverflowOpen(false);
                    }}
                    role="menuitem"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                    }}
                  >
                    <ChevronUp size={14} />
                    <span>Minimize Header</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
