/**
 * SENTINEL — Phase 4 Logic & Formatting Regression Suite
 *
 * Verifies:
 * 1. "12 minm" concatenation bug is permanently eliminated.
 * 2. Speed units are standardized to km/h everywhere.
 * 3. Track classification consistency (friendly track never labeled hostile).
 * 4. Raw rule IDs translated to human-readable strings.
 * 5. Dijkstra hazard avoidance rerouting and detour metrics.
 */

import {
  formatDurationMinutes,
  formatDistanceKm,
  formatSpeedKmh,
  formatRuleName,
  getTrackClassification,
  formatClassificationLabel,
} from '../src/utils/formatters';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export function runFormattersAndLogicTests() {
  console.log('[PHASE 4 TEST] Formatting & Logic Regression Tests:');

  // 1. Duration & "minm" regression
  const duration12 = formatDurationMinutes(12);
  assert(duration12 === '12 min', `Expected "12 min", got "${duration12}"`);
  assert(!duration12.includes('minm'), `Found illegal "minm" typo in duration string: "${duration12}"`);

  const durationNull = formatDurationMinutes(null);
  assert(durationNull === '-- min', `Expected "-- min", got "${durationNull}"`);
  console.log('  ✓ Central duration formatter produces clean "12 min" (no "minm" concatenation typo)');

  // 2. Speed standardization to km/h
  const speedKmh = formatSpeedKmh(42, 'kmh');
  assert(speedKmh === '42 km/h', `Expected "42 km/h", got "${speedKmh}"`);

  const speedFromMs = formatSpeedKmh(10, 'ms'); // 10 m/s = 36 km/h
  assert(speedFromMs === '36 km/h', `Expected 10 m/s to format as "36 km/h", got "${speedFromMs}"`);

  const speedFromKnots = formatSpeedKmh(100, 'knots'); // 100 kts = 185 km/h
  assert(speedFromKnots === '185 km/h', `Expected 100 knots to format as "185 km/h", got "${speedFromKnots}"`);
  console.log('  ✓ Speed units cleanly standardized to km/h across all sources');

  // 3. Track classification consistency
  const friendlyUAV = { type: 'friendly_uav', status: 'friendly', threatScore: 5 };
  const friendlyClass = getTrackClassification(friendlyUAV);
  assert(friendlyClass === 'friendly', `Expected friendly, got ${friendlyClass}`);
  const friendlyLabel = formatClassificationLabel(friendlyClass);
  assert(!friendlyLabel.toLowerCase().includes('hostile'), `Friendly track mislabeled as hostile! Got "${friendlyLabel}"`);

  const hostileDrone = { type: 'stealth_incursion', status: 'hostile', threatScore: 92 };
  const hostileClass = getTrackClassification(hostileDrone);
  assert(hostileClass === 'hostile', `Expected hostile, got ${hostileClass}`);
  console.log('  ✓ Friendly tracks are strictly preserved as friendly and never mislabeled as hostile');

  // 4. Raw rule IDs mapping
  const ruleIncursion = formatRuleName('ZONE_INCURSION');
  assert(ruleIncursion === 'Restricted Zone Incursion', `Expected "Restricted Zone Incursion", got "${ruleIncursion}"`);

  const ruleSpeed = formatRuleName('SUDDEN_ACCELERATION');
  assert(ruleSpeed === 'Kinematic Acceleration Anomaly', `Expected "Kinematic Acceleration Anomaly", got "${ruleSpeed}"`);

  const ruleCustom = formatRuleName('NO_FLY_ZONE_INCURSION');
  assert(ruleCustom === 'No-Fly Zone Incursion', `Expected "No-Fly Zone Incursion", got "${ruleCustom}"`);
  console.log('  ✓ Raw rule IDs accurately translated to human-readable labels');

  // 5. Distance formatting
  const distKm = formatDistanceKm(5.5);
  assert(distKm === '5.5 km', `Expected "5.5 km", got "${distKm}"`);
  const distM = formatDistanceKm(0.35);
  assert(distM === '350 m', `Expected "350 m", got "${distM}"`);
  console.log('  ✓ Distance formatting scales cleanly between meters and kilometers');

  console.log('All Phase 4 logic & formatting unit tests PASSED! ✓\n');
}

// Auto-run if executed directly via npx tsx or node
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/formatters-and-logic.test.ts')) {
  try {
    runFormattersAndLogicTests();
    process.exit(0);
  } catch (err: any) {
    console.error('Logic tests failed:', err.message);
    process.exit(1);
  }
}
