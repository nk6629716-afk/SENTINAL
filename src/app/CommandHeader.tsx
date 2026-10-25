import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { themeService, ThemeMode } from '../services/theme/themeService';

interface CommandHeaderProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  pendingSyncCount: number;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  onTriggerSync: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  isSyncing: boolean;
  onToggleMobileMenu?: () => void;
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
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeService.getMode());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

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
          tag: 'OPERATIONAL LEVEL 1',
          title: 'Common Operational Picture',
          subtitle: 'Multi-domain threat synthesis, tactical asset map, and incident response overview',
        };
      case 'fieldlink':
        return {
          tag: 'TACTICAL COMMUNICATIONS',
          title: 'FieldLink Ground Reports',
          subtitle: 'Offline-first asynchronous incident reporting and resilient outbox dispatch',
        };
      case 'skywatch':
        return {
          tag: 'AIR DEFENSE & RADAR',
          title: 'SkyWatch Airspace Security',
          subtitle: 'Real-time telemetry tracking, geofence monitoring, and explainable rule heuristics',
        };
      case 'geointel':
        return {
          tag: 'GEOSPATIAL INTELLIGENCE',
          title: 'GeoIntel Reconnaissance',
          subtitle: 'Multi-spectral satellite difference analysis and analyst review candidate workflow',
        };
      case 'mediroute':
        return {
          tag: 'CASUALTY & EVACUATION',
          title: 'MediRoute Logistics',
          subtitle: 'Algorithmic START triage justification and hazard-aware Dijkstra corridor routing',
        };
    }
  };

  const moduleInfo = getModuleTitle();

  return (
    <header
      style={{
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: 'var(--shadow-raised-sm)',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Title & Editorial Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleMobileMenu && (
          <button
            className="btn-neu btn-neu-sm btn-mobile-nav"
            onClick={onToggleMobileMenu}
            style={{ display: 'none' }}
            aria-label="Open Navigation Menu"
          >
            <Menu size={16} />
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.08em',
              }}
            >
              {moduleInfo.tag}
            </span>
            <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              SIMULATED TELEMETRY
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
            {moduleInfo.title}
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {moduleInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Quick Controls, Theme Selector & Status Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* System / Light / Dark Appearance Mode Segmented Control */}
        <div
          className="neu-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            gap: '2px',
          }}
          role="group"
          aria-label="Appearance Mode"
        >
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            title="System Mode (Follows OS preference)"
            style={{
              border: 'none',
              background: themeMode === 'system' ? 'var(--surface-raised)' : 'transparent',
              boxShadow: themeMode === 'system' ? 'var(--shadow-raised-sm)' : 'none',
              color: themeMode === 'system' ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Monitor size={12} />
            <span>Auto</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            title="Light Theme (Warm Neutral Editorial)"
            style={{
              border: 'none',
              background: themeMode === 'light' ? 'var(--surface-raised)' : 'transparent',
              boxShadow: themeMode === 'light' ? 'var(--shadow-raised-sm)' : 'none',
              color: themeMode === 'light' ? 'var(--warning)' : 'var(--text-muted)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Sun size={12} />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            title="Dark Theme (Tactical Instrument)"
            style={{
              border: 'none',
              background: themeMode === 'dark' ? 'var(--surface-raised)' : 'transparent',
              boxShadow: themeMode === 'dark' ? 'var(--shadow-raised-sm)' : 'none',
              color: themeMode === 'dark' ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Moon size={12} />
            <span>Dark</span>
          </button>
        </div>

        {/* Live UTC Clock */}
        <div
          className="neu-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <Clock size={12} color="var(--accent)" />
          <span>{currentTime}</span>
        </div>

        {/* Offline Mode Switch */}
        <button
          className={`btn-neu btn-neu-sm ${isOfflineMode ? 'btn-neu-critical' : ''}`}
          onClick={onToggleOffline}
          title={isOfflineMode ? 'Restore online network link' : 'Simulate remote field network blackout'}
        >
          {isOfflineMode ? <WifiOff size={13} /> : <Wifi size={13} />}
          <span>{isOfflineMode ? 'Offline Mode' : 'Go Offline'}</span>
        </button>

        {/* Outbox Sync Trigger */}
        <button
          className={`btn-neu btn-neu-sm ${pendingSyncCount > 0 ? 'btn-neu-primary' : ''}`}
          onClick={onTriggerSync}
          disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
          title="Synchronize pending outbox records"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : `Sync (${pendingSyncCount})`}</span>
        </button>

        {/* Distinct Reset Baseline Button */}
        <button
          className="btn-neu btn-neu-sm"
          onClick={onResetDemo}
          style={{
            borderColor: 'var(--warning)',
            color: 'var(--text-primary)',
          }}
          title="Reset scenario data to deterministic baseline fixtures"
        >
          <RotateCcw size={13} color="var(--warning)" />
          <span>Reset Scenario</span>
        </button>
      </div>
    </header>
  );
};
