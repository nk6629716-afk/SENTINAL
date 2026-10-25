import { db } from '../db/database';
import {
  TelemetryTrack,
  Alert,
  AnomalyRuleName,
} from '../../../shared/types';
import { eventBus } from '../realtime/eventBus';

export class TelemetryService {
  // Configured fictional restricted zone for demo
  private restrictedZone = {
    name: 'Sector Echo - Humanitarian Corridor',
    centerLat: 34.0580,
    centerLng: -118.2510,
    radiusKm: 0.6,
  };

  public getTracks(): TelemetryTrack[] {
    return db.getTracks();
  }

  public getTrackById(id: string): TelemetryTrack | null {
    return db.getTrackById(id);
  }

  public getAlerts(filter?: { acknowledged?: boolean; trackId?: string; severity?: string }): Alert[] {
    return db.getAlerts(filter);
  }

  public getAlertById(id: string): Alert | null {
    return db.getAlertById(id);
  }

  public acknowledgeAlert(id: string): Alert | null {
    const alert = db.getAlertById(id);
    if (!alert) return null;

    const updated: Alert = {
      ...alert,
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
    };

    db.saveAlert(updated);
    eventBus.publish('alert:acknowledged', updated);
    return updated;
  }

  // Simulation step: advance track positions and evaluate rules deterministically
  public stepSimulation(): { tracks: TelemetryTrack[]; newAlerts: Alert[] } {
    const tracks = db.getTracks();
    const newAlerts: Alert[] = [];
    const now = new Date().toISOString();

    for (const track of tracks) {
      const speedKts = track.speedKts ?? (track.speed ? track.speed * 1.94384 : 40);
      const headingDeg = track.headingDeg ?? track.heading ?? 0;
      const speedKmPerMin = (speedKts * 1.852) / 60;
      const headingRad = (headingDeg * Math.PI) / 180;
      
      const trackLat = track.position?.lat ?? track.lat ?? 0;
      const trackLng = track.position?.lng ?? track.lng ?? 0;
      const altitudeMeters = track.position?.altitudeMeters ?? track.altitude ?? 120;

      const deltaLat = (Math.cos(headingRad) * (speedKmPerMin * 0.05)) / 111;
      const deltaLng = (Math.sin(headingRad) * (speedKmPerMin * 0.05)) / (111 * Math.cos((trackLat * Math.PI) / 180));

      const newLat = parseFloat((trackLat + deltaLat).toFixed(6));
      const newLng = parseFloat((trackLng + deltaLng).toFixed(6));

      const updatedTrack: TelemetryTrack = {
        ...track,
        lat: newLat,
        lng: newLng,
        heading: headingDeg,
        speed: track.speed ?? Math.round(speedKts / 1.94384),
        speedKts,
        headingDeg,
        position: {
          lat: newLat,
          lng: newLng,
          altitudeMeters,
        },
        timestamp: now,
      };

      db.updateTrack(updatedTrack);

      // Check Anomaly Rules
      // 1. Zone incursion
      const distToZone = this.calculateDistanceKm(
        newLat,
        newLng,
        this.restrictedZone.centerLat,
        this.restrictedZone.centerLng
      );

      if (distToZone <= this.restrictedZone.radiusKm && !updatedTrack.anomalyFlags?.includes('ZONE_INCURSION')) {
        const alert: Alert = {
          id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          trackId: updatedTrack.id,
          severity: 'critical',
          ruleName: 'ZONE_INCURSION',
          observedValue: `${(distToZone * 1000).toFixed(0)}m from center of ${this.restrictedZone.name}`,
          threshold: `Within ${this.restrictedZone.radiusKm * 1000}m boundary`,
          explanation: `Simulated track entered protected zone airspace (${this.restrictedZone.name}) without flight clearance.`,
          timestamp: now,
          acknowledged: false,
          isSimulated: true,
        };

        db.saveAlert(alert);
        newAlerts.push(alert);
        eventBus.publish('alert:triggered', alert);
      }

      // 2. High speed / sudden acceleration rule
      if (speedKts > 75 && !updatedTrack.anomalyFlags?.includes('SUDDEN_ACCELERATION')) {
        const alert: Alert = {
          id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          trackId: updatedTrack.id,
          severity: 'high',
          ruleName: 'SUDDEN_ACCELERATION',
          observedValue: `${speedKts} kts observed`,
          threshold: '> 75 kts maximum authorized ceiling',
          explanation: 'Target speed exceeded authorized civilian corridor speed threshold.',
          timestamp: now,
          acknowledged: false,
          isSimulated: true,
        };

        db.saveAlert(alert);
        newAlerts.push(alert);
        eventBus.publish('alert:triggered', alert);
      }
    }

    eventBus.publish('telemetry:update', db.getTracks());
    return {
      tracks: db.getTracks(),
      newAlerts,
    };
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const telemetryService = new TelemetryService();
