import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  Sun,
  Moon,
  Monitor,
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
  const [browserHardwareOnline, setBrowserHardwareOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleHwOnline = () => setBrowserHardwareOnline(true);
    const handleHwOffline = () => setBrowserHardwareOnline(false);

    window.addEventListener('online', handleHwOnline);
    window.addEventListener('offline', handleHwOffline);

    const unsubscribeTheme = themeService.subscribe((mode) => {
      setThemeMode(mode);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleHwOnline);
      window.removeEventListener('offline', handleHwOffline);
      unsubscribeTheme();
    };
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    themeService.setMode(mode);
  };

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard':
        return {
          title: 'Common Operational Picture',
          subtitle: 'Cross-module tactical synthesis, field queue, and airspace situational feeds',
          tag: 'SYNTHESIS-01',
        };
      case 'fieldlink':
        return {
          title: 'FieldLink Tactical Reports',
          subtitle: 'Offline-first battlefield communication, IndexedDB queue, and idempotent sync',
          tag: 'TACTICAL-COMMS-02',
        };
      case 'skywatch':
        return {
          title: 'SkyWatch Airspace Security',
          subtitle: 'Counter-drone radar simulation and explainable mathematical anomaly detection',
          tag: 'AIRSPACE-DEFENSE-03',
        };
      case 'geointel':
        return {
          title: 'GeoIntel Reconnaissance',
          subtitle: 'Multi-temporal change analysis and candidate review workflow',
          tag: 'GEO-RECON-04',
        };
      case 'mediroute':
        return {
          title: 'MediRoute Logistics',
          subtitle: 'Algorithmic START triage and hazard-avoiding Dijkstra evacuation routing',
          tag: 'MED-EVAC-05',
        };
    }
  };

  const moduleInfo = getModuleTitle();
  const effectiveOffline = isOfflineMode || !browserHardwareOnline;

  return (
    <header
      style={{
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 24px',
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
      {/* Title & Context */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: 'var(--accent)',
                letterSpacing: '0.06em',
                background: 'var(--surface-inset)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 0 10px var(--accent-light)',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--healthy)', boxShadow: '0 0 8px var(--healthy)' }} />
              SENTINEL v2.6
            </span>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
              / {moduleInfo.tag}
            </span>
            <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.65rem' }}>
              DEMO TESTBED — SYNTHETIC DATA
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
        {/* System / Light / Dark Mode Toggle */}
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
            title="Light Theme"
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
            title="Dark Tactical Theme"
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
          title="Current Zulu Operational Time"
        >
          <Clock size={12} color="var(--accent)" />
          <span>{currentTime}</span>
        </div>

        {/* Local Connectivity Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            background: effectiveOffline ? 'var(--critical-bg)' : 'var(--healthy-bg)',
            border: `1px solid ${effectiveOffline ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: effectiveOffline ? 'var(--critical)' : 'var(--healthy)',
          }}
          title={
            effectiveOffline
              ? 'Local device/browser network is disconnected or field blackout simulation is active'
              : 'Local browser network is connected'
          }
        >
          {effectiveOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
          <span>{effectiveOffline ? 'OFFLINE (BLACKOUT)' : 'ONLINE'}</span>
        </div>

        {/* Data Sync Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            background: pendingSyncCount > 0 ? 'var(--warning-bg)' : 'var(--surface-inset)',
            border: `1px solid ${pendingSyncCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: pendingSyncCount > 0 ? 'var(--warning)' : 'var(--text-secondary)',
          }}
          title="FieldLink outbox synchronization queue status"
        >
          {pendingSyncCount > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
          <span>{pendingSyncCount > 0 ? `${pendingSyncCount} PENDING OUTBOX` : 'ALL SYNCHRONIZED'}</span>
        </div>

        {/* Simulated Blackout Button */}
        <button
          className={`btn-neu btn-neu-sm ${effectiveOffline ? 'btn-neu-critical' : ''}`}
          onClick={onToggleOffline}
          title={
            effectiveOffline
              ? 'Restore online connection mode'
              : 'Simulate field network blackout (no internet)'
          }
        >
          {effectiveOffline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{effectiveOffline ? 'Restore Online' : 'Simulate Blackout'}</span>
        </button>

        {/* Manual Outbox Sync Button */}
        <button
          className={`btn-neu btn-neu-sm ${pendingSyncCount > 0 && !effectiveOffline ? 'btn-neu-primary' : ''}`}
          onClick={onTriggerSync}
          disabled={isSyncing || effectiveOffline || pendingSyncCount === 0}
          title={
            effectiveOffline
              ? 'Outbox sync requires an online connection'
              : pendingSyncCount === 0
              ? 'No pending reports in outbox'
              : `Trigger batch synchronization for ${pendingSyncCount} queued reports`
          }
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : `Sync Outbox (${pendingSyncCount})`}</span>
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
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
