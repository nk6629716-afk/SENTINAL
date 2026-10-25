import { db } from '../db/database';
import {
  SyncBatchRequest,
  SyncBatchResponse,
  SyncItemResult,
  Incident,
} from '../../../shared/types';
import { validateCreateIncident } from '../validation/validators';
import { eventBus } from '../realtime/eventBus';

export class SyncService {
  public processBatch(batch: SyncBatchRequest): SyncBatchResponse {
    const results: SyncItemResult[] = [];
    const now = new Date().toISOString();

    let acceptedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    const rawItems: any[] = batch.items || (batch as any).reports || [];
    const items = rawItems.map((entry) => {
      if (entry && typeof entry === 'object' && entry.report && typeof entry.report === 'object') {
        return {
          ...entry.report,
          clientId: entry.clientId || entry.report.clientId,
          createdAt: entry.clientTimestamp || entry.report.createdAt,
        };
      }
      return entry;
    });

    for (const item of items) {
      if (!item || typeof item !== 'object' || !item.clientId) {
        results.push({
          clientId: item?.clientId || 'unknown',
          serverId: undefined,
          outcome: 'rejected',
          status: 'rejected',
          reason: 'Missing or invalid clientId on sync item',
          errorMessage: 'Missing or invalid clientId on sync item',
          syncedAt: now,
          syncTimestamp: now,
        });
        rejectedCount++;
        continue;
      }

      // Check for duplicate / already received
      const existingRecorded = db.getSyncRegistryItem(item.clientId);
      if (existingRecorded) {
        results.push({
          clientId: item.clientId,
          serverId: existingRecorded.serverId,
          outcome: 'already_received',
          status: 'already_received',
          reason: 'Item was previously processed and confirmed',
          syncedAt: existingRecorded.syncedAt,
          syncTimestamp: existingRecorded.syncedAt,
        });
        duplicateCount++;
        continue;
      }

      // Also check incident store directly by clientId
      const existingIncident = db.findIncidentByClientId(item.clientId);
      if (existingIncident) {
        const itemResult: SyncItemResult = {
          clientId: item.clientId,
          serverId: existingIncident.id,
          outcome: 'already_received',
          status: 'already_received',
          reason: 'Incident with matching clientId already exists in store',
          syncedAt: existingIncident.syncedAt || now,
          syncTimestamp: existingIncident.syncedAt || now,
        };
        db.recordSyncOutcome(itemResult);
        results.push(itemResult);
        duplicateCount++;
        continue;
      }

      // Validate item independently
      try {
        const validated = validateCreateIncident(item);

        const serverId = `INC-SYNC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const incident: Incident = {
          id: serverId,
          clientId: item.clientId,
          sourceModule: validated.sourceModule,
          type: validated.type,
          priority: validated.priority,
          status: validated.status || 'active',
          title: validated.title,
          notes: validated.notes,
          location: validated.location,
          createdAt: validated.createdAt || now, // Preserve original client creation time
          updatedAt: now,
          syncedAt: now,
          isSimulated: true,
        };

        db.saveIncident(incident);

        const itemResult: SyncItemResult = {
          clientId: item.clientId,
          serverId,
          outcome: 'accepted',
          status: 'accepted',
          syncedAt: now,
          syncTimestamp: now,
        };

        db.recordSyncOutcome(itemResult);
        results.push(itemResult);
        acceptedCount++;

        eventBus.publish('incident:created', incident);
      } catch (err: any) {
        const itemResult: SyncItemResult = {
          clientId: item.clientId,
          serverId: null,
          outcome: 'rejected',
          status: 'rejected',
          reason: err.message || 'Validation failed for sync item',
          errorMessage: err.message || 'Validation failed for sync item',
          syncedAt: now,
          syncTimestamp: now,
        };
        db.recordSyncOutcome(itemResult);
        results.push(itemResult);
        rejectedCount++;
      }
    }

    const response: SyncBatchResponse = {
      results,
      items: results,
      totalSubmitted: results.length,
      processedCount: results.length,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      failedCount: rejectedCount,
      processedAt: now,
    };

    eventBus.publish('sync:completed', response);
    return response;
  }
}

export const syncService = new SyncService();
