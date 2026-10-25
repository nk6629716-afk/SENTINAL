import React from 'react';
import {
  Shield,
  Layers,
  Radio,
  Crosshair,
  Compass,
  HeartPulse,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface SidebarProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
  pendingSyncCount: number;
  unackAlertsCount: number;
  isOfflineMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onNavigate,
  pendingSyncCount,
  unackAlertsCount,
  isOfflineMode,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview & COP',
      icon: Layers,
      description: 'Common Operational Picture',
    },
    {
      id: 'fieldlink',
      label: 'FieldLink Reports',
      icon: Radio,
      badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
      badgeType: 'warn' as const,
      description: 'Offline tactical outbox',
    },
    {
      id: 'skywatch',
      label: 'SkyWatch Airspace',
      icon: Crosshair,
      badge: unackAlertsCount > 0 ? unackAlertsCount : undefined,
      badgeType: 'crit' as const,
      description: 'Counter-drone radar',
    },
    {
      id: 'geointel',
      label: 'GeoIntel Recon',
      icon: Compass,
      description: 'Satellite change detection',
    },
    {
      id: 'mediroute',
      label: 'MediRoute Logistics',
      icon: HeartPulse,
      description: 'Triage & road routing',
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-raised)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Shield size={22} strokeWidth={2.3} />
          </div>

          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              SENTINEL
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Tactical Operations Platform
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.65rem' }}>
            SIMULATED DEMO PROTOCOL
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginBottom: '4px' }}>
          Operational Workspaces
        </div>

        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '1px solid rgba(70, 105, 168, 0.25)' : '1px solid transparent',
                background: isActive ? 'var(--surface-inset)' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-inset)' : 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={18}
                  color={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <div>
                  <div>{item.label}</div>
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
      </div>

      {/* Sidebar Footer System Health Widget */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            background: 'var(--surface-inset)',
            boxShadow: 'var(--shadow-inset-sm)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            border: '1px solid rgba(210, 216, 225, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              LOCAL CONNECTION
            </span>
            {isOfflineMode ? (
              <WifiOff size={13} color="var(--critical)" />
            ) : (
              <Wifi size={13} color="var(--healthy)" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                boxShadow: isOfflineMode
                  ? '0 0 6px rgba(185, 56, 56, 0.6)'
                  : '0 0 6px rgba(57, 118, 83, 0.6)',
              }}
            />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
              }}
            >
              {isOfflineMode ? 'Tactical Offline Sim' : 'Nominal Online'}
            </span>
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isOfflineMode ? 'Records queued locally' : 'Sync ready with server'}
          </div>
        </div>
      </div>
    </aside>
  );
};
