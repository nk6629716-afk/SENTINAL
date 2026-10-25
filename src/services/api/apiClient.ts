/**
 * SENTINEL API Client & Sync Coordinator
 * Handles typed communication with the backend API (`/api/*`),
 * backed by an IndexedDB local-first storage layer with offline reconciliation.
 */

import {
  IncidentReport,
  TelemetryTrack,
  AirspaceAlert,
  GeoIntelObservation,
  CasualtyRecord,
  RoadHazardEdge,
  BatchSyncResult,
  OfflineSyncPayload,
  DashboardSummary,
} from '@shared/types';
import { dbService } from '../storage/indexedDb';
import { INITIAL_TRACKS, RESTRICTED_AIRSPACE_ZONES } from '../data/fixtures';

// Configuration: uses relative /api to work with Vite proxy locally and API gateway in deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class SentinelApiClient {
  private isSimulatedOffline: boolean = false;

  public setOfflineSimulation(offline: boolean) {
    this.isSimulatedOffline = offline;
  }

  public getOfflineSimulation(): boolean {
    return this.isSimulatedOffline;
  }

  public isNetworkOffline(): boolean {
    if (this.isSimulatedOffline) return true;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return false;
  }

  public async isBackendAvailable(): Promise<boolean> {
    if (this.isNetworkOffline()) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  // 1. Dashboard Summary
  public async getDashboardSummary(): Promise<DashboardSummary> {
    const isOffline = this.isNetworkOffline();

    if (isOffline) {
      const incidents = await dbService.getIncidents();
      const pendingSync = incidents.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed').length;
      const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'in_progress').length;
      const casualties = await dbService.getCasualties();
      const criticalPatients = casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated').length;
      const hazards = await dbService.getHazards();
      const blockedRoads = hazards.filter((h) => h.blocked).length;
      const alerts = await dbService.getAlerts();
      const unackAlerts = alerts.filter((a) => !a.acknowledged).length;
      const geoObs = await dbService.getGeoObservations();
      const pendingGeo = geoObs.filter((g) => g.reviewStatus === 'pending').length;

      return {
        systemStatus: 'offline_mode',
        pendingSyncCount: pendingSync,
        activeIncidentsCount: activeIncidents,
        activeAirspaceTracksCount: INITIAL_TRACKS.length,
        unacknowledgedAlertsCount: unackAlerts,
        pendingGeoReviewsCount: pendingGeo,
        criticalPatientsAwaitingEvac: criticalPatients,
        blockedRoadSegmentsCount: blockedRoads,
        lastSyncTimestamp: null,
        isSimulated: true,
      };
    }

    // Try live server summary if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE_URL}/dashboard`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const body = await res.json();
        return body.data || body;
      }
    } catch {
      // Fallback to local state derivation
    }

    // Local cached derivation
    const incidents = await dbService.getIncidents();
    const casualties = await dbService.getCasualties();
    const hazards = await dbService.getHazards();
    const alerts = await dbService.getAlerts();
    const geoObs = await dbService.getGeoObservations();

    return {
      systemStatus: 'nominal',
      pendingSyncCount: incidents.filter((i) => i.syncStatus === 'pending').length,
      activeIncidentsCount: incidents.filter((i) => i.status !== 'resolved').length,
      activeAirspaceTracksCount: INITIAL_TRACKS.length,
      unacknowledgedAlertsCount: alerts.filter((a) => !a.acknowledged).length,
      pendingGeoReviewsCount: geoObs.filter((g) => g.reviewStatus === 'pending').length,
      criticalPatientsAwaitingEvac: casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated').length,
      blockedRoadSegmentsCount: hazards.filter((h) => h.blocked).length,
      lastSyncTimestamp: new Date().toISOString(),
      isSimulated: true,
    };
  }

  // 2. Incidents (FieldLink & Shared)
  public async getIncidents(): Promise<IncidentReport[]> {
    return await dbService.getIncidents();
  }

  public async createIncident(report: IncidentReport): Promise<{
    report: IncidentReport;
    isServerSynced: boolean;
    message: string;
  }> {
    const isOffline = this.isNetworkOffline();

    if (isOffline) {
      report.syncStatus = 'pending';
      report.status = 'pending_sync';
      await dbService.putIncident(report);
      return {
        report,
        isServerSynced: false,
        message: 'Saved locally in IndexedDB outbox. Marked as "Pending sync" (Offline Mode active).',
      };
    }

    // Try communicating with live backend API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const serverRecord = data.data || data;
        report.id = serverRecord.id || report.id;
        report.syncStatus = 'synced';
        report.status = 'active';
        await dbService.putIncident(report);
        return {
          report,
          isServerSynced: true,
          message: `Incident broadcasted and confirmed synchronized with command center (${report.id}).`,
        };
      }
    } catch (err) {
      console.warn('[API] Backend unreachable, saving report to local outbox:', err);
    }

    // Backend unreachable: save locally as pending
    report.syncStatus = 'pending';
    report.status = 'pending_sync';
    await dbService.putIncident(report);
    return {
      report,
      isServerSynced: false,
      message: 'Command server unreachable. Report saved locally in IndexedDB outbox (Pending sync).',
    };
  }

  // Batch Offline Sync Reconciliation
  public async syncPendingQueue(): Promise<{
    totalSubmitted: number;
    acceptedCount: number;
    duplicateCount: number;
    rejectedCount: number;
    items: any[];
    serverConnected: boolean;
    message: string;
  }> {
    const pending = await dbService.getPendingSyncIncidents();
    if (pending.length === 0) {
      return {
        totalSubmitted: 0,
        acceptedCount: 0,
        duplicateCount: 0,
        rejectedCount: 0,
        items: [],
        serverConnected: true,
        message: 'Outbox is empty. No pending reports require synchronization.',
      };
    }

    if (this.isNetworkOffline()) {
      throw new Error('Synchronization unavailable: Device/browser is currently offline.');
    }

    const payloads: OfflineSyncPayload[] = pending.map((item) => ({
      clientId: item.clientId || item.id,
      report: item,
      clientTimestamp: item.createdAt,
    }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: payloads }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const body = await res.json();
        const result: BatchSyncResult = body.data || body;
        const resultItems = result.items || result.results || [];

        for (const itemResult of resultItems) {
          const match = pending.find(
            (p) => p.clientId === itemResult.clientId || p.id === itemResult.clientId
          );
          if (
            match &&
            (itemResult.outcome === 'accepted' ||
              itemResult.outcome === 'already_received' ||
              itemResult.status === 'accepted')
          ) {
            match.syncStatus = 'synced';
            match.status = 'active';
            if (itemResult.serverId) {
              match.id = itemResult.serverId;
            }
            await dbService.putIncident(match);
          }
        }

        return {
          totalSubmitted: pending.length,
          acceptedCount: result.acceptedCount ?? 0,
          duplicateCount: result.duplicateCount ?? 0,
          rejectedCount: result.rejectedCount ?? 0,
          items: resultItems,
          serverConnected: true,
          message: `Synchronized ${result.acceptedCount} new report(s) with command server (${result.duplicateCount} duplicate(s) reconciled).`,
        };
      }
    } catch (err) {
      console.warn('[Sync] Server sync request failed:', err);
    }

    // Backend was unreachable: preserve pending state truthfully without falsifying sync
    return {
      totalSubmitted: pending.length,
      acceptedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      items: [],
      serverConnected: false,
      message: `Synchronization waiting for backend configuration: ${pending.length} report(s) safely retained in local IndexedDB outbox.`,
    };
  }

  // 3. SkyWatch Airspace Tracks & Alerts
  public async getTelemetryTracks(): Promise<TelemetryTrack[]> {
    return INITIAL_TRACKS;
  }

  public async getRestrictedZones(): Promise<typeof RESTRICTED_AIRSPACE_ZONES> {
    return RESTRICTED_AIRSPACE_ZONES;
  }

  public async getAirspaceAlerts(): Promise<AirspaceAlert[]> {
    return await dbService.getAlerts();
  }

  public async acknowledgeAlert(id: string, user: string = 'Duty Watch Officer'): Promise<AirspaceAlert> {
    const alerts = await dbService.getAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) throw new Error(`Alert with id ${id} not found.`);

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = user;

    await dbService.updateAlert(alert);
    return alert;
  }

  // 4. GeoIntel Observations & Candidate Reviews
  public async getGeoObservations(): Promise<GeoIntelObservation[]> {
    return await dbService.getGeoObservations();
  }

  public async updateGeoCandidateReview(
    obsId: string,
    candidateId: string,
    reviewed: boolean,
    notes?: string
  ): Promise<GeoIntelObservation> {
    const observations = await dbService.getGeoObservations();
    const obs = observations.find((o) => o.id === obsId);
    if (!obs) throw new Error(`Observation ${obsId} not found`);

    const candidate = obs.candidates.find((c) => c.id === candidateId);
    if (candidate) {
      candidate.reviewed = reviewed;
      if (notes !== undefined) candidate.analystNotes = notes;
    }

    const allReviewed = obs.candidates.every((c) => c.reviewed);
    obs.reviewStatus = allReviewed ? 'reviewed' : 'pending';
    await dbService.putGeoObservation(obs);
    return obs;
  }

  // 5. MediRoute Casualties & Hazards
  public async getCasualties(): Promise<CasualtyRecord[]> {
    return await dbService.getCasualties();
  }

  public async createCasualty(casualty: CasualtyRecord): Promise<CasualtyRecord> {
    await dbService.putCasualty(casualty);
    return casualty;
  }

  public async updateCasualtyStatus(
    id: string,
    status: CasualtyRecord['status'],
    hospitalId?: string
  ): Promise<CasualtyRecord> {
    const casualties = await dbService.getCasualties();
    const cas = casualties.find((c) => c.id === id);
    if (!cas) throw new Error(`Casualty ${id} not found`);

    cas.status = status;
    if (hospitalId) cas.assignedHospitalId = hospitalId;
    cas.updatedAt = new Date().toISOString();

    await dbService.putCasualty(cas);
    return cas;
  }

  public async getRoadHazards(): Promise<RoadHazardEdge[]> {
    return await dbService.getHazards();
  }

  public async toggleRoadBlockage(edgeId: string, blocked: boolean): Promise<RoadHazardEdge> {
    const hazards = await dbService.getHazards();
    const edge = hazards.find((h) => h.id === edgeId);
    if (!edge) throw new Error(`Hazard edge ${edgeId} not found`);

    edge.blocked = blocked;
    edge.updatedAt = new Date().toISOString();
    await dbService.putHazard(edge);
    return edge;
  }
}

export const api = new SentinelApiClient();
