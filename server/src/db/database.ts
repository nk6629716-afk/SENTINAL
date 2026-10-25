import fs from 'fs';
import path from 'path';
import {
  Incident,
  TelemetryTrack,
  Alert,
  GeoIntelObservation,
  Patient,
  HazardEdge,
  RoadGraphNode,
  RoadGraphEdge,
  SyncItemResult,
} from '../../../shared/types';
import {
  INITIAL_INCIDENTS,
  INITIAL_TRACKS,
  INITIAL_ALERTS,
  INITIAL_GEO_OBSERVATIONS,
  INITIAL_PATIENTS,
  INITIAL_HAZARDS,
  ROAD_GRAPH_NODES,
  ROAD_GRAPH_EDGES,
} from '../../../shared/fixtures';
import { config } from '../config';

export interface DatabaseState {
  incidents: Record<string, Incident>;
  syncRegistry: Record<string, SyncItemResult>; // maps clientId -> previous outcome
  tracks: Record<string, TelemetryTrack>;
  alerts: Record<string, Alert>;
  observations: Record<string, GeoIntelObservation>;
  patients: Record<string, Patient>;
  hazards: Record<string, HazardEdge>;
  graphNodes: RoadGraphNode[];
  graphEdges: RoadGraphEdge[];
  metadata: {
    lastResetAt: string;
    version: string;
    isSimulated: true;
  };
}

export class Database {
  private state: DatabaseState;
  private filePath: string;
  private isMemoryMode: boolean;

  constructor(filePath?: string, isMemoryMode = config.storageMode === 'memory') {
    this.isMemoryMode = isMemoryMode;
    const resolvedDir = path.resolve(config.dataDir);
    this.filePath = filePath || path.join(resolvedDir, 'sentinel_store.json');

    if (!this.isMemoryMode && !fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    this.state = this.loadFromDisk();
  }

  private getDefaultState(): DatabaseState {
    const incidents: Record<string, Incident> = {};
    INITIAL_INCIDENTS.forEach((inc) => {
      incidents[inc.id] = { ...inc };
    });

    const syncRegistry: Record<string, SyncItemResult> = {};
    INITIAL_INCIDENTS.forEach((inc) => {
      if (inc.clientId) {
        syncRegistry[inc.clientId] = {
          clientId: inc.clientId,
          serverId: inc.id,
          outcome: 'accepted',
          status: 'accepted',
          syncedAt: inc.syncedAt || inc.createdAt,
        };
      }
    });

    const tracks: Record<string, TelemetryTrack> = {};
    INITIAL_TRACKS.forEach((trk) => {
      tracks[trk.id] = { ...trk };
    });

    const alerts: Record<string, Alert> = {};
    INITIAL_ALERTS.forEach((alt) => {
      alerts[alt.id] = { ...alt };
    });

    const observations: Record<string, GeoIntelObservation> = {};
    INITIAL_GEO_OBSERVATIONS.forEach((obs) => {
      observations[obs.id] = { ...obs };
    });

    const patients: Record<string, Patient> = {};
    INITIAL_PATIENTS.forEach((pat) => {
      patients[pat.id] = { ...pat };
    });

    const hazards: Record<string, HazardEdge> = {};
    INITIAL_HAZARDS.forEach((haz) => {
      hazards[haz.id] = { ...haz };
    });

    return {
      incidents,
      syncRegistry,
      tracks,
      alerts,
      observations,
      patients,
      hazards,
      graphNodes: [...ROAD_GRAPH_NODES],
      graphEdges: [...ROAD_GRAPH_EDGES],
      metadata: {
        lastResetAt: new Date().toISOString(),
        version: '1.0.0',
        isSimulated: true,
      },
    };
  }

  private loadFromDisk(): DatabaseState {
    if (this.isMemoryMode) {
      return this.getDefaultState();
    }

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseState;
        return parsed;
      }
    } catch (err) {
      console.warn(`[DB] Could not load persisted data from ${this.filePath}, initializing fresh baseline:`, err);
    }

    const defaultState = this.getDefaultState();
    this.persist(defaultState);
    return defaultState;
  }

  private persist(stateToSave: DatabaseState = this.state): void {
    if (this.isMemoryMode) {
      return;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch (renameErr) {
        // Fallback for Windows file locks / OneDrive sync
        fs.copyFileSync(tempPath, this.filePath);
        try { fs.unlinkSync(tempPath); } catch {}
      }
    } catch (err) {
      console.error(`[DB] Failed to persist database state to ${this.filePath}:`, err);
    }
  }

  public resetToBaseline(): void {
    this.state = this.getDefaultState();
    this.persist();
  }

  public getRawState(): Readonly<DatabaseState> {
    return this.state;
  }

  // ------------------------------------------------------------------------
  // Incidents
  // ------------------------------------------------------------------------
  public getIncidents(filter?: {
    sourceModule?: string;
    type?: string;
    priority?: string;
    status?: string;
    search?: string;
  }): Incident[] {
    let list = Object.values(this.state.incidents);

    if (filter) {
      if (filter.sourceModule) {
        list = list.filter((i) => i.sourceModule === filter.sourceModule);
      }
      if (filter.type) {
        list = list.filter((i) => i.type === filter.type);
      }
      if (filter.priority) {
        list = list.filter((i) => i.priority === filter.priority);
      }
      if (filter.status) {
        list = list.filter((i) => i.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.notes.toLowerCase().includes(q) ||
            (i.location.name && i.location.name.toLowerCase().includes(q))
        );
      }
    }

    // Stable sort: newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getIncidentById(id: string): Incident | null {
    return this.state.incidents[id] || null;
  }

  public findIncidentByClientId(clientId: string): Incident | null {
    return Object.values(this.state.incidents).find((i) => i.clientId === clientId) || null;
  }

  public saveIncident(incident: Incident): Incident {
    this.state.incidents[incident.id] = { ...incident };
    if (incident.clientId) {
      this.state.syncRegistry[incident.clientId] = {
        clientId: incident.clientId,
        serverId: incident.id,
        outcome: 'accepted',
        status: 'accepted',
        syncedAt: incident.syncedAt || new Date().toISOString(),
      };
    }
    this.persist();
    return this.state.incidents[incident.id];
  }

  // ------------------------------------------------------------------------
  // Sync Registry (Idempotency)
  // ------------------------------------------------------------------------
  public getSyncRegistryItem(clientId: string): SyncItemResult | null {
    return this.state.syncRegistry[clientId] || null;
  }

  public recordSyncOutcome(item: SyncItemResult): void {
    this.state.syncRegistry[item.clientId] = { ...item };
    this.persist();
  }

  // ------------------------------------------------------------------------
  // SkyWatch Telemetry & Alerts
  // ------------------------------------------------------------------------
  public getTracks(): TelemetryTrack[] {
    return Object.values(this.state.tracks);
  }

  public getTrackById(id: string): TelemetryTrack | null {
    return this.state.tracks[id] || null;
  }

  public updateTrack(track: TelemetryTrack): TelemetryTrack {
    this.state.tracks[track.id] = { ...track };
    this.persist();
    return this.state.tracks[track.id];
  }

  public getAlerts(filter?: { acknowledged?: boolean; trackId?: string; severity?: string }): Alert[] {
    let list = Object.values(this.state.alerts);
    if (filter) {
      if (filter.acknowledged !== undefined) {
        list = list.filter((a) => a.acknowledged === filter.acknowledged);
      }
      if (filter.trackId) {
        list = list.filter((a) => a.trackId === filter.trackId);
      }
      if (filter.severity) {
        list = list.filter((a) => a.severity === filter.severity);
      }
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getAlertById(id: string): Alert | null {
    return this.state.alerts[id] || null;
  }

  public saveAlert(alert: Alert): Alert {
    this.state.alerts[alert.id] = { ...alert };
    this.persist();
    return this.state.alerts[alert.id];
  }

  // ------------------------------------------------------------------------
  // GeoIntel Observations
  // ------------------------------------------------------------------------
  public getObservations(filter?: { reviewStatus?: string; samplePairId?: string }): GeoIntelObservation[] {
    let list = Object.values(this.state.observations);
    if (filter) {
      if (filter.reviewStatus) {
        list = list.filter((o) => o.reviewStatus === filter.reviewStatus);
      }
      if (filter.samplePairId) {
        list = list.filter((o) => o.samplePairId === filter.samplePairId);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getObservationById(id: string): GeoIntelObservation | null {
    return this.state.observations[id] || null;
  }

  public saveObservation(observation: GeoIntelObservation): GeoIntelObservation {
    this.state.observations[observation.id] = { ...observation };
    this.persist();
    return this.state.observations[observation.id];
  }

  // ------------------------------------------------------------------------
  // MediRoute Patients & Hazards
  // ------------------------------------------------------------------------
  public getPatients(filter?: { workflowStatus?: string; triageCategory?: string }): Patient[] {
    let list = Object.values(this.state.patients);
    if (filter) {
      if (filter.workflowStatus) {
        list = list.filter((p) => p.workflowStatus === filter.workflowStatus);
      }
      if (filter.triageCategory) {
        list = list.filter((p) => p.triageCategory === filter.triageCategory);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPatientById(id: string): Patient | null {
    return this.state.patients[id] || null;
  }

  public savePatient(patient: Patient): Patient {
    this.state.patients[patient.id] = { ...patient };
    this.persist();
    return this.state.patients[patient.id];
  }

  public getHazards(filter?: { blocked?: boolean }): HazardEdge[] {
    let list = Object.values(this.state.hazards);
    if (filter && filter.blocked !== undefined) {
      list = list.filter((h) => h.blocked === filter.blocked);
    }
    return list;
  }

  public getHazardById(id: string): HazardEdge | null {
    return this.state.hazards[id] || null;
  }

  public getHazardByEdgeId(edgeId: string): HazardEdge | null {
    return Object.values(this.state.hazards).find((h) => h.edgeId === edgeId) || null;
  }

  public saveHazard(hazard: HazardEdge): HazardEdge {
    this.state.hazards[hazard.id] = { ...hazard };
    this.persist();
    return this.state.hazards[hazard.id];
  }

  public getRoadGraph(): { nodes: RoadGraphNode[]; edges: RoadGraphEdge[] } {
    return {
      nodes: this.state.graphNodes,
      edges: this.state.graphEdges,
    };
  }
}

// Singleton database instance
export const db = new Database();
