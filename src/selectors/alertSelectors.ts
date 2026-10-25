import { AirspaceAlert } from '@shared/types';

/**
 * Returns all unacknowledged (open) airspace alerts.
 */
export function selectOpenAlerts(alerts: AirspaceAlert[] = []): AirspaceAlert[] {
  return alerts.filter((a) => !a.acknowledged);
}

/**
 * Returns all acknowledged alerts.
 */
export function selectAcknowledgedAlerts(alerts: AirspaceAlert[] = []): AirspaceAlert[] {
  return alerts.filter((a) => a.acknowledged);
}

/**
 * Computes alert summary counts.
 */
export function selectAlertCounts(alerts: AirspaceAlert[] = []) {
  const open = selectOpenAlerts(alerts);
  const critical = open.filter((a) => a.severity === 'critical');
  return {
    total: alerts.length,
    openCount: open.length,
    criticalCount: critical.length,
  };
}
