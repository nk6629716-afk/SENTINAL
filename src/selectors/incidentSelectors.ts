import { IncidentReport } from '@shared/types';

/**
 * Returns all pending or failed outbox incidents (un-synchronized local records).
 */
export function selectPendingOutbox(incidents: IncidentReport[] = []): IncidentReport[] {
  return incidents.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
}

/**
 * Returns all successfully synchronized incidents.
 */
export function selectSyncedIncidents(incidents: IncidentReport[] = []): IncidentReport[] {
  return incidents.filter((i) => i.syncStatus === 'synced');
}

/**
 * Returns all failed outbox items requiring retry.
 */
export function selectFailedOutbox(incidents: IncidentReport[] = []): IncidentReport[] {
  return incidents.filter((i) => i.syncStatus === 'failed');
}

/**
 * Returns incidents grouped by priority.
 */
export function selectIncidentsByPriority(incidents: IncidentReport[] = []) {
  return {
    critical: incidents.filter((i) => i.priority === 'critical'),
    high: incidents.filter((i) => i.priority === 'high'),
    low: incidents.filter((i) => i.priority === 'low'),
  };
}
