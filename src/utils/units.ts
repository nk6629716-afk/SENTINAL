/**
 * SENTINEL Units & Measurement Formatting System
 * FIX-05: Centralized SI units (m, m/s, s) and standard formatting helpers.
 */

export const MS_TO_KMH = 3.6;
export const MS_TO_KNOTS = 1 / 0.514444;

/**
 * Converts velocity in m/s to km/h
 */
export function toKmh(speedInMs: number): number {
  if (isNaN(speedInMs) || !isFinite(speedInMs)) return 0;
  return speedInMs * MS_TO_KMH;
}

/**
 * Converts velocity in m/s to knots
 */
export function toKnots(speedInMs: number): number {
  if (isNaN(speedInMs) || !isFinite(speedInMs)) return 0;
  return speedInMs * MS_TO_KNOTS;
}

/**
 * Formats speed in km/h from SI velocity (m/s) or pre-converted values
 */
export function formatSpeed(speedInMs: number): string {
  const kmh = Math.round(toKmh(speedInMs));
  return `${kmh} km/h`;
}

/**
 * Formats altitude in meters
 */
export function formatAltitude(meters: number): string {
  if (isNaN(meters) || !isFinite(meters)) return '0 m';
  return `${Math.round(meters)} m`;
}

/**
 * Formats distance: meters below 1000, otherwise km with 1 decimal place
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || !isFinite(meters) || meters < 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration in minutes to human readable (min, h min)
 */
export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || !isFinite(minutes) || minutes <= 0) return '0 min';
  const totalMins = Math.round(minutes);
  if (totalMins < 60) {
    return `${totalMins} min`;
  }
  const hours = Math.floor(totalMins / 60);
  const remaining = totalMins % 60;
  if (remaining === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remaining} min`;
}
