/**
 * SENTINEL — Robust Offline-First Data Synchronization Manager
 * 
 * Capabilities:
 * - Detects network transitions and probes true backend reachability (does not rely only on navigator.onLine).
 * - Automatic foreground synchronization on app startup, connectivity restoration, and window focus.
 * - Bounded exponential backoff on transient network failures (3s -> 6s -> 12s -> 24s -> 30s max).
 * - Idempotent sync of durable IndexedDB records (FieldLink incidents, GeoIntel observations, outbox).
 * - Multi-tab coordination via BroadcastChannel ('sentinel_mesh_bus').
 * - Preserves un-synchronized records across reloads and non-destructive resets.
 * - Exposes reactive sync state: pending, syncing, synced, failed.
 */

import { api } from '../api/apiClient';
import { dbService } from '../storage/indexedDb';
import { IncidentReport, GeoIntelObservation, OutboxItem } from '@shared/types';
import { meshBus } from '../coordination/meshBus';

export interface SyncManagerState {
  isOnline: boolean;
  isBackendReachable: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncTime: string | null;
  lastSyncError: string | null;
}

export type SyncStateListener = (state: SyncManagerState) => void;

export class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isBackendReachable: boolean = false;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private failedCount: number = 0;
  private syncedCount: number = 0;
  private lastSyncTime: string | null = null;
  private lastSyncError: string | null = null;

  private listeners = new Set<SyncStateListener>();
  private checkTimer: any = null;
  private backoffDelay: number = 3000; // ms
  private readonly MIN_BACKOFF = 3000;
  private readonly MAX_BACKOFF = 30000;

  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.initNetworkListeners();
    this.initBroadcastChannel();
    this.refreshCounts();
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.handleConnectivityRestored();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.isBackendReachable = false;
      this.notifyListeners();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.triggerSync().catch(() => {});
      }
    });

    // Start background health & sync heartbeat
    this.scheduleNextCheck(1000);
  }

  private initBroadcastChannel(): void {
    meshBus.subscribe('*', (envelope) => {
      if (envelope.type === 'LOCAL_RECORD_CHANGED' || envelope.type === 'SYNC_COMPLETED') {
        this.refreshCounts();
      }
    });
  }

  private notifyTabMesh(type: string, data?: any): void {
    meshBus.publish(type, data);
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SyncManagerState {
    return {
      isOnline: this.isOnline,
      isBackendReachable: this.isBackendReachable,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      failedCount: this.failedCount,
      syncedCount: this.syncedCount,
      lastSyncTime: this.lastSyncTime,
      lastSyncError: this.lastSyncError,
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[SyncManager] Listener error:', e);
      }
    }
  }

  public async refreshCounts(): Promise<void> {
    try {
      const [pendingIncidents, pendingGeo, allIncidents] = await Promise.all([
        dbService.getPendingSyncIncidents(),
        dbService.getPendingSyncGeoObservations(),
        dbService.getIncidents(),
      ]);

      const failedIncidents = pendingIncidents.filter((i) => i.syncStatus === 'failed');
      const failedGeo = pendingGeo.filter((g) => (g as any).syncStatus === 'failed');
      const syncedInc = allIncidents.filter((i) => i.syncStatus === 'synced');

      this.pendingCount = pendingIncidents.length + pendingGeo.length;
      this.failedCount = failedIncidents.length + failedGeo.length;
      this.syncedCount = syncedInc.length;
      this.notifyListeners();
    } catch {
      // IndexedDB not ready or error
    }
  }

  private scheduleNextCheck(delayMs: number): void {
    if (this.checkTimer) clearTimeout(this.checkTimer);
    this.checkTimer = setTimeout(async () => {
      await this.probeAndSync();
    }, delayMs);
  }

  private async probeAndSync(): Promise<void> {
    if (api.getOfflineSimulation()) {
      this.isBackendReachable = false;
      this.notifyListeners();
      this.scheduleNextCheck(this.MAX_BACKOFF);
      return;
    }

    try {
      const reachable = await api.checkBackendAvailability();
      const changed = this.isBackendReachable !== reachable;
      this.isBackendReachable = reachable;

      if (reachable) {
        // Reset backoff on reachable backend
        this.backoffDelay = this.MIN_BACKOFF;

        // If we have pending operations, trigger sync
        await this.refreshCounts();
        if (this.pendingCount > 0 && !this.isSyncing) {
          await this.triggerSync();
        }
      } else {
        // Exponential backoff
        this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_BACKOFF);
      }

      if (changed) {
        this.notifyListeners();
      }
    } catch {
      this.isBackendReachable = false;
      this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_BACKOFF);
      this.notifyListeners();
    } finally {
      this.scheduleNextCheck(this.isBackendReachable ? 10000 : this.backoffDelay);
    }
  }

  private async handleConnectivityRestored(): Promise<void> {
    this.backoffDelay = this.MIN_BACKOFF;
    const reachable = await api.checkBackendAvailability();
    this.isBackendReachable = reachable;
    this.notifyListeners();

    if (reachable) {
      await this.triggerSync();
    }
  }

  /**
   * Main idempotent sync trigger.
   * Flushes pending FieldLink incidents and GeoIntel observations to backend.
   */
  public async triggerSync(): Promise<{
    incidentsSynced: number;
    geoSynced: number;
    errors: string[];
  }> {
    if (this.isSyncing) {
      return { incidentsSynced: 0, geoSynced: 0, errors: [] };
    }

    if (api.getOfflineSimulation()) {
      return { incidentsSynced: 0, geoSynced: 0, errors: ['Offline simulation mode is active'] };
    }

    this.isSyncing = true;
    this.lastSyncError = null;
    this.notifyListeners();

    const errors: string[] = [];
    let incidentsSynced = 0;
    let geoSynced = 0;

    try {
      // 1. Sync FieldLink Incidents Outbox
      const pendingInc = await dbService.getPendingSyncIncidents();
      if (pendingInc.length > 0) {
        try {
          const res = await api.syncPendingQueue();
          incidentsSynced = res.acceptedCount + (res.duplicateCount || 0);
        } catch (err: any) {
          const msg = err.message || 'Incident outbox sync failed';
          errors.push(msg);
          this.lastSyncError = msg;
        }
      }

      // 2. Sync GeoIntel Observations Outbox
      const pendingGeo = await dbService.getPendingSyncGeoObservations();
      if (pendingGeo.length > 0) {
        try {
          const res = await api.syncPendingGeoObservations();
          geoSynced = res.synced;
          if (res.failed > 0) {
            errors.push(`${res.failed} GeoIntel observations failed server validation`);
          }
        } catch (err: any) {
          const msg = err.message || 'GeoIntel observation sync failed';
          errors.push(msg);
          if (!this.lastSyncError) this.lastSyncError = msg;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      await this.refreshCounts();

      // Broadcast update to other tabs
      this.notifyTabMesh('SYNC_COMPLETED', {
        incidentsSynced,
        geoSynced,
        timestamp: this.lastSyncTime,
      });

      return { incidentsSynced, geoSynced, errors };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Called when any module creates or updates a local record,
   * to immediately record the outbox item and notify other tabs.
   */
  public async recordLocalMutation(
    entityType: OutboxItem['entityType'],
    action: OutboxItem['action'],
    payload: any
  ): Promise<void> {
    try {
      const id = payload.clientId || payload.id || `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const outboxItem: OutboxItem = {
        id,
        entityType,
        action,
        payload,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
      };
      await dbService.putOutboxItem(outboxItem);
      await this.refreshCounts();

      // Notify other open tabs through tactical mesh
      this.notifyTabMesh('LOCAL_RECORD_CHANGED', { entityType, action, id });
    } catch (err) {
      console.warn('[SyncManager] Failed to record mutation in outbox:', err);
    }
  }
}

export const syncManager = new SyncManager();
