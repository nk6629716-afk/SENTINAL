import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SidebarProps {
  activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute';
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
  pendingSyncCount: number;
  unackAlertsCount: number;
  isOfflineMode: boolean;
  onCloseMobile?: () => void;
  isOpenMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onNavigate,
  pendingSyncCount,
  unackAlertsCount,
  isOfflineMode,
  onCloseMobile,
  isOpenMobile = false,
  isCollapsed = false,
  onToggleCollapse,
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
    <aside
      className={`app-sidebar ${isOpenMobile ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Tactical Navigation Sidebar"
    >
      {/* 1. Slim Masthead */}
      <div
        style={{
          padding: isCollapsed ? '12px 0' : '14px 14px 10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            width: '100%',
          }}
        >
          {/* Emblem + Brand Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
          >
            {/* Custom Technical Emblem */}
            <div
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
              title="SENTINEL Operations Platform v2.6"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>

            {!isCollapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      fontSize: '1.18rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                    }}
                  >
                    SENTINEL
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    v2.6
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls: Collapse/Expand button and Mobile Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {!isCollapsed && onToggleCollapse && (
              <button
                type="button"
                className="btn-neu btn-neu-sm header-icon-btn"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar (Ctrl+B)"
                title="Collapse sidebar (Ctrl+B)"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
              >
                <ChevronLeft size={15} />
              </button>
            )}

            {onCloseMobile && (
              <button
                type="button"
                className="btn-neu btn-neu-sm header-icon-btn"
                onClick={onCloseMobile}
                style={{
                  width: '28px',
                  height: '28px',
                  minWidth: '28px',
                  minHeight: '28px',
                  display: isOpenMobile ? 'inline-flex' : 'none',
                }}
                aria-label="Close Navigation"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsed mode expand button underneath emblem */}
        {isCollapsed && onToggleCollapse && (
          <button
            type="button"
            className="btn-neu btn-neu-sm header-icon-btn"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar (Ctrl+B)"
            title="Expand sidebar (Ctrl+B)"
            style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
          >
            <ChevronRight size={15} />
          </button>
        )}

        {/* Expanded-only subtitle and chip (one line each, no wrap) */}
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Operations Platform
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span
                className="badge-neu badge-neu-neutral"
                style={{ fontSize: '0.58rem', padding: '1px 6px', display: 'inline-block' }}
              >
                TACTICAL SITUATIONAL ENGINE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Nav Items */}
      <nav
        style={{
          padding: isCollapsed ? '12px 6px' : '12px 10px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
        }}
        aria-label="Primary Navigation"
      >
        {!isCollapsed && (
          <div
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              paddingLeft: '8px',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            OPERATIONAL MODULES
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id as any);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              aria-label={`${item.label}: ${item.description}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Fixed 40px icon column */}
              <div className="sidebar-icon-col">
                <Icon
                  size={18}
                  color={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                  strokeWidth={isActive ? 2.4 : 2.0}
                  aria-hidden="true"
                />

                {/* Collapsed dot/counter badge on icon */}
                {item.badge !== undefined && isCollapsed && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      minWidth: typeof item.badge === 'number' && item.badge > 9 ? '15px' : '8px',
                      height: typeof item.badge === 'number' && item.badge > 9 ? '15px' : '8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: item.badgeType === 'crit' ? 'var(--critical)' : 'var(--warning)',
                      boxShadow: `0 0 6px ${item.badgeType === 'crit' ? 'var(--critical)' : 'var(--warning)'}`,
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: typeof item.badge === 'number' && item.badge > 9 ? '0 2px' : 0,
                      lineHeight: 1,
                    }}
                  >
                    {typeof item.badge === 'number' && item.badge > 9 ? item.badge : ''}
                  </span>
                )}
              </div>

              {/* Expanded labels */}
              {!isCollapsed && (
                <div style={{ flex: 1, minWidth: 0, paddingRight: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.25,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.66rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              )}

              {/* Expanded badge chip */}
              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`badge-neu ${item.badgeType === 'crit' ? 'badge-neu-crit' : 'badge-neu-warn'}`}
                  style={{ fontSize: '0.62rem', padding: '1px 6px', marginRight: '6px', flexShrink: 0 }}
                >
                  {item.badge}
                </span>
              )}

              {/* Collapsed Rail Tooltip */}
              {isCollapsed && (
                <div className="rail-tooltip" role="tooltip">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{item.label}</strong>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                      }}
                    >
                      [{item.code}]
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`badge-neu ${
                          item.badgeType === 'crit' ? 'badge-neu-crit' : 'badge-neu-warn'
                        }`}
                        style={{ fontSize: '0.58rem', padding: '0 4px' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. System Health Footer */}
      <div
        style={{
          padding: isCollapsed ? '10px 8px' : '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {isCollapsed ? (
          /* Single LED + Icon when collapsed */
          <div
            className="neu-inset"
            style={{
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              cursor: 'help',
            }}
            title={
              isOfflineMode
                ? 'Telemetry Bus: Offline Simulated (IndexedDB Active)'
                : 'Telemetry Bus: Command Link Active | IndexedDB Ready'
            }
            aria-label={isOfflineMode ? 'Telemetry Bus: Offline' : 'Telemetry Bus: Command Link Active'}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isOfflineMode ? (
                <WifiOff size={16} color="var(--critical)" />
              ) : (
                <Wifi size={16} color="var(--healthy)" />
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                  boxShadow: `0 0 5px ${isOfflineMode ? 'var(--critical)' : 'var(--healthy)'}`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Full card when expanded */
          <div
            className="neu-inset"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                TELEMETRY BUS
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
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                  boxShadow: `0 0 6px ${isOfflineMode ? 'var(--critical)' : 'var(--healthy)'}`,
                }}
              />
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isOfflineMode ? 'Offline Simulated' : 'Command Link Active'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.66rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Database size={11} color="var(--accent)" />
              <span>IndexedDB Storage Ready</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
