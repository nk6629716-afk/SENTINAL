import React from 'react';
import {
  Layers,
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
  Wifi,
  WifiOff,
  Database,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
  pendingSyncCount: number;
  unackAlertsCount: number;
  isOfflineMode: boolean;
  onCloseMobile?: () => void;
  isOpenMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onNavigate,
  pendingSyncCount,
  unackAlertsCount,
  isOfflineMode,
  onCloseMobile,
  isOpenMobile = false,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      code: 'COP',
      label: 'Overview & COP',
      icon: Layers,
      description: 'Common Operational Picture',
    },
    {
      id: 'fieldlink',
      code: 'FLK',
      label: 'FieldLink Reports',
      icon: Radio,
      badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
      badgeType: 'warn' as const,
      description: 'Offline ground outbox',
    },
    {
      id: 'skywatch',
      code: 'SKY',
      label: 'SkyWatch Airspace',
      icon: Crosshair,
      badge: unackAlertsCount > 0 ? unackAlertsCount : undefined,
      badgeType: 'crit' as const,
      description: 'Radar & drone heuristics',
    },
    {
      id: 'geointel',
      code: 'GEO',
      label: 'GeoIntel Recon',
      icon: Compass,
      description: 'Satellite change detection',
    },
    {
      id: 'mediroute',
      code: 'MED',
      label: 'MediRoute Logistics',
      icon: HeartPulse,
      description: 'START triage & evacuation',
    },
  ];

  return (
    <aside className={`app-sidebar ${isOpenMobile ? 'open' : ''}`}>
      {/* Brand & Identity Masthead */}
      <div
        style={{
          padding: '20px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Custom Technical Emblem */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  SENTINEL
                </span>
                <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>
                  v2.6
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Operations Platform
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              className="btn-neu btn-neu-sm"
              onClick={onCloseMobile}
              style={{ padding: '4px', border: 'none', background: 'transparent' }}
              aria-label="Close Navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
            TACTICAL SITUATIONAL ENGINE
          </span>
        </div>
      </div>

      {/* Navigation Workspaces */}
      <nav
        style={{
          padding: '16px 12px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            paddingLeft: '10px',
            marginBottom: '4px',
          }}
        >
          OPERATIONAL MODULES
        </div>

        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id as any);
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '1px solid transparent',
                background: isActive ? 'var(--surface-inset)' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-inset-sm)' : 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={17}
                  color={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`badge-neu ${item.badgeType === 'crit' ? 'badge-neu-crit' : 'badge-neu-warn'}`}
                  style={{ fontSize: '0.65rem', padding: '1px 6px' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer System Health Widget */}
      <div style={{ padding: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        <div
          className="neu-inset"
          style={{
            padding: '11px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              TELEMETRY BUS
            </span>
            {isOfflineMode ? (
              <WifiOff size={13} color="var(--critical)" />
            ) : (
              <Wifi size={13} color="var(--healthy)" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                boxShadow: isOfflineMode
                  ? '0 0 6px var(--critical)'
                  : '0 0 6px var(--healthy)',
              }}
            />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
              }}
            >
              {isOfflineMode ? 'Offline Simulated' : 'Command Link Active'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <Database size={11} color="var(--accent)" />
            <span>IndexedDB Storage Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
