import { TelemetryTrackPoint } from '../../../shared/contracts';

export interface Waypoint {
  lat: number;
  lng: number;
  altitudeMeters: number;
  speedKnots: number;
  headingDeg: number;
}

export interface FlightScenarioDefinition {
  name: string;
  description: string;
  initialPoint: Waypoint;
  waypoints: Waypoint[];
  anomalyInjectionStep?: number;
  anomalyType?: 'speed_spike' | 'zone_breach' | 'route_deviation' | 'stale_telemetry';
}

/**
 * Great-circle distance approximation in meters using Haversine formula
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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

/**
 * Deterministic kinematic flight track generator
 */
export class SkyWatchSimulator {
  private currentStep: number = 0;
  private isRunning: boolean = false;
  private activeScenario: FlightScenarioDefinition;
  private trackId: string;
  private callsign: string;
  private history: TelemetryTrackPoint[] = [];
  private baseTimestampMs: number;

  constructor(
    trackId: string = 'SW-204',
    callsign: string = 'HAWK-ALPHA',
    scenario?: FlightScenarioDefinition
  ) {
    this.trackId = trackId;
    this.callsign = callsign;
    this.baseTimestampMs = Date.now();
    this.activeScenario = scenario || SkyWatchSimulator.getPresetScenarios().normal_patrol;
    this.reset();
  }

  public static getPresetScenarios(): Record<string, FlightScenarioDefinition> {
    return {
      normal_patrol: {
        name: 'normal_patrol',
        description: 'Nominal surveillance sweep along designated perimeter corridor.',
        initialPoint: { lat: 34.052, lng: -118.243, altitudeMeters: 450, speedKnots: 65, headingDeg: 45 },
        waypoints: [
          { lat: 34.056, lng: -118.238, altitudeMeters: 460, speedKnots: 66, headingDeg: 45 },
          { lat: 34.060, lng: -118.232, altitudeMeters: 470, speedKnots: 68, headingDeg: 48 },
          { lat: 34.064, lng: -118.225, altitudeMeters: 475, speedKnots: 65, headingDeg: 52 },
          { lat: 34.068, lng: -118.218, altitudeMeters: 480, speedKnots: 67, headingDeg: 50 },
          { lat: 34.072, lng: -118.210, altitudeMeters: 485, speedKnots: 66, headingDeg: 45 }
        ]
      },
      speed_spike_anomaly: {
        name: 'speed_spike_anomaly',
        description: 'Target abruptly accelerates from 65 to 155 knots (speed anomaly).',
        initialPoint: { lat: 34.052, lng: -118.243, altitudeMeters: 450, speedKnots: 65, headingDeg: 45 },
        waypoints: [
          { lat: 34.056, lng: -118.238, altitudeMeters: 460, speedKnots: 66, headingDeg: 45 },
          { lat: 34.060, lng: -118.232, altitudeMeters: 470, speedKnots: 68, headingDeg: 48 },
          { lat: 34.065, lng: -118.220, altitudeMeters: 550, speedKnots: 155, headingDeg: 60 }, // Anomaly!
          { lat: 34.075, lng: -118.200, altitudeMeters: 600, speedKnots: 160, headingDeg: 65 }
        ],
        anomalyInjectionStep: 2,
        anomalyType: 'speed_spike'
      },
      restricted_zone_breach: {
        name: 'restricted_zone_breach',
        description: 'Track swerves off perimeter directly into Airspace Zone Bravo.',
        initialPoint: { lat: 34.052, lng: -118.243, altitudeMeters: 450, speedKnots: 65, headingDeg: 45 },
        waypoints: [
          { lat: 34.056, lng: -118.238, altitudeMeters: 460, speedKnots: 66, headingDeg: 45 },
          { lat: 34.060, lng: -118.245, altitudeMeters: 380, speedKnots: 75, headingDeg: 310 }, // Course deviation
          { lat: 34.062, lng: -118.255, altitudeMeters: 350, speedKnots: 80, headingDeg: 300 }  // Inside Zone Bravo!
        ],
        anomalyInjectionStep: 2,
        anomalyType: 'zone_breach'
      },
      stale_telemetry_anomaly: {
        name: 'stale_telemetry_anomaly',
        description: 'Telemetry feed abruptly ceases updating for over 30 seconds.',
        initialPoint: { lat: 34.052, lng: -118.243, altitudeMeters: 450, speedKnots: 65, headingDeg: 45 },
        waypoints: [
          { lat: 34.056, lng: -118.238, altitudeMeters: 460, speedKnots: 66, headingDeg: 45 }
        ],
        anomalyInjectionStep: 1,
        anomalyType: 'stale_telemetry'
      }
    };
  }

  public setScenario(name: string): void {
    const presets = SkyWatchSimulator.getPresetScenarios();
    if (!presets[name]) {
      throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(presets).join(', ')}`);
    }
    this.activeScenario = presets[name];
    this.reset();
  }

  public reset(): void {
    this.currentStep = 0;
    this.isRunning = false;
    this.history = [];
    // Emit step 0 initial point
    const initPt = this.activeScenario.initialPoint;
    const initialTrack: TelemetryTrackPoint = {
      trackId: this.trackId,
      callsign: this.callsign,
      lat: initPt.lat,
      lng: initPt.lng,
      altitudeMeters: initPt.altitudeMeters,
      speedKnots: initPt.speedKnots,
      headingDeg: initPt.headingDeg,
      timestamp: new Date(this.baseTimestampMs).toISOString(),
      isSimulated: true
    };
    this.history.push(initialTrack);
  }

  /**
   * Advance simulation by one discrete time step (5 seconds per step)
   */
  public step(timeDeltaSec: number = 5): TelemetryTrackPoint | null {
    if (this.currentStep >= this.activeScenario.waypoints.length) {
      return null; // Scenario ended
    }

    const nextWp = this.activeScenario.waypoints[this.currentStep];
    this.currentStep++;

    const timestamp = new Date(this.baseTimestampMs + this.currentStep * timeDeltaSec * 1000).toISOString();

    const trackPoint: TelemetryTrackPoint = {
      trackId: this.trackId,
      callsign: this.callsign,
      lat: nextWp.lat,
      lng: nextWp.lng,
      altitudeMeters: nextWp.altitudeMeters,
      speedKnots: nextWp.speedKnots,
      headingDeg: nextWp.headingDeg,
      timestamp,
      isSimulated: true
    };

    this.history.push(trackPoint);
    return { ...trackPoint };
  }

  public getCurrentPoint(): TelemetryTrackPoint {
    return { ...this.history[this.history.length - 1] };
  }

  public getHistory(): TelemetryTrackPoint[] {
    return this.history.map(pt => ({ ...pt }));
  }

  public getStep(): number {
    return this.currentStep;
  }
}
