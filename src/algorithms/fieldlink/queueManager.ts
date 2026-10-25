import {
  QueuedReport,
  QueueItemStatus,
  SyncBatchRequest,
  SyncBatchResponse,
  SyncItemResult,
  PriorityLevel,
  GeoCoordinate,
  IncidentRecord
} from '../../../shared/contracts';

/**
 * Pure helper to generate RFC4122-compliant v4 UUID without external dependencies
 */
export function generateUUID(): string {
  // Deterministic or pseudo-random UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministic hash/idempotency key based on report payload
 */
export function computeReportIdempotencyKey(
  type: string,
  priority: PriorityLevel,
  notes: string,
  location: GeoCoordinate,
  createdAt: string
): string {
  const raw = `${type}|${priority}|${notes.trim()}|${location.lat.toFixed(6)},${location.lng.toFixed(6)}|${createdAt}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `idemp-${Math.abs(hash).toString(16)}`;
}

export interface EnqueueReportInput {
  clientId?: string;
  type: string;
  priority: PriorityLevel;
  notes: string;
  location: GeoCoordinate;
  createdAt?: string;
}

/**
 * FieldLinkQueueManager: Manages offline queue lifecycle, retry backoff,
 * and synchronization reconciliation with server.
 */
export class FieldLinkQueueManager {
  private queue: Map<string, QueuedReport> = new Map();

  constructor(initialReports: QueuedReport[] = []) {
    for (const r of initialReports) {
      this.queue.set(r.clientId, { ...r });
    }
  }

  /**
   * Enqueue a new report while offline or online.
   * Assigns deterministic or random clientId, sets status to 'pending'.
   */
  public enqueue(input: EnqueueReportInput): QueuedReport {
    if (!input.type || input.type.trim() === '') {
      throw new Error('Report type is required');
    }
    if (!input.location || typeof input.location.lat !== 'number' || typeof input.location.lng !== 'number') {
      throw new Error('Valid geo location is required for field report');
    }

    const createdAt = input.createdAt || new Date().toISOString();
    const clientId = input.clientId || `rep-${generateUUID()}`;

    const report: QueuedReport = {
      clientId,
      type: input.type.trim(),
      priority: input.priority || 'medium',
      notes: (input.notes || '').trim(),
      location: { ...input.location },
      createdAt,
      status: 'pending',
      retryCount: 0,
      isSimulated: true
    };

    this.queue.set(clientId, report);
    return { ...report };
  }

  /**
   * Get all reports in queue as array
   */
  public getAll(): QueuedReport[] {
    return Array.from(this.queue.values()).map(r => ({ ...r }));
  }

  /**
   * Get reports filtered by status
   */
  public getByStatus(status: QueueItemStatus): QueuedReport[] {
    return this.getAll().filter(r => r.status === status);
  }

  /**
   * Prepare a sync batch: selects pending & failed items, sets their status to 'syncing'
   */
  public prepareSyncBatch(): SyncBatchRequest | null {
    const eligible = this.getAll().filter(r => r.status === 'pending' || r.status === 'failed');
    if (eligible.length === 0) {
      return null;
    }

    const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Mark eligible items as syncing
    for (const item of eligible) {
      const existing = this.queue.get(item.clientId);
      if (existing) {
        existing.status = 'syncing';
        existing.retryCount += 1;
      }
    }

    return {
      batchId,
      reports: eligible.map(r => ({ ...r }))
    };
  }

  /**
   * Process server sync response and reconcile local queue
   */
  public applySyncResults(response: SyncBatchResponse): {
    syncedCount: number;
    failedCount: number;
    unresolvedCount: number;
  } {
    let syncedCount = 0;
    let failedCount = 0;
    const handledClientIds = new Set<string>();

    for (const res of response.results) {
      handledClientIds.add(res.clientId);
      const item = this.queue.get(res.clientId);
      if (!item) continue;

      if (res.outcome === 'accepted' || res.outcome === 'already_received') {
        item.status = 'synced';
        item.serverId = res.serverId;
        item.errorMessage = undefined;
        syncedCount++;
      } else {
        item.status = 'failed';
        item.errorMessage = res.errorMessage || res.errorCode || 'Server rejected item';
        failedCount++;
      }
    }

    // Any items marked as 'syncing' that were not included in response should revert to 'pending'
    let unresolvedCount = 0;
    for (const [clientId, item] of this.queue.entries()) {
      if (item.status === 'syncing' && !handledClientIds.has(clientId)) {
        item.status = 'pending';
        item.errorMessage = 'Network timeout / no server response for item';
        unresolvedCount++;
      }
    }

    return { syncedCount, failedCount, unresolvedCount };
  }

  /**
   * Retry all failed items by resetting to pending
   */
  public retryFailed(): number {
    let resetCount = 0;
    for (const item of this.queue.values()) {
      if (item.status === 'failed') {
        item.status = 'pending';
        resetCount++;
      }
    }
    return resetCount;
  }

  /**
   * Convert synced reports to unified Incident records for the dashboard
   */
  public toIncidentRecords(): IncidentRecord[] {
    return this.getAll()
      .filter(r => r.status === 'synced')
      .map(r => ({
        id: r.serverId || `inc-${r.clientId}`,
        clientId: r.clientId,
        sourceModule: 'fieldlink',
        type: r.type,
        priority: r.priority,
        notes: r.notes,
        location: { ...r.location },
        status: 'open',
        isSimulated: true,
        createdAt: r.createdAt,
        updatedAt: r.createdAt
      }));
  }

  /**
   * Merge external reports without creating duplicates (reconciliation strategy)
   */
  public mergeReports(incoming: QueuedReport[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const r of incoming) {
      const existing = this.queue.get(r.clientId);
      if (!existing) {
        this.queue.set(r.clientId, { ...r });
        added++;
      } else {
        // If incoming has synced status or serverId, upgrade local copy
        if (r.status === 'synced' && existing.status !== 'synced') {
          existing.status = 'synced';
          existing.serverId = r.serverId;
          existing.errorMessage = undefined;
          updated++;
        }
      }
    }

    return { added, updated };
  }

  /**
   * Clear all items (for demo reset)
   */
  public clear(): void {
    this.queue.clear();
  }
}
