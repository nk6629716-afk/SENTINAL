import { TelemetryTrack, RestrictedAirspaceZone, AirspaceAlert } from '@shared/types';

export interface RankedTrackThreat {
  id: string;
  callsign: string;
  type: string;
  status: string;
  score: number;
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  altitude: number;
  speed: number;
  hasGeofenceBreach: boolean;
  track: TelemetryTrack;
}

/**
 * Calculates a genuine algorithmic threat score (0-99) for a telemetry track
 * based on kinematics, aircraft classification, geofence breaches, and open alerts.
 */
export function calculateTrackThreatScore(
  track: TelemetryTrack,
  zones: RestrictedAirspaceZone[] = [],
  alerts: AirspaceAlert[] = []
): { score: number; reason: string; severity: 'critical' | 'high' | 'medium' | 'low'; hasBreach: boolean } {
  // Base baseline score
  let score = 10;
  const reasons: string[] = [];

  const isHostileOrSuspicious =
    track.status === 'hostile' ||
    track.status === 'suspicious' ||
    track.type === 'stealth_incursion' ||
    track.type === 'unknown_quadcopter';

  if (isHostileOrSuspicious) {
    score += 25;
    reasons.push(track.status === 'hostile' ? 'Hostile signature' : 'Unidentified transponder');
  }

  // Kinematic speed check (> 60 m/s or km/h)
  if (track.speed > 60) {
    score += 20;
    reasons.push(`High velocity (${Math.round(track.speed)} km/h)`);
  }

  // Low-altitude nap-of-the-earth flight (< 250 m)
  if (track.altitude < 250) {
    score += 15;
    reasons.push(`Low altitude terrain-masking (${track.altitude}m)`);
  }

  // Check geofence proximity/breach against active restricted zones
  let hasBreach = false;
  for (const zone of zones) {
    const dLat = track.lat - zone.center.lat;
    const dLng = track.lng - zone.center.lng;
    const distApproxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    if (distApproxKm <= zone.radiusKm && track.altitude <= zone.ceilingMeters) {
      hasBreach = true;
      score += 22;
      reasons.push(`Breached ${zone.name}`);
      break;
    }
  }

  // Associated unacknowledged alerts add severity
  const relatedAlert = alerts.find(
    (a) => (a.trackId === track.id || a.trackCallsign === track.callsign) && !a.acknowledged
  );
  if (relatedAlert) {
    score += 8;
    if (!hasBreach && relatedAlert.ruleName?.includes('INCURSION')) {
      hasBreach = true;
    }
  }

  const finalScore = Math.min(Math.max(score, 5), 99);

  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (finalScore >= 80) severity = 'critical';
  else if (finalScore >= 50) severity = 'high';
  else if (finalScore >= 30) severity = 'medium';

  const reasonText = reasons.length > 0 ? reasons.join(', ') : 'Normal flight corridor, no anomalies';

  return {
    score: finalScore,
    reason: reasonText,
    severity,
    hasBreach,
  };
}

/**
 * Builds the threat queue strictly from active telemetry tracks, ranked by threat score.
 * Never leaves mockup leftovers (e.g. "Track 07", "Swarm U1 to U4").
 */
export function selectRankedThreatQueue(
  tracks: TelemetryTrack[] = [],
  zones: RestrictedAirspaceZone[] = [],
  alerts: AirspaceAlert[] = []
): RankedTrackThreat[] {
  return tracks
    .map((track) => {
      const evaluation = calculateTrackThreatScore(track, zones, alerts);
      return {
        id: track.id,
        callsign: track.callsign,
        type: track.type || 'unknown',
        status: track.status,
        score: evaluation.score,
        reason: evaluation.reason,
        severity: evaluation.severity,
        altitude: track.altitude,
        speed: track.speed,
        hasGeofenceBreach: evaluation.hasBreach,
        track,
      };
    })
    .sort((a, b) => b.score - a.score);
}
