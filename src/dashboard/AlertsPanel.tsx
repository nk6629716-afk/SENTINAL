import React, { useState, useCallback, useMemo } from 'react';
import {
  IncidentReport,
  TelemetryTrack,
  AirspaceAlert,
  GeoIntelObservation,
} from '@shared/types';
import {
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Radio,
  Activity,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatIST } from '../utils/time';

// ============================================================================
// 1. Sleek Top Critical Alert Card with Left-Accent Strip
// ============================================================================
interface CriticalIncidentCardProps {
  incident: IncidentReport | null;
  onNavigateToFieldLink: () => void;
}

export const CriticalIncidentCard = React.memo<CriticalIncidentCardProps>(
  ({ incident, onNavigateToFieldLink }) => {
    if (!incident) return null;

    return (
      <div
        className="critical-alert-card transition-all duration-200"
        style={{
          border: '1px solid rgba(255, 59, 92, 0.22)',
          borderLeft: '4px solid #FF3B5C',
          borderRadius: 'var(--radius-sm, 6px)',
          background: 'rgba(255, 59, 92, 0.08)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            className="text-xs uppercase tracking-wider font-mono"
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              letterSpacing: '0.06em',
              background: 'rgba(255, 59, 92, 0.16)',
              color: 'var(--status-critical, #FF3B5C)',
              border: '1px solid rgba(255, 59, 92, 0.35)',
              padding: '1px 6px',
              borderRadius: '2px',
              textTransform: 'uppercase',
            }}
          >
            Critical Incident
          </span>
          <span
            className="font-mono text-zinc-400"
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary, #869E96)',
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatIST(incident.createdAt, { seconds: false })}
          </span>
        </div>

        <div
          style={{
            fontSize: '0.88rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'var(--text-primary, #F0FDF4)',
            lineHeight: 1.25,
          }}
        >
          {incident.title}
        </div>

        <div
          className="text-[10px] text-zinc-400"
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary, #869E96)',
            lineHeight: 1.35,
          }}
        >
          {incident.notes}
        </div>

        <button
          type="button"
          onClick={onNavigateToFieldLink}
          className="ghost-fieldlink-btn transition-all duration-200"
          style={{
            marginTop: '4px',
            width: '100%',
            padding: '5px 10px',
            border: '1px solid rgba(255, 59, 92, 0.38)',
            borderRadius: '4px',
            background: 'transparent',
            color: '#FFA1B2',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{incident.type === 'medical' ? 'Open in MediRoute Triage' : 'Open in FieldLink'}</span>
          <ExternalLink size={12} />
        </button>
      </div>
    );
  },
  (prev, next) => {
    if (!prev.incident && !next.incident) return true;
    if (!prev.incident || !next.incident) return false;
    return (
      prev.incident.id === next.incident.id &&
      prev.incident.title === next.incident.title &&
      prev.incident.notes === next.incident.notes &&
      prev.incident.createdAt === next.incident.createdAt
    );
  }
);

// ============================================================================
// 2. Compact Threat Queue Item (Borderless List with Micro-Dividers)
// ============================================================================
export interface ThreatItemData {
  id: string;
  callsign: string;
  reason: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  track: TelemetryTrack;
}

interface ThreatItemProps {
  threat: ThreatItemData;
  isSelected: boolean;
  onSelect: (track: TelemetryTrack) => void;
}

export const ThreatItem = React.memo<ThreatItemProps>(
  ({ threat, isSelected, onSelect }) => {
    const handleClick = useCallback(() => {
      onSelect(threat.track);
    }, [onSelect, threat.track]);

    // Color-coded badge criteria: Red for >=70, Amber for 40-69, Green for <40
    const isCritical = threat.score >= 70;
    const isWarning = threat.score >= 40 && threat.score < 70;

    const badgeBg = isCritical
      ? 'rgba(255, 59, 92, 0.16)'
      : isWarning
      ? 'rgba(255, 179, 0, 0.16)'
      : 'rgba(0, 230, 118, 0.16)';

    const badgeText = isCritical
      ? 'var(--status-critical, #FF3B5C)'
      : isWarning
      ? 'var(--status-warning, #FFB300)'
      : 'var(--status-safe, #00E676)';

    const badgeBorder = isCritical
      ? 'rgba(255, 59, 92, 0.35)'
      : isWarning
      ? 'rgba(255, 179, 0, 0.35)'
      : 'rgba(0, 230, 118, 0.35)';

    const symbolColor = isCritical
      ? 'var(--status-critical, #FF3B5C)'
      : isWarning
      ? 'var(--status-warning, #FFB300)'
      : 'var(--status-safe, #00E676)';

    return (
      <div
        onClick={handleClick}
        className="threat-list-item transition-all duration-200"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: isSelected ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
          cursor: 'pointer',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span
            style={{
              color: symbolColor,
              fontSize: '0.95rem',
              lineHeight: 1,
              flexShrink: 0,
              transition: 'color 0.2s ease',
            }}
          >
            {isCritical ? '◆' : isWarning ? '✤' : '▲'}
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="font-mono text-zinc-100"
              style={{
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-primary, #F0FDF4)',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {threat.callsign}
            </div>
            <div
              className="text-zinc-400"
              style={{
                fontSize: '10px',
                color: 'var(--text-secondary, #869E96)',
                lineHeight: 1.2,
                marginTop: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {threat.reason}
            </div>
          </div>
        </div>

        {/* Right Aligned Compact Color-Coded Score Badge with Smooth Transitions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
          <span
            className="font-mono transition-all duration-200"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '28px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              background: badgeBg,
              color: badgeText,
              border: `1px solid ${badgeBorder}`,
              lineHeight: 1,
              transition: 'all 0.2s ease',
            }}
          >
            {threat.score}
          </span>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.threat.id === next.threat.id &&
      prev.threat.callsign === next.threat.callsign &&
      prev.threat.score === next.threat.score &&
      prev.threat.reason === next.threat.reason &&
      prev.threat.severity === next.threat.severity &&
      prev.threat.track.lat === next.threat.track.lat &&
      prev.threat.track.lng === next.threat.track.lng &&
      prev.threat.track.speed === next.threat.track.speed &&
      prev.threat.track.altitude === next.threat.track.altitude
    );
  }
);

// ============================================================================
// 3. Mission Step Stepper Item
// ============================================================================
export interface MissionStepData {
  step: number;
  title: string;
  statusText: string;
  module: string;
}

interface MissionStepItemProps {
  step: MissionStepData;
  isActive: boolean;
  isCompleted: boolean;
  onClick: (stepNumber: number, module: string) => void;
}

export const MissionStepItem = React.memo<MissionStepItemProps>(
  ({ step, isActive, isCompleted, onClick }) => {
    const handleClick = useCallback(() => {
      onClick(step.step, step.module);
    }, [onClick, step.step, step.module]);

    return (
      <div
        onClick={handleClick}
        className="mission-step-item transition-all duration-200"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: '4px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: isActive ? 'rgba(0, 230, 118, 0.06)' : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isCompleted ? (
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--status-safe, #00E676)',
                color: '#060A09',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.62rem',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              ✓
            </div>
          ) : isActive ? (
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2px solid var(--accent-primary, #00E676)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary, #00E676)',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            />
          )}

          <span
            style={{
              fontSize: '0.78rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: isActive ? 700 : 500,
              color: isActive
                ? 'var(--text-primary, #F0FDF4)'
                : isCompleted
                ? 'var(--text-primary, #F0FDF4)'
                : 'var(--text-secondary, #869E96)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {step.title}
          </span>
        </div>

        <span
          className="font-mono text-zinc-400"
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--accent-primary, #00E676)' : 'var(--text-secondary, #869E96)',
            flexShrink: 0,
            marginLeft: '6px',
          }}
        >
          {step.statusText}
        </span>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.isCompleted === next.isCompleted &&
      prev.step.step === next.step.step &&
      prev.step.title === next.step.title &&
      prev.step.statusText === next.step.statusText
    );
  }
);

// ============================================================================
// 4. Report Item for Reports Tab
// ============================================================================
interface ReportItemProps {
  report: IncidentReport;
  onSelect: (report: IncidentReport) => void;
}

export const ReportItem = React.memo<ReportItemProps>(({ report, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(report);
  }, [onSelect, report]);

  const isCrit = report.priority === 'critical';
  const isHigh = report.priority === 'high';

  return (
    <div
      onClick={handleClick}
      className="threat-list-item transition-all duration-200"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '7px 8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        borderRadius: '3px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="font-mono"
            style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '2px',
              background: isCrit
                ? 'rgba(255, 59, 92, 0.16)'
                : isHigh
                ? 'rgba(255, 179, 0, 0.16)'
                : 'rgba(0, 230, 118, 0.16)',
              color: isCrit
                ? 'var(--status-critical, #FF3B5C)'
                : isHigh
                ? 'var(--status-warning, #FFB300)'
                : 'var(--status-safe, #00E676)',
              border: `1px solid ${
                isCrit
                  ? 'rgba(255, 59, 92, 0.35)'
                  : isHigh
                  ? 'rgba(255, 179, 0, 0.35)'
                  : 'rgba(0, 230, 118, 0.35)'
              }`,
            }}
          >
            {report.priority.toUpperCase()}
          </span>
          <span
            className="font-mono text-zinc-100"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary, #F0FDF4)' }}
          >
            {report.id}
          </span>
        </div>
        <span
          className="font-mono text-zinc-400"
          style={{ fontSize: '10px', color: 'var(--text-secondary, #869E96)' }}
        >
          {formatIST(report.createdAt, { seconds: false })}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary, #F0FDF4)', lineHeight: 1.25 }}>
        {report.title}
      </div>

      <div
        className="text-[10px] text-zinc-400"
        style={{
          fontSize: '10.5px',
          color: 'var(--text-secondary, #869E96)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {report.location.name} • {report.notes}
      </div>
    </div>
  );
});

// ============================================================================
// 5. Activity Item for Activity Tab
// ============================================================================
interface ActivityItemProps {
  id: string;
  type: 'alert' | 'incident' | 'sync' | 'command';
  title: string;
  time: string;
  description: string;
}

export const ActivityItem = React.memo<ActivityItemProps>(({ type, title, time, description }) => {
  const badgeColor =
    type === 'alert'
      ? 'var(--status-critical, #FF3B5C)'
      : type === 'incident'
      ? 'var(--status-warning, #FFB300)'
      : 'var(--status-safe, #00E676)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '6px 8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: badgeColor,
            }}
          />
          <span
            className="font-mono"
            style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary, #F0FDF4)' }}
          >
            {title}
          </span>
        </div>
        <span
          className="font-mono text-zinc-400"
          style={{ fontSize: '10px', color: 'var(--text-secondary, #869E96)' }}
        >
          {time}
        </span>
      </div>
      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #869E96)', paddingLeft: '12px' }}>
        {description}
      </div>
    </div>
  );
});

// ============================================================================
// 6. Master Right-Hand Alert Panel Component
// ============================================================================
export interface AlertsPanelProps {
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: 'alerts' | 'reports' | 'activity';
  onTabChange: (tab: 'alerts' | 'reports' | 'activity') => void;
  openAlerts: AirspaceAlert[];
  incidents: IncidentReport[];
  criticalIncident: IncidentReport | null;
  rankedThreats: ThreatItemData[];
  selectedEntityId: string | null;
  onSelectEntity: (entity: any) => void;
  crossModuleStep: number;
  missionSteps: MissionStepData[];
  onStepClick: (stepNumber: number, module: string) => void;
  onNextStep: () => void;
  isOfflineMode: boolean;
  onNavigate: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
}

export const AlertsPanel = React.memo<AlertsPanelProps>(
  ({
    width,
    isCollapsed,
    onToggleCollapse,
    activeTab,
    onTabChange,
    openAlerts,
    incidents,
    criticalIncident,
    rankedThreats,
    selectedEntityId,
    onSelectEntity,
    crossModuleStep,
    missionSteps,
    onStepClick,
    onNextStep,
    isOfflineMode,
    onNavigate,
  }) => {
    const handleSelectTrack = useCallback(
      (track: TelemetryTrack) => {
        onSelectEntity({ type: 'track', id: track.id, raw: track });
      },
      [onSelectEntity]
    );

    const handleSelectIncident = useCallback(
      (report: IncidentReport) => {
        onSelectEntity({ type: 'incident', id: report.id, raw: report });
      },
      [onSelectEntity]
    );

    const handleNavigateFieldLink = useCallback(() => {
      if (criticalIncident?.type === 'medical') {
        onNavigate('mediroute');
      } else {
        onNavigate('fieldlink');
      }
    }, [onNavigate, criticalIncident]);

    // Synthetic activity feed from state
    const activities = useMemo(() => {
      const list: Array<{ id: string; type: 'alert' | 'incident' | 'sync' | 'command'; title: string; time: string; description: string }> = [];

      for (const a of openAlerts.slice(0, 8)) {
        list.push({
          id: `act-${a.id}`,
          type: 'alert',
          title: `Airspace Alert: ${a.ruleName}`,
          time: formatIST(a.timestamp, { seconds: false }),
          description: `Target ${a.trackCallsign} in sector. Severity: ${a.severity.toUpperCase()}`,
        });
      }

      for (const inc of incidents.slice(0, 8)) {
        list.push({
          id: `act-inc-${inc.id}`,
          type: 'incident',
          title: `Ground Intake: ${inc.title}`,
          time: formatIST(inc.createdAt, { seconds: false }),
          description: `${inc.location.name} • Status: ${inc.status.toUpperCase()}`,
        });
      }

      return list;
    }, [openAlerts, incidents]);

    return (
      <aside
        className="intel-pane transition-all duration-200"
        style={{
          width: isCollapsed ? 0 : `${width}px`,
          minWidth: isCollapsed ? 0 : undefined,
          maxWidth: isCollapsed ? 0 : undefined,
          display: isCollapsed ? 'none' : 'flex',
          background: 'rgba(24, 29, 26, 0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(115, 138, 101, 0.20)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          flexDirection: 'column',
          zIndex: 20,
        }}
        aria-label="Intelligence & Tactical Alert Pane"
      >
        {/* Panel Header & Navigation Tabs (Sticky) */}
        <div
          className="intel-header"
          style={{
            background: 'rgba(24, 29, 26, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(115, 138, 101, 0.20)',
            padding: '8px 12px 6px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            {/* Tabs List */}
            <div style={{ display: 'flex', flex: 1, gap: '4px' }} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'alerts'}
                onClick={() => onTabChange('alerts')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'alerts' ? '2px solid var(--accent-sage, #738a65)' : '2px solid transparent',
                  padding: '6px 4px',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: activeTab === 'alerts' ? 'var(--text-primary, #e9ece9)' : 'var(--text-secondary, #94a192)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  textTransform: 'uppercase',
                }}
              >
                <span>Alerts</span>
                {openAlerts.length > 0 && (
                  <span
                    className="font-mono transition-all duration-200"
                    style={{
                      padding: '1px 5px',
                      borderRadius: '999px',
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      background: 'rgba(255, 59, 92, 0.2)',
                      color: 'var(--status-critical, #FF3B5C)',
                      border: '1px solid rgba(255, 59, 92, 0.4)',
                      lineHeight: 1,
                    }}
                  >
                    {openAlerts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'reports'}
                onClick={() => onTabChange('reports')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'reports' ? '2px solid var(--accent-primary, #00E676)' : '2px solid transparent',
                  padding: '6px 4px',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: activeTab === 'reports' ? 'var(--text-primary, #F0FDF4)' : 'var(--text-secondary, #869E96)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  textTransform: 'uppercase',
                }}
              >
                <span>Reports</span>
                <span
                  className="font-mono"
                  style={{
                    padding: '1px 5px',
                    borderRadius: '999px',
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary, #869E96)',
                    lineHeight: 1,
                  }}
                >
                  {incidents.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'activity'}
                onClick={() => onTabChange('activity')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'activity' ? '2px solid var(--accent-primary, #00E676)' : '2px solid transparent',
                  padding: '6px 4px',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: activeTab === 'activity' ? 'var(--text-primary, #F0FDF4)' : 'var(--text-secondary, #869E96)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  textTransform: 'uppercase',
                }}
              >
                <span>Activity</span>
              </button>
            </div>

            {/* Collapse Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 4px',
                color: 'var(--text-secondary, #869E96)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
              title="Collapse intelligence pane"
              aria-label="Collapse intelligence pane"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Container with Custom Dark Thin Scrollbar */}
        <div className="intel-body tactical-scrollbar">
          {activeTab === 'alerts' && (
            <>
              {/* Command Link Status Strip */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isOfflineMode ? 'var(--status-critical, #FF3B5C)' : 'var(--status-safe, #00E676)',
                      boxShadow: isOfflineMode ? '0 0 6px rgba(255, 59, 92, 0.6)' : '0 0 6px rgba(0, 230, 118, 0.6)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="font-mono text-zinc-300"
                    style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary, #F0FDF4)' }}
                  >
                    {isOfflineMode ? 'Air-gap queue active' : 'Command link synchronized'}
                  </span>
                </div>
                <span
                  className="font-mono text-zinc-400"
                  style={{ fontSize: '10px', color: 'var(--text-secondary, #869E96)' }}
                >
                  {isOfflineMode ? 'Local cache' : 'Live stream'}
                </span>
              </div>

              {/* Top Critical Alert Card with Left-Accent Strip */}
              <CriticalIncidentCard
                incident={criticalIncident}
                onNavigateToFieldLink={handleNavigateFieldLink}
              />

                {/* Threat Queue Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div
                      className="text-xs uppercase tracking-wider text-zinc-400 font-mono"
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Triage & Priority Queue ({rankedThreats.length})
                    </div>
                    <span
                      className="text-zinc-500 font-mono"
                      style={{ fontSize: '10px', color: 'var(--text-muted, #546E66)', fontFamily: 'var(--font-mono)' }}
                    >
                      By score
                    </span>
                  </div>

                  <div className="glass-section">
                    {rankedThreats.map((threat) => (
                      <ThreatItem
                        key={threat.id}
                        threat={threat}
                        isSelected={selectedEntityId === threat.id}
                        onSelect={handleSelectTrack}
                      />
                    ))}
                  </div>
                </div>

                {/* Mission Sequence Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      className="text-xs uppercase tracking-wider text-zinc-400 font-mono"
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Mission Sequence ({crossModuleStep}/5)
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={onNextStep}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        height: '20px',
                        minHeight: '20px',
                      }}
                    >
                      <span>Next step</span>
                      <ArrowRight size={9} />
                    </button>
                  </div>

                  <div className="glass-section">
                    {missionSteps.map((s) => (
                      <MissionStepItem
                        key={s.step}
                        step={s}
                        isActive={crossModuleStep === s.step}
                        isCompleted={crossModuleStep > s.step}
                        onClick={onStepClick}
                      />
                    ))}
                  </div>
                </div>
            </>
          )}

          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Incident Reports ({incidents.length})
                </div>
                <button
                  type="button"
                  onClick={handleNavigateFieldLink}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary, #00E676)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>Intake form</span>
                  <ExternalLink size={10} />
                </button>
              </div>

              <div className="glass-section">
                {incidents.map((inc) => (
                  <ReportItem
                    key={inc.id}
                    report={inc}
                    onSelect={handleSelectIncident}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Operational Activity Log
              </div>

              <div className="glass-section">
                {activities.map((act) => (
                  <ActivityItem
                    key={act.id}
                    id={act.id}
                    type={act.type}
                    title={act.title}
                    time={act.time}
                    description={act.description}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }
);
