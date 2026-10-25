/**
 * SENTINEL IndexedDB Client Storage Layer
 * Provides robust offline-first persistence for FieldLink incident queue,
 * SkyWatch alert acknowledgements, GeoIntel reviews, and MediRoute hazards.
 * Includes automatic localStorage / memory fallback for restrictive browser sandboxes.
 */

import {
  IncidentReport,
  AirspaceAlert,
  GeoIntelObservation,
  CasualtyRecord,
  RoadHazardEdge,
} from '@shared/types';
import {
  INITIAL_INCIDENTS,
  INITIAL_ALERTS,
  INITIAL_GEO_OBSERVATIONS,
  INITIAL_CASUALTIES,
  ROAD_HAZARD_EDGES,
} from '../data/fixtures';

const DB_NAME = 'SENTINEL_TACTICAL_DB';
const DB_VERSION = 1;

export class SentinelDatabase {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private useFallback: boolean = false;

  private async initDB(): Promise<IDBDatabase | null> {
    if (this.useFallback) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        this.useFallback = true;
        return resolve(null);
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('incidents')) {
            const store = db.createObjectStore('incidents', { keyPath: 'id' });
            store.createIndex('syncStatus', 'syncStatus', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }

          if (!db.objectStoreNames.contains('alerts')) {
            db.createObjectStore('alerts', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('geointel')) {
            db.createObjectStore('geointel', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('casualties')) {
            db.createObjectStore('casualties', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('hazards')) {
            db.createObjectStore('hazards', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('[Storage] IndexedDB open error, using localStorage fallback');
          this.useFallback = true;
          resolve(null);
        };
      } catch (e) {
        console.warn('[Storage] IndexedDB initialization exception, using fallback', e);
        this.useFallback = true;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // Fallback LocalStorage Helpers
  private getFallbackItems<T>(storeName: string): T[] {
    try {
      const raw = localStorage.getItem(`sentinel_${storeName}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setFallbackItems<T>(storeName: string, items: T[]): void {
    try {
      localStorage.setItem(`sentinel_${storeName}`, JSON.stringify(items));
    } catch (e) {
      console.warn(`[Storage] Failed to save fallback items for ${storeName}`, e);
    }
  }

  // Populate initial fixtures if DB is freshly opened
  public async seedDefaultFixturesIfEmpty(): Promise<void> {
    const db = await this.initDB();
    if (db) {
      const count = await this.count('incidents');
      if (count === 0) {
        await this.resetToDeterministicBaseline();
      }
    } else {
      const existing = this.getFallbackItems<IncidentReport>('incidents');
      if (existing.length === 0) {
        await this.resetToDeterministicBaseline();
      }
    }
  }

  public async resetToDeterministicBaseline(): Promise<void> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(['incidents', 'alerts', 'geointel', 'casualties', 'hazards'], 'readwrite');

          tx.objectStore('incidents').clear();
          tx.objectStore('alerts').clear();
          tx.objectStore('geointel').clear();
          tx.objectStore('casualties').clear();
          tx.objectStore('hazards').clear();

          const incStore = tx.objectStore('incidents');
          for (const inc of INITIAL_INCIDENTS) incStore.put(inc);

          const alertStore = tx.objectStore('alerts');
          for (const alt of INITIAL_ALERTS) alertStore.put(alt);

          const geoStore = tx.objectStore('geointel');
          for (const geo of INITIAL_GEO_OBSERVATIONS) geoStore.put(geo);

          const casStore = tx.objectStore('casualties');
          for (const cas of INITIAL_CASUALTIES) casStore.put(cas);

          const hazStore = tx.objectStore('hazards');
          for (const haz of ROAD_HAZARD_EDGES) hazStore.put(haz);

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (e) {
          this.useFallback = true;
          this.setFallbackItems('incidents', INITIAL_INCIDENTS);
          this.setFallbackItems('alerts', INITIAL_ALERTS);
          this.setFallbackItems('geointel', INITIAL_GEO_OBSERVATIONS);
          this.setFallbackItems('casualties', INITIAL_CASUALTIES);
          this.setFallbackItems('hazards', ROAD_HAZARD_EDGES);
          resolve();
        }
      });
    }

    // Fallback store reset
    this.setFallbackItems('incidents', INITIAL_INCIDENTS);
    this.setFallbackItems('alerts', INITIAL_ALERTS);
    this.setFallbackItems('geointel', INITIAL_GEO_OBSERVATIONS);
    this.setFallbackItems('casualties', INITIAL_CASUALTIES);
    this.setFallbackItems('hazards', ROAD_HAZARD_EDGES);
  }

  // Generic helpers
  private async count(storeName: string): Promise<number> {
    const db = await this.initDB();
    if (!db) {
      return this.getFallbackItems(storeName).length;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  // Incidents Store
  public async getIncidents(): Promise<IncidentReport[]> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<IncidentReport>('incidents');
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('incidents', 'readonly');
        const req = tx.objectStore('incidents').getAll();
        req.onsuccess = () => {
          const sorted = (req.result as IncidentReport[]).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          resolve(sorted);
        };
        req.onerror = () => {
          resolve(this.getFallbackItems<IncidentReport>('incidents'));
        };
      } catch {
        resolve(this.getFallbackItems<IncidentReport>('incidents'));
      }
    });
  }

  public async putIncident(report: IncidentReport): Promise<void> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<IncidentReport>('incidents');
      const idx = items.findIndex((i) => i.id === report.id || (i.clientId && i.clientId === report.clientId));
      if (idx >= 0) {
        items[idx] = report;
      } else {
        items.unshift(report);
      }
      this.setFallbackItems('incidents', items);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('incidents', 'readwrite');
        const req = tx.objectStore('incidents').put(report);
        req.onsuccess = () => resolve();
        req.onerror = () => {
          // Fallback on write error
          const items = this.getFallbackItems<IncidentReport>('incidents');
          const idx = items.findIndex((i) => i.id === report.id || (i.clientId && i.clientId === report.clientId));
          if (idx >= 0) items[idx] = report; else items.unshift(report);
          this.setFallbackItems('incidents', items);
          resolve();
        };
      } catch {
        const items = this.getFallbackItems<IncidentReport>('incidents');
        const idx = items.findIndex((i) => i.id === report.id || (i.clientId && i.clientId === report.clientId));
        if (idx >= 0) items[idx] = report; else items.unshift(report);
        this.setFallbackItems('incidents', items);
        resolve();
      }
    });
  }

  public async getPendingSyncIncidents(): Promise<IncidentReport[]> {
    const incidents = await this.getIncidents();
    return incidents.filter((inc) => inc.syncStatus === 'pending' || inc.syncStatus === 'failed');
  }

  // Alerts Store
  public async getAlerts(): Promise<AirspaceAlert[]> {
    const db = await this.initDB();
    if (!db) {
      return this.getFallbackItems<AirspaceAlert>('alerts');
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('alerts', 'readonly');
        const req = tx.objectStore('alerts').getAll();
        req.onsuccess = () => resolve(req.result as AirspaceAlert[]);
        req.onerror = () => resolve(this.getFallbackItems<AirspaceAlert>('alerts'));
      } catch {
        resolve(this.getFallbackItems<AirspaceAlert>('alerts'));
      }
    });
  }

  public async updateAlert(alert: AirspaceAlert): Promise<void> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<AirspaceAlert>('alerts');
      const idx = items.findIndex((a) => a.id === alert.id);
      if (idx >= 0) items[idx] = alert; else items.push(alert);
      this.setFallbackItems('alerts', items);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('alerts', 'readwrite');
        const req = tx.objectStore('alerts').put(alert);
        req.onsuccess = () => resolve();
        req.onerror = () => {
          const items = this.getFallbackItems<AirspaceAlert>('alerts');
          const idx = items.findIndex((a) => a.id === alert.id);
          if (idx >= 0) items[idx] = alert; else items.push(alert);
          this.setFallbackItems('alerts', items);
          resolve();
        };
      } catch {
        const items = this.getFallbackItems<AirspaceAlert>('alerts');
        const idx = items.findIndex((a) => a.id === alert.id);
        if (idx >= 0) items[idx] = alert; else items.push(alert);
        this.setFallbackItems('alerts', items);
        resolve();
      }
    });
  }

  // GeoIntel Store
  public async getGeoObservations(): Promise<GeoIntelObservation[]> {
    const db = await this.initDB();
    if (!db) return this.getFallbackItems<GeoIntelObservation>('geointel');
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('geointel', 'readonly');
        const req = tx.objectStore('geointel').getAll();
        req.onsuccess = () => resolve(req.result as GeoIntelObservation[]);
        req.onerror = () => resolve(this.getFallbackItems<GeoIntelObservation>('geointel'));
      } catch {
        resolve(this.getFallbackItems<GeoIntelObservation>('geointel'));
      }
    });
  }

  public async putGeoObservation(observation: GeoIntelObservation): Promise<void> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<GeoIntelObservation>('geointel');
      const idx = items.findIndex((o) => o.id === observation.id);
      if (idx >= 0) items[idx] = observation; else items.push(observation);
      this.setFallbackItems('geointel', items);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('geointel', 'readwrite');
        const req = tx.objectStore('geointel').put(observation);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Casualties Store
  public async getCasualties(): Promise<CasualtyRecord[]> {
    const db = await this.initDB();
    if (!db) return this.getFallbackItems<CasualtyRecord>('casualties');
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('casualties', 'readonly');
        const req = tx.objectStore('casualties').getAll();
        req.onsuccess = () => resolve(req.result as CasualtyRecord[]);
        req.onerror = () => resolve(this.getFallbackItems<CasualtyRecord>('casualties'));
      } catch {
        resolve(this.getFallbackItems<CasualtyRecord>('casualties'));
      }
    });
  }

  public async putCasualty(casualty: CasualtyRecord): Promise<void> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<CasualtyRecord>('casualties');
      const idx = items.findIndex((c) => c.id === casualty.id);
      if (idx >= 0) items[idx] = casualty; else items.push(casualty);
      this.setFallbackItems('casualties', items);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('casualties', 'readwrite');
        const req = tx.objectStore('casualties').put(casualty);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Hazards Store
  public async getHazards(): Promise<RoadHazardEdge[]> {
    const db = await this.initDB();
    if (!db) return this.getFallbackItems<RoadHazardEdge>('hazards');
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('hazards', 'readonly');
        const req = tx.objectStore('hazards').getAll();
        req.onsuccess = () => resolve(req.result as RoadHazardEdge[]);
        req.onerror = () => resolve(this.getFallbackItems<RoadHazardEdge>('hazards'));
      } catch {
        resolve(this.getFallbackItems<RoadHazardEdge>('hazards'));
      }
    });
  }

  public async putHazard(hazard: RoadHazardEdge): Promise<void> {
    const db = await this.initDB();
    if (!db) {
      const items = this.getFallbackItems<RoadHazardEdge>('hazards');
      const idx = items.findIndex((h) => h.id === hazard.id);
      if (idx >= 0) items[idx] = hazard; else items.push(hazard);
      this.setFallbackItems('hazards', items);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('hazards', 'readwrite');
        const req = tx.objectStore('hazards').put(hazard);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const dbService = new SentinelDatabase();
