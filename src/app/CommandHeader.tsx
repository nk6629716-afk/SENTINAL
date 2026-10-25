import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface CommandHeaderProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  pendingSyncCount: number;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  onTriggerSync: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  isSyncing: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  activeModule,
  pendingSyncCount,
  isOfflineMode,
  onToggleOffline,
  onTriggerSync,
  onResetDemo,
  isSyncing,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
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

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleHwOnline);
      window.removeEventListener('offline', handleHwOffline);
    };
  }, []);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard':
        return {
          title: 'Common Operational Picture',
          subtitle: 'Cross-module tactical synthesis, field queue, and airspace situational feeds',
        };
      case 'fieldlink':
        return {
          title: 'FieldLink Tactical Reports',
          subtitle: 'Offline-first battlefield communication, IndexedDB queue, and idempotent sync',
        };
      case 'skywatch':
        return {
          title: 'SkyWatch Airspace Security',
          subtitle: 'Counter-drone radar simulation and explainable mathematical anomaly detection',
        };
      case 'geointel':
        return {
          title: 'GeoIntel Reconnaissance',
          subtitle: 'Multi-temporal change analysis and candidate review workflow',
        };
      case 'mediroute':
        return {
          title: 'MediRoute Logistics',
          subtitle: 'Algorithmic START triage and hazard-avoiding Dijkstra evacuation routing',
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
      }}
    >
      {/* Title & Module Identity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {moduleInfo.title}
          </h1>
          <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.65rem' }}>
            DEMO TESTBED — SYNTHETIC DATA
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {moduleInfo.subtitle}
        </p>
      </div>

      {/* Operational Status Bar & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* UTC Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
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
            padding: '6px 12px',
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
            padding: '6px 12px',
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

        {/* Toggle Offline Mode Button */}
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

        {/* Deterministic Reset Demo Button */}
        <button
          className="btn-neu btn-neu-sm"
          onClick={onResetDemo}
          title="Reset all demo records back to deterministic baseline fixtures"
        >
          <RotateCcw size={12} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
