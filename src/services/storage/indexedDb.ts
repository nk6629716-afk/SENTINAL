/**
 * SENTINEL IndexedDB Client Storage Layer
 * Provides robust offline-first persistence for FieldLink incident queue,
 * SkyWatch alert acknowledgements, GeoIntel reviews, and MediRoute hazards.
 */

import {
  IncidentReport,
  AirspaceAlert,
  GeoIntelObservation,
  CasualtyRecord,
  RoadHazardEdge,
  SharedMapMarker,
  MeshMessage,
  SyncLogEntry,
  OutboxItem,
} from '@shared/types';
export type { SyncLogEntry, OutboxItem };
import {
  INITIAL_INCIDENTS,
  INITIAL_ALERTS,
  INITIAL_GEO_OBSERVATIONS,
  INITIAL_CASUALTIES,
  ROAD_HAZARD_EDGES,
} from '../data/fixtures';

const DB_NAME = 'SENTINEL_TACTICAL_DB';
const DB_VERSION = 3;

export class SentinelDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction;

        if (!db.objectStoreNames.contains('incidents')) {
          const store = db.createObjectStore('incidents', { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('clientId', 'clientId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        } else if (tx) {
          const store = tx.objectStore('incidents');
          if (!store.indexNames.contains('clientId')) {
            store.createIndex('clientId', 'clientId', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('geointel')) {
          const store = db.createObjectStore('geointel', { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        } else if (tx) {
          const store = tx.objectStore('geointel');
          if (!store.indexNames.contains('syncStatus')) {
            store.createIndex('syncStatus', 'syncStatus', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains('casualties')) {
          db.createObjectStore('casualties', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('hazards')) {
          db.createObjectStore('hazards', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('markers')) {
          db.createObjectStore('markers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('mesh_messages')) {
          db.createObjectStore('mesh_messages', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('sync_logs')) {
          db.createObjectStore('sync_logs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
          outboxStore.createIndex('status', 'status', { unique: false });
          outboxStore.createIndex('entityType', 'entityType', { unique: false });
          outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }


  // Populate initial fixtures if DB is freshly opened
  // FIX-11: Runs inside leader lock and as one IndexedDB readwrite transaction (check count, then put with stable ids)
  public async seedDefaultFixturesIfEmpty(): Promise<void> {
    const executeSeedInTx = async () => {
      const db = await this.initDB();
      const tx = db.transaction(['incidents', 'alerts', 'geointel', 'casualties', 'hazards'], 'readwrite');
      const incStore = tx.objectStore('incidents');
      const alertStore = tx.objectStore('alerts');
      const geoStore = tx.objectStore('geointel');
      const casStore = tx.objectStore('casualties');
      const hazStore = tx.objectStore('hazards');

      const countReq = incStore.count();

      return new Promise<void>((resolve, reject) => {
        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            for (const inc of INITIAL_INCIDENTS) incStore.put(inc);
            for (const alt of INITIAL_ALERTS) alertStore.put(alt);
            for (const geo of INITIAL_GEO_OBSERVATIONS) geoStore.put(geo);
            for (const cas of INITIAL_CASUALTIES) casStore.put(cas);
            for (const haz of ROAD_HAZARD_EDGES) hazStore.put(haz);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
    };

    if (typeof navigator !== 'undefined' && (navigator as any).locks?.request) {
      await (navigator as any).locks.request('sentinel-leader', async () => {
        await executeSeedInTx();
      });
    } else {
      await executeSeedInTx();
    }
  }

  public async resetToDeterministicBaseline(preserveUserData = true): Promise<void> {
    const db = await this.initDB();

    let preservedIncidents: IncidentReport[] = [];
    let preservedGeo: GeoIntelObservation[] = [];
    let preservedCasualties: CasualtyRecord[] = [];

    if (preserveUserData) {
      try {
        const readTx = db.transaction(['incidents', 'geointel', 'casualties'], 'readonly');
        const getIncReq = readTx.objectStore('incidents').getAll();
        const getGeoReq = readTx.objectStore('geointel').getAll();
        const getCasReq = readTx.objectStore('casualties').getAll();

        await new Promise<void>((resolve) => {
          readTx.oncomplete = () => {
            const allInc = (getIncReq.result || []) as IncidentReport[];
            const initialIncIds = new Set(INITIAL_INCIDENTS.map((i) => i.id));
            preservedIncidents = allInc.filter(
              (inc) => inc.syncStatus === 'pending' || inc.syncStatus === 'failed' || !initialIncIds.has(inc.id)
            );

            const allGeo = (getGeoReq.result || []) as GeoIntelObservation[];
            const initialGeoIds = new Set(INITIAL_GEO_OBSERVATIONS.map((g) => g.id));
            preservedGeo = allGeo.filter(
              (geo) => (geo as any).syncStatus === 'pending' || (geo as any).syncStatus === 'failed' || !initialGeoIds.has(geo.id)
            );

            const allCas = (getCasReq.result || []) as CasualtyRecord[];
            const initialCasIds = new Set(INITIAL_CASUALTIES.map((c) => c.id));
            preservedCasualties = allCas.filter((c) => !initialCasIds.has(c.id));

            resolve();
          };
          readTx.onerror = () => resolve();
        });
      } catch (err) {
        console.warn('[IndexedDB] Could not read pending records prior to reset:', err);
      }
    }

    const tx = db.transaction(['incidents', 'alerts', 'geointel', 'casualties', 'hazards'], 'readwrite');

    // Clear all stores
    tx.objectStore('incidents').clear();
    tx.objectStore('alerts').clear();
    tx.objectStore('geointel').clear();
    tx.objectStore('casualties').clear();
    tx.objectStore('hazards').clear();

    // Populate baseline fixtures
    const incStore = tx.objectStore('incidents');
    for (const inc of INITIAL_INCIDENTS) incStore.put(inc);
    for (const inc of preservedIncidents) incStore.put(inc);

    const alertStore = tx.objectStore('alerts');
    for (const alt of INITIAL_ALERTS) alertStore.put(alt);

    const geoStore = tx.objectStore('geointel');
    for (const geo of INITIAL_GEO_OBSERVATIONS) geoStore.put(geo);
    for (const geo of preservedGeo) geoStore.put(geo);

    const casStore = tx.objectStore('casualties');
    for (const cas of INITIAL_CASUALTIES) casStore.put(cas);
    for (const cas of preservedCasualties) casStore.put(cas);

    const hazStore = tx.objectStore('hazards');
    for (const haz of ROAD_HAZARD_EDGES) hazStore.put(haz);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Generic helpers
  private async count(storeName: string): Promise<number> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Incidents Store
  public async getIncidents(): Promise<IncidentReport[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('incidents', 'readonly');
      const req = tx.objectStore('incidents').getAll();
      req.onsuccess = () => {
        const sorted = (req.result as IncidentReport[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async putIncident(report: IncidentReport): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('incidents', 'readwrite');
      const req = tx.objectStore('incidents').put(report);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingSyncIncidents(): Promise<IncidentReport[]> {
    const incidents = await this.getIncidents();
    return incidents.filter((inc) => inc.syncStatus === 'pending' || inc.syncStatus === 'failed');
  }

  // Alerts Store
  public async getAlerts(): Promise<AirspaceAlert[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('alerts', 'readonly');
      const req = tx.objectStore('alerts').getAll();
      req.onsuccess = () => {
        const allAlerts = (req.result || []) as AirspaceAlert[];
        // Deduplicate any runaway duplicate alerts from previous sessions
        const seen = new Set<string>();
        const deduplicated: AirspaceAlert[] = [];
        const sorted = allAlerts.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        for (const a of sorted) {
          const key = `${a.trackId || 'unknown'}:${a.ruleName}:${a.acknowledged}`;
          if (!seen.has(key) || a.acknowledged) {
            seen.add(key);
            deduplicated.push(a);
          }
        }
        resolve(deduplicated);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async setAlerts(alerts: AirspaceAlert[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('alerts', 'readwrite');
      const store = tx.objectStore('alerts');
      store.clear();
      for (const a of alerts) {
        store.put(a);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async updateAlert(alert: AirspaceAlert): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('alerts', 'readwrite');
      const req = tx.objectStore('alerts').put(alert);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // GeoIntel Store
  public async getGeoObservations(): Promise<GeoIntelObservation[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('geointel', 'readonly');
      const req = tx.objectStore('geointel').getAll();
      req.onsuccess = () => resolve(req.result as GeoIntelObservation[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async putGeoObservation(observation: GeoIntelObservation): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('geointel', 'readwrite');
      const req = tx.objectStore('geointel').put(observation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingSyncGeoObservations(): Promise<GeoIntelObservation[]> {
    const list = await this.getGeoObservations();
    return list.filter((geo) => (geo as any).syncStatus === 'pending' || (geo as any).syncStatus === 'failed');
  }

  // Casualties Store
  public async getCasualties(): Promise<CasualtyRecord[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('casualties', 'readonly');
      const req = tx.objectStore('casualties').getAll();
      req.onsuccess = () => resolve(req.result as CasualtyRecord[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async putCasualty(casualty: CasualtyRecord): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('casualties', 'readwrite');
      const req = tx.objectStore('casualties').put(casualty);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Hazards Store
  public async getHazards(): Promise<RoadHazardEdge[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('hazards', 'readonly');
      const req = tx.objectStore('hazards').getAll();
      req.onsuccess = () => resolve(req.result as RoadHazardEdge[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async putHazard(hazard: RoadHazardEdge): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('hazards', 'readwrite');
      const req = tx.objectStore('hazards').put(hazard);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Markers Store
  public async getMarkers(): Promise<SharedMapMarker[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('markers', 'readonly');
      const req = tx.objectStore('markers').getAll();
      req.onsuccess = () => resolve(req.result as SharedMapMarker[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async putMarker(marker: SharedMapMarker): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('markers', 'readwrite');
      const req = tx.objectStore('markers').put(marker);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Mesh Messages Store
  public async getMeshMessages(): Promise<MeshMessage[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mesh_messages', 'readonly');
      const req = tx.objectStore('mesh_messages').getAll();
      req.onsuccess = () => {
        const sorted = (req.result as MeshMessage[]).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async putMeshMessage(msg: MeshMessage): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mesh_messages', 'readwrite');
      const req = tx.objectStore('mesh_messages').put(msg);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Sync Logs Store
  public async getSyncLogs(): Promise<SyncLogEntry[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_logs', 'readonly');
      const req = tx.objectStore('sync_logs').getAll();
      req.onsuccess = () => {
        const sorted = (req.result as SyncLogEntry[]).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async putSyncLog(log: SyncLogEntry): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_logs', 'readwrite');
      const req = tx.objectStore('sync_logs').put(log);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Deletion methods
  public async deleteIncident(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('incidents', 'readwrite');
      const req = tx.objectStore('incidents').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getIncidentById(id: string): Promise<IncidentReport | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('incidents', 'readonly');
      const req = tx.objectStore('incidents').get(id);
      req.onsuccess = () => resolve((req.result as IncidentReport) || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteGeoObservation(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('geointel', 'readwrite');
      const req = tx.objectStore('geointel').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getGeoObservationById(id: string): Promise<GeoIntelObservation | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('geointel', 'readonly');
      const req = tx.objectStore('geointel').get(id);
      req.onsuccess = () => resolve((req.result as GeoIntelObservation) || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteCasualty(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('casualties', 'readwrite');
      const req = tx.objectStore('casualties').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteHazard(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('hazards', 'readwrite');
      const req = tx.objectStore('hazards').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteMarker(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('markers', 'readwrite');
      const req = tx.objectStore('markers').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteMeshMessage(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mesh_messages', 'readwrite');
      const req = tx.objectStore('mesh_messages').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Outbox Store Methods
  public async getOutboxItems(): Promise<OutboxItem[]> {
    const db = await this.initDB();
    if (!db.objectStoreNames.contains('outbox')) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readonly');
      const req = tx.objectStore('outbox').getAll();
      req.onsuccess = () => {
        const sorted = (req.result as OutboxItem[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingOutboxItems(): Promise<OutboxItem[]> {
    const items = await this.getOutboxItems();
    return items.filter((item) => item.status === 'pending' || item.status === 'failed');
  }

  public async putOutboxItem(item: OutboxItem): Promise<void> {
    const db = await this.initDB();
    if (!db.objectStoreNames.contains('outbox')) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readwrite');
      const req = tx.objectStore('outbox').put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteOutboxItem(id: string): Promise<void> {
    const db = await this.initDB();
    if (!db.objectStoreNames.contains('outbox')) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readwrite');
      const req = tx.objectStore('outbox').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const dbService = new SentinelDatabase();

