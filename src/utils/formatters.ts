/**
 * SENTINEL — Central Formatting & Unit Standardization Utility
 *
 * Enforces:
 * 1. Single source of truth for duration, distance, speed, and time.
 * 2. Zero concatenation typos (e.g. prevents "12 minm").
 * 3. Consistent speed in km/h across all labels, cards, alerts, and exports.
 * 4. Human-readable airspace rule names (e.g. NO_FLY_ZONE_INCURSION -> "Restricted Zone Incursion").
 */

/**
 * Format duration in minutes or seconds cleanly.
 */
export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '-- min';
  }
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

/**
 * Format distance in kilometers or meters.
 */
export function formatDistanceKm(km: number | null | undefined, decimals = 1): string {
  if (km === null || km === undefined || isNaN(km)) {
    return '-- km';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(decimals)} km`;
}

/**
 * Format speed in standard km/h.
 * If input is in m/s (e.g. from simulation physics), it can be converted.
 */
export function formatSpeedKmh(
  speed: number | null | undefined,
  inputUnit: 'kmh' | 'ms' | 'knots' = 'kmh'
): string {
  if (speed === null || speed === undefined || isNaN(speed)) {
    return '-- km/h';
  }

  let kmh = speed;
  if (inputUnit === 'ms') {
    kmh = speed * 3.6;
  } else if (inputUnit === 'knots') {
    kmh = speed * 1.852;
  }

  return `${Math.round(kmh)} km/h`;
}

/**
 * Format altitude in meters MSL.
 */
export function formatAltitudeMeters(altitudeM: number | null | undefined): string {
  if (altitudeM === null || altitudeM === undefined || isNaN(altitudeM)) {
    return '-- m';
  }
  return `${Math.round(altitudeM)}m MSL`;
}

/**
 * Rule Name Human Translation Map
 */
const RULE_HUMAN_NAMES: Record<string, string> = {
  ZONE_INCURSION: 'Restricted Zone Incursion',
  NO_FLY_ZONE_INCURSION: 'No-Fly Zone Incursion',
  restricted_zone_entry: 'Restricted Airspace Breach',
  SUDDEN_ACCELERATION: 'Kinematic Acceleration Anomaly',
  speed_anomaly: 'Speed Envelope Breach',
  ALTITUDE_CORRIDOR_BREACH: 'Altitude Floor Breach',
  stale_telemetry: 'Signal Dropout Anomaly',
  TRANSPONDER_LOSS: 'Transponder Signal Dropout',
  LOITERING_BEHAVIOR: 'Anomalous Loitering Profile',
};

export function formatRuleName(rawRuleId: string | null | undefined): string {
  if (!rawRuleId) return 'Operational Rule Breach';
  if (RULE_HUMAN_NAMES[rawRuleId]) {
    return RULE_HUMAN_NAMES[rawRuleId];
  }
  // Convert SNAKE_CASE or camelCase to Title Case
  return rawRuleId
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format track classification consistently across symbols, cards, and ledgers.
 */
export type EntityClassification = 'friendly' | 'hostile' | 'neutral' | 'unknown' | 'suspicious';

export function getTrackClassification(track: {
  status?: string;
  type?: string;
  threatScore?: number;
}): EntityClassification {
  const type = (track.type || '').toLowerCase();
  const status = (track.status || '').toLowerCase();
  const score = track.threatScore ?? 0;

  if (type === 'friendly_uav' || status === 'friendly') {
    return 'friendly';
  }
  if (type === 'commercial' || type === 'civilian' || status === 'neutral') {
    return 'neutral';
  }
  if (status === 'hostile' || type === 'stealth_incursion' || score >= 70) {
    return 'hostile';
  }
  if (status === 'suspicious' || score >= 35) {
    return 'suspicious';
  }
  return 'unknown';
}

export function formatClassificationLabel(classification: EntityClassification): string {
  switch (classification) {
    case 'friendly':
      return 'Friendly UAS';
    case 'neutral':
      return 'Civilian Aircraft';
    case 'hostile':
      return 'Hostile Drone Signature';
    case 'suspicious':
      return 'Unidentified / Suspicious Track';
    default:
      return 'Unknown Radar Contact';
  }
}
