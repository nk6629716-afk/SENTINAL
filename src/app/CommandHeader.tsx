import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  Clock,
  Layers,
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
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

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'dashboard':
        return { title: 'Common Operational Picture', subtitle: 'Cross-module situational synthesis & active incident overview' };
      case 'fieldlink':
        return { title: 'FieldLink Tactical Reports', subtitle: 'Offline-first battlefield communication & IndexedDB outbox' };
      case 'skywatch':
        return { title: 'SkyWatch Airspace Security', subtitle: 'Counter-drone radar tracking & explainable anomaly detection' };
      case 'geointel':
        return { title: 'GeoIntel Reconnaissance', subtitle: 'Multi-temporal satellite change analysis & candidate review' };
      case 'mediroute':
        return { title: 'MediRoute Logistics', subtitle: 'Algorithmic START triage & hazard-aware evacuation routing' };
    }
  };

  const moduleInfo = getModuleTitle();

  return (
    <header
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 2px 10px rgba(163, 174, 192, 0.15)',
      }}
    >
      {/* Title & Context */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {moduleInfo.title}
          </h1>
          <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.65rem' }}>
            SIMULATED
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {moduleInfo.subtitle}
        </p>
      </div>

      {/* Quick Controls & Status Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-inset)',
            boxShadow: 'var(--shadow-inset-sm)',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
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
          title={isOfflineMode ? 'Click to restore online network connectivity' : 'Click to simulate field network blackout'}
        >
          {isOfflineMode ? <WifiOff size={13} /> : <Wifi size={13} />}
          <span>{isOfflineMode ? 'Offline Active' : 'Go Offline'}</span>
        </button>

        {/* Outbox Sync Trigger */}
        <button
          className={`btn-neu btn-neu-sm ${pendingSyncCount > 0 ? 'btn-neu-primary' : ''}`}
          onClick={onTriggerSync}
          disabled={isSyncing || isOfflineMode || pendingSyncCount === 0}
          title="Synchronize local outbox records with command center"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : `Sync Outbox (${pendingSyncCount})`}</span>
        </button>

        {/* Reset Demo Button */}
        <button
          className="btn-neu btn-neu-sm"
          onClick={onResetDemo}
          title="Reset all modules to deterministic baseline fixtures for judge demonstration"
        >
          <RotateCcw size={13} />
          <span>Reset Baseline</span>
        </button>
      </div>
    </header>
  );
};
