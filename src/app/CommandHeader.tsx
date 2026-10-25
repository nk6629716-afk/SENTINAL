import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertOctagon,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../services/api/apiClient';

interface CommandHeaderProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
  pendingSyncCount: number;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  onTriggerSync: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  isSyncing: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  activeModule,
  onNavigate,
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
      setCurrentTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* 1. Offline Notification Bar (visible when offline mode is toggled or network disconnected) */}
      {isOfflineMode && (
        <div className="offline-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WifiOff size={16} />
            <span>OFFLINE TACTICAL MODE ACTIVE</span>
            <span style={{ opacity: 0.8 }}>
              — Local records queued to IndexedDB. Outbox items awaiting reconciliation.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleOffline}
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            Restore Network Link
          </button>
        </div>
      )}

      {/* 2. Primary Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          height: 'var(--header-height)',
        }}
      >
        {/* Left: Brand & Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #00f2fe 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)',
              }}
            >
              <Shield size={20} color="#070a12" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#ffffff',
                  }}
                >
                  SENTINEL
                </span>
                <span className="badge badge-simulated" title="Honest simulation label">
                  SIMULATED DATA
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.02em',
                }}
              >
                Situational Awareness & Tactical Response Platform
              </div>
            </div>
          </div>
        </div>

        {/* Center: System Status & Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(14, 20, 36, 0.8)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              className={`beacon ${
                isOfflineMode ? 'beacon-danger' : 'beacon-nominal'
              }`}
            />
            <span style={{ color: isOfflineMode ? '#fca5a5' : '#86efac' }}>
              {isOfflineMode ? 'OFFLINE SIM' : 'LINK: NOMINAL'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
            }}
          >
            <Activity size={14} color="var(--accent-cyan)" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Right: Operational Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Offline Mode Toggle */}
          <button
            className={`btn btn-sm ${
              isOfflineMode ? 'btn-danger' : 'btn-secondary'
            }`}
            onClick={onToggleOffline}
            title={
              isOfflineMode
                ? 'Click to restore online network connectivity'
                : 'Click to simulate tactical network blackout (offline reporting)'
            }
          >
            {isOfflineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
            <span>{isOfflineMode ? 'Sim Offline: ON' : 'Go Offline'}</span>
          </button>

          {/* Pending Sync Outbox Button */}
          <button
            className={`btn btn-sm ${
              pendingSyncCount > 0 ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={onTriggerSync}
            disabled={isSyncing || isOfflineMode}
            title={
              isOfflineMode
                ? 'Cannot sync while in offline mode'
                : `Sync ${pendingSyncCount} queued reports with command server`
            }
          >
            <RefreshCw
              size={14}
              className={isSyncing ? 'animate-spin' : ''}
              style={{
                animation: isSyncing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>
              {isSyncing
                ? 'Syncing...'
                : pendingSyncCount > 0
                ? `Sync Outbox (${pendingSyncCount})`
                : 'Synced'}
            </span>
          </button>

          {/* Deterministic Replay / Reset Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onResetDemo}
            title="Reset all modules to deterministic baseline fixtures for judge replay"
          >
            <RotateCcw size={14} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* 3. Navigation Bar for 4 Modules */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 1.5rem',
          backgroundColor: 'rgba(9, 13, 24, 0.95)',
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeModule === 'dashboard'
                ? '2px solid var(--accent-cyan)'
                : '2px solid transparent',
            color: activeModule === 'dashboard' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: activeModule === 'dashboard' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={15} color={activeModule === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Command Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('fieldlink')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeModule === 'fieldlink'
                ? '2px solid var(--accent-cyan)'
                : '2px solid transparent',
            color: activeModule === 'fieldlink' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: activeModule === 'fieldlink' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Radio size={15} color={activeModule === 'fieldlink' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>FieldLink (Tactical Reports)</span>
          {pendingSyncCount > 0 && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
              {pendingSyncCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('skywatch')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeModule === 'skywatch'
                ? '2px solid var(--accent-cyan)'
                : '2px solid transparent',
            color: activeModule === 'skywatch' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: activeModule === 'skywatch' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Crosshair size={15} color={activeModule === 'skywatch' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>SkyWatch (Counter-Drone)</span>
        </button>

        <button
          onClick={() => onNavigate('geointel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeModule === 'geointel'
                ? '2px solid var(--accent-cyan)'
                : '2px solid transparent',
            color: activeModule === 'geointel' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: activeModule === 'geointel' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Compass size={15} color={activeModule === 'geointel' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>GeoIntel (Recon Analysis)</span>
        </button>

        <button
          onClick={() => onNavigate('mediroute')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeModule === 'mediroute'
                ? '2px solid var(--accent-cyan)'
                : '2px solid transparent',
            color: activeModule === 'mediroute' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: activeModule === 'mediroute' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <HeartPulse size={15} color={activeModule === 'mediroute' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>MediRoute (Triage & Evacuation)</span>
        </button>
      </nav>
    </header>
  );
};
