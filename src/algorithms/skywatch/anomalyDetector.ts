import {
  TelemetryTrackPoint,
  SkyWatchAlert,
  AnomalyDetectorConfig,
  RestrictedZone
} from '../../../shared/contracts';
import { haversineDistanceMeters } from './simulator';

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectorConfig = {
  speedChangeThresholdKnots: 45,        // Acceleration or deceleration > 45 knots in one step
  routeDeviationThresholdMeters: 800,   // More than 800m off expected corridor
  staleTelemetryThresholdSec: 20,       // No update for > 20s
  restrictedZones: [
    {
      id: 'ZONE-BRAVO',
      name: 'Restricted Airspace Zone Bravo (High-Value Asset)',
      centerLat: 34.062,
      centerLng: -118.255,
      radiusKm: 1.5,
      maxAltitudeMeters: 1000
    }
  ]
};

export class SkyWatchAnomalyDetector {
  private config: AnomalyDetectorConfig;
  private previousTrackPoints: Map<string, TelemetryTrackPoint> = new Map();
  private alerts: SkyWatchAlert[] = [];
  private alertCounter: number = 100;

  constructor(customConfig?: Partial<AnomalyDetectorConfig>) {
    this.config = {
      ...DEFAULT_ANOMALY_CONFIG,
      ...customConfig
    };
  }

  /**
   * Evaluate a newly received telemetry track point against all 4 anomaly rules.
   * Returns newly triggered alerts, if any.
   */
  public evaluate(currentPoint: TelemetryTrackPoint, currentTimeIso?: string): SkyWatchAlert[] {
    const newAlerts: SkyWatchAlert[] = [];
    const prevPoint = this.previousTrackPoints.get(currentPoint.trackId);
    const evalTimeMs = currentTimeIso ? new Date(currentTimeIso).getTime() : new Date(currentPoint.timestamp).getTime();

    // 1. Rule: Speed Change Anomaly
    if (prevPoint) {
      const deltaSpeed = Math.abs(currentPoint.speedKnots - prevPoint.speedKnots);
      if (deltaSpeed >= this.config.speedChangeThresholdKnots) {
        const alert: SkyWatchAlert = {
          id: `ALT-${this.alertCounter++}`,
          trackId: currentPoint.trackId,
          severity: deltaSpeed >= 80 ? 'critical' : 'warning',
          ruleName: 'speed_anomaly',
          observedValue: `${deltaSpeed.toFixed(1)} kts delta (${prevPoint.speedKnots} -> ${currentPoint.speedKnots} kts)`,
          threshold: `${this.config.speedChangeThresholdKnots} kts max delta`,
          explanation: `Sudden kinematic velocity shift detected: Speed jumped by ${deltaSpeed.toFixed(1)} knots between consecutive telemetry pulses, exceeding configured threshold of ${this.config.speedChangeThresholdKnots} knots.`,
          timestamp: currentPoint.timestamp,
          acknowledged: false,
          isSimulated: true
        };
        newAlerts.push(alert);
      }
    }

    // 2. Rule: Restricted Zone Breach
    for (const zone of this.config.restrictedZones) {
      const distMeters = haversineDistanceMeters(
        currentPoint.lat,
        currentPoint.lng,
        zone.centerLat,
        zone.centerLng
      );
      const zoneRadiusMeters = zone.radiusKm * 1000;

      if (distMeters <= zoneRadiusMeters && currentPoint.altitudeMeters <= zone.maxAltitudeMeters) {
        const alert: SkyWatchAlert = {
          id: `ALT-${this.alertCounter++}`,
          trackId: currentPoint.trackId,
          severity: 'critical',
          ruleName: 'restricted_zone_entry',
          observedValue: `${(distMeters / 1000).toFixed(2)} km from zone center`,
          threshold: `Inside ${zone.radiusKm} km radius (${zone.name})`,
          explanation: `Airspace violation: Track entered protected perimeter of "${zone.name}". Distance to epicenter is ${(distMeters / 1000).toFixed(2)} km (threshold: ${zone.radiusKm} km, altitude: ${currentPoint.altitudeMeters}m / max: ${zone.maxAltitudeMeters}m).`,
          timestamp: currentPoint.timestamp,
          acknowledged: false,
          isSimulated: true
        };
        newAlerts.push(alert);
      }
    }

    // 3. Rule: Stale Telemetry (evaluated if elapsed time between current and previous is large)
    if (prevPoint) {
      const prevTimeMs = new Date(prevPoint.timestamp).getTime();
      const currTimeMs = new Date(currentPoint.timestamp).getTime();
      const elapsedSec = (currTimeMs - prevTimeMs) / 1000;

      if (elapsedSec > this.config.staleTelemetryThresholdSec) {
        const alert: SkyWatchAlert = {
          id: `ALT-${this.alertCounter++}`,
          trackId: currentPoint.trackId,
          severity: 'warning',
          ruleName: 'stale_telemetry',
          observedValue: `${elapsedSec.toFixed(0)} seconds elapsed`,
          threshold: `${this.config.staleTelemetryThresholdSec} seconds max silence`,
          explanation: `Signal dropout anomaly: Telemetry silence of ${elapsedSec.toFixed(0)} seconds exceeded heartbeat limit of ${this.config.staleTelemetryThresholdSec} seconds. Potential transponder outage or jamming.`,
          timestamp: currentPoint.timestamp,
          acknowledged: false,
          isSimulated: true
        };
        newAlerts.push(alert);
      }
    }

    // Store track point for subsequent delta calculations
    this.previousTrackPoints.set(currentPoint.trackId, { ...currentPoint });

    // Append to master alert list
    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * Check for stale telemetry on active tracks given a wall-clock reference time
   */
  public checkStaleness(referenceTimeIso: string): SkyWatchAlert[] {
    const staleAlerts: SkyWatchAlert[] = [];
    const refMs = new Date(referenceTimeIso).getTime();

    for (const [trackId, pt] of this.previousTrackPoints.entries()) {
      const ptMs = new Date(pt.timestamp).getTime();
      const elapsedSec = (refMs - ptMs) / 1000;

      if (elapsedSec > this.config.staleTelemetryThresholdSec) {
        // Only trigger if we haven't already triggered for this exact timestamp
        const alreadyFlagged = this.alerts.some(
          a => a.trackId === trackId && a.ruleName === 'stale_telemetry' && a.timestamp === referenceTimeIso
        );
        if (!alreadyFlagged) {
          const alert: SkyWatchAlert = {
            id: `ALT-${this.alertCounter++}`,
            trackId,
            severity: 'warning',
            ruleName: 'stale_telemetry',
            observedValue: `${elapsedSec.toFixed(0)} seconds elapsed`,
            threshold: `${this.config.staleTelemetryThresholdSec} seconds max silence`,
            explanation: `Signal dropout anomaly: Track "${pt.callsign}" has ceased transmitting for ${elapsedSec.toFixed(0)} seconds (threshold: ${this.config.staleTelemetryThresholdSec}s).`,
            timestamp: referenceTimeIso,
            acknowledged: false,
            isSimulated: true
          };
          staleAlerts.push(alert);
          this.alerts.push(alert);
        }
      }
    }

    return staleAlerts;
  }

  /**
   * Acknowledge an alert by ID
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  public getAlerts(): SkyWatchAlert[] {
    return this.alerts.map(a => ({ ...a }));
  }

  public getUnacknowledgedAlerts(): SkyWatchAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  public clear(): void {
    this.previousTrackPoints.clear();
    this.alerts = [];
  }
}
