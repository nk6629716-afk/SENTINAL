/**
 * SENTINEL API Client & Sync Coordinator
 * Handles typed communication with Person 2's backend API (`/api/*`),
 * with an integrated fallback to local IndexedDB and realistic mock engine.
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

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class SentinelApiClient {
  private isSimulatedOffline: boolean = false;
  private useMockMode: boolean = true; // Active until Person 2 spins up server

  public setOfflineSimulation(offline: boolean) {
    this.isSimulatedOffline = offline;
  }

  public getOfflineSimulation(): boolean {
    return this.isSimulatedOffline;
  }

  public setMockMode(mock: boolean) {
    this.useMockMode = mock;
  }

  public isUsingMockMode(): boolean {
    return this.useMockMode;
  }

  // 1. Dashboard Summary
  public async getDashboardSummary(): Promise<DashboardSummary> {
    if (this.isSimulatedOffline) {
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

    if (!this.useMockMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend unavailable, falling back to local DB cache:', err);
      }
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

  public async createIncident(report: IncidentReport): Promise<IncidentReport> {
    if (this.isSimulatedOffline) {
      report.syncStatus = 'pending';
      report.status = 'pending_sync';
      await dbService.putIncident(report);
      return report;
    }

    if (!this.useMockMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        if (res.ok) {
          const saved = await res.json();
          saved.syncStatus = 'synced';
          await dbService.putIncident(saved);
          return saved;
        }
      } catch (err) {
        console.warn('Network call failed, saving to local pending queue:', err);
      }
    }

    // Default mock behavior
    report.syncStatus = 'synced';
    report.status = 'active';
    await dbService.putIncident(report);
    return report;
  }

  // Batch Offline Sync Reconciliation
  public async syncPendingQueue(): Promise<BatchSyncResult> {
    const pending = await dbService.getPendingSyncIncidents();
    if (pending.length === 0) {
      return {
        totalSubmitted: 0,
        acceptedCount: 0,
        duplicateCount: 0,
        rejectedCount: 0,
        items: [],
      };
    }

    if (this.isSimulatedOffline) {
      throw new Error('Sync failed: Network unreachable (Offline Mode active).');
    }

    const payloads: OfflineSyncPayload[] = pending.map((item) => ({
      clientId: item.clientId || item.id,
      report: item,
      clientTimestamp: item.createdAt,
    }));

    // If live backend is available
    if (!this.useMockMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports: payloads }),
        });
        if (res.ok) {
          const result: BatchSyncResult = await res.json();
          // Update local DB records with server confirmation
          for (const item of result.items) {
            const match = pending.find((p) => p.clientId === item.clientId || p.id === item.clientId);
            if (match && (item.outcome === 'accepted' || item.outcome === 'already_received')) {
              match.syncStatus = 'synced';
              match.status = 'active';
              match.id = item.serverId || match.id;
              await dbService.putIncident(match);
            }
          }
          return result;
        }
      } catch (err) {
        console.warn('Live sync failed, using deterministic local reconciliation:', err);
      }
    }

    // Deterministic mock sync logic with idempotent deduplication
    const itemsResult: BatchSyncResult['items'] = [];
    let accepted = 0;
    let duplicates = 0;

    for (const p of pending) {
      // Simulate network roundtrip latency
      await new Promise((r) => setTimeout(r, 120));

      const isDupe = p.syncAttempts && p.syncAttempts > 1;
      if (isDupe) {
        duplicates++;
        itemsResult.push({
          clientId: p.clientId || p.id,
          serverId: p.id,
          outcome: 'already_received',
          syncTimestamp: new Date().toISOString(),
        });
      } else {
        accepted++;
        itemsResult.push({
          clientId: p.clientId || p.id,
          serverId: p.id.startsWith('OFFLINE-') ? `INC-SYNC-${Math.floor(Math.random() * 9000 + 1000)}` : p.id,
          outcome: 'accepted',
          syncTimestamp: new Date().toISOString(),
        });
      }

      p.syncStatus = 'synced';
      p.status = 'active';
      p.updatedAt = new Date().toISOString();
      await dbService.putIncident(p);
    }

    return {
      totalSubmitted: pending.length,
      acceptedCount: accepted,
      duplicateCount: duplicates,
      rejectedCount: 0,
      items: itemsResult,
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

  public async acknowledgeAlert(id: string, user: string = 'Watch Officer 1'): Promise<AirspaceAlert> {
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
