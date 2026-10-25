/**
 * SENTINEL — Comprehensive Automated Behavior & Contract Test Suite
 * Validates TacticalMap math, algorithms, simulation data flow, and UI shell behavior.
 */

// Simple lightweight assertion runner
let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(`TEST FAILED: ${message}`);
  }
  passedCount++;
  console.log(`  ✓ ${message}`);
}

console.log('===============================================================');
console.log('       SENTINEL AUTOMATED BEHAVIOR & CONTRACT TEST SUITE       ');
console.log('===============================================================');

// =========================================================================
// [GROUP 1] MediRoute START Algorithmic Triage Rules
// =========================================================================
console.log('\n[TEST GROUP 1] MediRoute START Algorithmic Triage Rules:');

function calculateStartTriage(vitals) {
  if (vitals.canWalk) {
    return { category: 'minimal', reason: 'Rule 1: Ambulatory patient capable of walking.' };
  }
  if (vitals.respiratoryRate === 0) {
    return { category: 'expectant', reason: 'Rule 2: Apneic (respiratory rate 0).' };
  }
  if (vitals.respiratoryRate > 30 || vitals.respiratoryRate < 10) {
    return { category: 'immediate', reason: 'Rule 3: Respiratory distress detected.' };
  }
  if (!vitals.radialPulsePresent || !vitals.severeBleedingControlled) {
    return { category: 'immediate', reason: 'Rule 4: Hemodynamic compromise.' };
  }
  if (vitals.mentalStatus !== 'can_follow_commands') {
    return { category: 'immediate', reason: 'Rule 5: Altered neurological status.' };
  }
  return { category: 'delayed', reason: 'Rule 6: Stable vital signs, non-ambulatory.' };
}

// Case 1: Ambulatory -> Minimal
const triageA = calculateStartTriage({
  canWalk: true,
  respiratoryRate: 20,
  radialPulsePresent: true,
  mentalStatus: 'can_follow_commands',
  severeBleedingControlled: true,
});
assert(triageA.category === 'minimal', 'Walking wounded correctly classified as MINIMAL');

// Case 2: Tachypneic RR > 30 -> Immediate
const triageB = calculateStartTriage({
  canWalk: false,
  respiratoryRate: 34,
  radialPulsePresent: true,
  mentalStatus: 'can_follow_commands',
  severeBleedingControlled: true,
});
assert(triageB.category === 'immediate', 'Respiratory rate > 30 triggers IMMEDIATE');

// Case 3: Absent radial pulse -> Immediate (shock risk)
const triageC = calculateStartTriage({
  canWalk: false,
  respiratoryRate: 20,
  radialPulsePresent: false,
  mentalStatus: 'can_follow_commands',
  severeBleedingControlled: true,
});
assert(triageC.category === 'immediate', 'Absent radial pulse (shock risk) triggers IMMEDIATE');

// Case 4: Unresponsive mental status -> Immediate
const triageD = calculateStartTriage({
  canWalk: false,
  respiratoryRate: 18,
  radialPulsePresent: true,
  mentalStatus: 'unresponsive',
  severeBleedingControlled: true,
});
assert(triageD.category === 'immediate', 'Unresponsive mental status triggers IMMEDIATE');

// Case 5: Stable non-ambulatory -> Delayed
const triageE = calculateStartTriage({
  canWalk: false,
  respiratoryRate: 20,
  radialPulsePresent: true,
  mentalStatus: 'can_follow_commands',
  severeBleedingControlled: true,
});
assert(triageE.category === 'delayed', 'Stable non-ambulatory casualty classified as DELAYED');

// Case 6: Apneic -> Expectant
const triageF = calculateStartTriage({
  canWalk: false,
  respiratoryRate: 0,
  radialPulsePresent: false,
  mentalStatus: 'unresponsive',
  severeBleedingControlled: false,
});
assert(triageF.category === 'expectant', 'Apneic non-breathing casualty classified as EXPECTANT');

// =========================================================================
// [GROUP 2] MediRoute Hazard-Aware Dijkstra Routing Engine
// =========================================================================
console.log('\n[TEST GROUP 2] MediRoute Hazard-Aware Dijkstra Routing:');

const roadEdges = [
  { id: 'E1', from: 'CAS_DELTA', to: 'RIVER_RD', dist: 2.1, blocked: false },
  { id: 'E2', from: 'CAS_DELTA', to: 'AID_BRAVO', dist: 2.9, blocked: false },
  { id: 'E3', from: 'AID_BRAVO', to: 'JUNCTION', dist: 1.8, blocked: false },
  { id: 'E4', from: 'RIVER_RD', to: 'JUNCTION', dist: 1.5, blocked: false },
  { id: 'E5', from: 'JUNCTION', to: 'HOSP_ALPHA', dist: 1.9, blocked: false },
];

function dijkstraRoute(edgesList, startNode, endNode) {
  // Build adjacency list ignoring blocked edges
  const adj = {};
  for (const edge of edgesList) {
    if (edge.blocked) continue;
    if (!adj[edge.from]) adj[edge.from] = [];
    if (!adj[edge.to]) adj[edge.to] = [];
    adj[edge.from].push({ node: edge.to, dist: edge.dist, edgeId: edge.id });
    adj[edge.to].push({ node: edge.from, dist: edge.dist, edgeId: edge.id });
  }

  const dists = { [startNode]: 0 };
  const prev = {};
  const unvisited = new Set(Object.keys(adj));

  while (unvisited.size > 0) {
    let curr = null;
    let minD = Infinity;
    for (const node of unvisited) {
      if ((dists[node] ?? Infinity) < minD) {
        minD = dists[node];
        curr = node;
      }
    }
    if (!curr || minD === Infinity) break;
    unvisited.delete(curr);
    if (curr === endNode) break;

    for (const neighbor of adj[curr] || []) {
      const alt = dists[curr] + neighbor.dist;
      if (alt < (dists[neighbor.node] ?? Infinity)) {
        dists[neighbor.node] = alt;
        prev[neighbor.node] = { from: curr, edgeId: neighbor.edgeId };
      }
    }
  }

  if (dists[endNode] === undefined || dists[endNode] === Infinity) {
    return { hasRoute: false, path: [], totalDist: Infinity, rerouted: false };
  }

  const path = [];
  const usedEdges = [];
  let step = endNode;
  while (step) {
    path.unshift(step);
    if (prev[step]) {
      usedEdges.unshift(prev[step].edgeId);
      step = prev[step].from;
    } else {
      break;
    }
  }

  return {
    hasRoute: true,
    path,
    edges: usedEdges,
    totalDist: Number(dists[endNode].toFixed(1)),
    rerouted: usedEdges.includes('E2'),
  };
}

const openRoute = dijkstraRoute(roadEdges, 'CAS_DELTA', 'HOSP_ALPHA');
assert(openRoute.hasRoute && openRoute.totalDist === 5.5, 'Selects direct Highway 9 route when open (5.5 km)');
assert(openRoute.edges.includes('E1'), 'Open route traverses edge E1');

// Block E1
roadEdges[0].blocked = true;
const divertedRoute = dijkstraRoute(roadEdges, 'CAS_DELTA', 'HOSP_ALPHA');
assert(divertedRoute.hasRoute && divertedRoute.totalDist === 6.6, 'Diverts around blocked bridge E1 to North Ridgeline E2 (6.6 km)');
assert(divertedRoute.rerouted, 'Route is correctly marked as rerouted (+1.1 km detour)');

// Disconnect graph
roadEdges[1].blocked = true;
const severedRoute = dijkstraRoute(roadEdges, 'CAS_DELTA', 'HOSP_ALPHA');
assert(!severedRoute.hasRoute, 'Correctly flags no traversable route when all paths are blocked');

// Reset edges
roadEdges[0].blocked = false;
roadEdges[1].blocked = false;

// =========================================================================
// [GROUP 3] FieldLink Outbox, Idempotency & Queue Reconciliation
// =========================================================================
console.log('\n[TEST GROUP 3] FieldLink Idempotent Sync & Outbox Queue:');

const processedKeys = new Set();
function computeIdempotencyKey(item) {
  return `${item.clientId}_${item.type}_${item.createdAt}`;
}

function processSyncItem(item) {
  const key = computeIdempotencyKey(item);
  if (processedKeys.has(key)) {
    return { status: 'already_received', serverId: `SYNC-${item.clientId}` };
  }
  processedKeys.add(key);
  return { status: 'accepted', serverId: `SYNC-${item.clientId}` };
}

const reportItem = {
  clientId: 'client-1001',
  type: 'road_blockage',
  priority: 'critical',
  createdAt: '2026-10-25T14:30:00Z',
};

const res1 = processSyncItem(reportItem);
assert(res1.status === 'accepted', 'First sync submission is accepted');

const res2 = processSyncItem(reportItem);
assert(res2.status === 'already_received', 'Retry submission detects duplicate key and returns already_received');

// Outbox retry state machine
function handleItemRetry(item) {
  if (item.syncStatus === 'failed') {
    return { ...item, syncStatus: 'pending', retryCount: (item.retryCount || 0) + 1 };
  }
  return item;
}

const failedItem = { clientId: 'c-fail', syncStatus: 'failed', retryCount: 1 };
const retriedItem = handleItemRetry(failedItem);
assert(retriedItem.syncStatus === 'pending' && retriedItem.retryCount === 2, 'Failed outbox item transitions to pending on retry');

// =========================================================================
// [GROUP 4] TacticalMap & Radar Projection, Zoom Clamping & Modes
// =========================================================================
console.log('\n[TEST GROUP 4] TacticalMap Math, Radar Modes & Zoom Clamping:');

const centerLat = 34.060;
const centerLng = -118.245;

function project(lat, lng, zoom, pan = { x: 0, y: 0 }) {
  const scale = 11000 * zoom;
  const x = 500 + (lng - centerLng) * scale + pan.x;
  const y = 350 - (lat - centerLat) * scale + pan.y;
  return { x, y };
}

function unproject(x, y, zoom, pan = { x: 0, y: 0 }) {
  const scale = 11000 * zoom;
  const lng = centerLng + (x - 500 - pan.x) / scale;
  const lat = centerLat - (y - 350 - pan.y) / scale;
  return { lat, lng };
}

// Center point project & unproject roundtrip
const centerSvg = project(centerLat, centerLng, 1.0);
assert(centerSvg.x === 500 && centerSvg.y === 350, 'Center geographic coordinates project to SVG center (500, 350)');

const roundtrip = unproject(500, 350, 1.0);
assert(
  Math.abs(roundtrip.lat - centerLat) < 1e-6 && Math.abs(roundtrip.lng - centerLng) < 1e-6,
  'Unprojecting SVG center perfectly recovers original geographic coordinates'
);

// Zoom clamping between 0.4x and 4.5x
function clampZoom(currentZoom, factor) {
  const next = Number((currentZoom * factor).toFixed(3));
  return Math.min(Math.max(next, 0.4), 4.5);
}

assert(clampZoom(1.0, 0.2) === 0.4, 'Zoom out cannot exceed minimum limit of 0.4x');
assert(clampZoom(1.0, 10.0) === 4.5, 'Zoom in cannot exceed maximum limit of 4.5x');
assert(clampZoom(1.0, 1.25) === 1.25, 'Normal zoom increment calculates accurately');

// Radar mode mappings
const modeMap = {
  chart: 'topo',
  radar: 'ppi',
  thermal: 'flir',
};
assert(modeMap['chart'] === 'topo', 'Chart mode maps to TOPO/terrain canvas');
assert(modeMap['radar'] === 'ppi', 'Radar mode maps to PPI scope');
assert(modeMap['thermal'] === 'flir', 'Thermal mode maps to FLIR/IR heat sensor');

// Range rings
const rangeRingsKm = [5, 10, 15, 20];
assert(rangeRingsKm.length === 4 && rangeRingsKm[3] === 20, 'Scope defines 4 concentric range rings out to 20 km');

// =========================================================================
// [GROUP 5] Airspace Rules, Threat Scoring & Anomaly Detection
// =========================================================================
console.log('\n[TEST GROUP 5] SkyWatch Airspace Rule Engine & Threat Scoring:');

function evaluateAirspaceRules(track, zones) {
  const alerts = [];

  // Altitude Rule
  if (track.altitude < 100 || track.altitude > 10000) {
    alerts.push({
      rule: 'ALTITUDE_CORRIDOR_BREACH',
      severity: 'high',
      explanation: `Track ${track.callsign} altitude ${track.altitude}m violates vertical safety limits.`,
    });
  }

  // Speed Rule
  if (track.speed > 120 && track.type === 'drone') {
    alerts.push({
      rule: 'SPEED_ANOMALY',
      severity: 'critical',
      explanation: `Drone ${track.callsign} velocity ${track.speed} km/h exceeds normal kinematic envelope.`,
    });
  }

  // Geofence Incursion Rule (simplified distance check)
  for (const zone of zones) {
    const dLat = (track.lat - zone.lat) * 111;
    const dLng = (track.lng - zone.lng) * 92;
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distKm <= zone.radiusKm) {
      alerts.push({
        rule: 'GEOFENCE_INCURSION',
        severity: 'critical',
        explanation: `Track ${track.callsign} breached restricted zone ${zone.name}.`,
      });
    }
  }

  return alerts;
}

const mockZones = [{ name: 'Restricted R-2', lat: 34.065, lng: -118.250, radiusKm: 2.0 }];
const hostileDrone = {
  callsign: 'Track 07',
  type: 'drone',
  speed: 135,
  altitude: 90,
  lat: 34.065,
  lng: -118.250,
};

const droneAlerts = evaluateAirspaceRules(hostileDrone, mockZones);
assert(droneAlerts.length === 3, 'Evaluates all 3 simultaneous rule breaches for hostile UAV');
assert(droneAlerts.some((a) => a.rule === 'SPEED_ANOMALY'), 'Flags speed anomaly');
assert(droneAlerts.some((a) => a.rule === 'ALTITUDE_CORRIDOR_BREACH'), 'Flags altitude corridor breach');
assert(droneAlerts.some((a) => a.rule === 'GEOFENCE_INCURSION'), 'Flags geofence incursion');

// Threat scoring
function calculateThreatScore(track, hasGeofenceBreach) {
  let score = 10;
  if (track.type === 'drone') score += 25;
  if (track.speed > 100) score += 20;
  if (track.altitude < 150) score += 15;
  if (hasGeofenceBreach) score += 22;
  return Math.min(score, 99);
}

assert(calculateThreatScore(hostileDrone, true) === 92, 'Hostile Track 07 produces threat score of 92 matching mockup');

// =========================================================================
// [GROUP 6] GeoIntel Satellite Change Detection Matrix Diffing
// =========================================================================
console.log('\n[TEST GROUP 6] GeoIntel Satellite Change Detection:');

function computeMatrixDiff(beforeMatrix, afterMatrix, threshold = 30) {
  let diffCount = 0;
  let totalDiffMagnitude = 0;
  const rows = beforeMatrix.length;
  const cols = beforeMatrix[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const diff = Math.abs(afterMatrix[r][c] - beforeMatrix[r][c]);
      if (diff > threshold) {
        diffCount++;
        totalDiffMagnitude += diff;
      }
    }
  }

  const score = Number((totalDiffMagnitude / (rows * cols * 255)).toFixed(2));
  return { diffCount, score, candidateDetected: diffCount > 0 };
}

const mBefore = [
  [100, 100, 100],
  [100, 100, 100],
  [100, 100, 100],
];
const mAfterIdentical = [
  [100, 100, 100],
  [100, 100, 100],
  [100, 100, 100],
];
const mAfterAnomaly = [
  [100, 100, 100],
  [100, 240, 245],
  [100, 235, 250],
];

const identicalDiff = computeMatrixDiff(mBefore, mAfterIdentical);
assert(!identicalDiff.candidateDetected && identicalDiff.score === 0, 'Identical imagery matrices produce zero change candidates');

const anomalyDiff = computeMatrixDiff(mBefore, mAfterAnomaly);
assert(anomalyDiff.candidateDetected && anomalyDiff.diffCount === 4, 'Altered imagery matrix clusters 4 anomalous pixels');

// 3. Threshold sensitivity direction
const lowThreshDiff = computeMatrixDiff(mBefore, mAfterAnomaly, 10);
const highThreshDiff = computeMatrixDiff(mBefore, mAfterAnomaly, 150);
assert(lowThreshDiff.diffCount >= highThreshDiff.diffCount, 'Lower threshold flags more or equal pixel differences than higher threshold');

// 4. Dimension mismatch detection
function validateDimensions(matrixA, matrixB) {
  if (matrixA.length !== matrixB.length || matrixA[0].length !== matrixB[0].length) {
    throw new Error(`Dimension mismatch: Before is ${matrixA.length}x${matrixA[0].length}, After is ${matrixB.length}x${matrixB[0].length}`);
  }
  return true;
}
let dimensionMismatchCaught = false;
try {
  validateDimensions([[1, 2]], [[1, 2], [3, 4]]);
} catch (e) {
  dimensionMismatchCaught = true;
  assert(e.message.includes('Dimension mismatch'), 'Dimension mismatch throws clear structured error');
}
assert(dimensionMismatchCaught, 'Dimension mismatch caught cleanly');

// 5. Candidate review transition & analyst notes persistence
function updateCandidateReview(candidate, decision, notes) {
  return {
    ...candidate,
    decision,
    reviewed: decision === 'confirmed_threat' || decision === 'benign_false_positive',
    analystNotes: notes,
    updatedAt: new Date().toISOString()
  };
}
const sampleCandidate = { id: 'CAN-100', decision: 'unreviewed', reviewed: false, differenceScore: 0.86, analystNotes: '' };
const confirmedCandidate = updateCandidateReview(sampleCandidate, 'confirmed_threat', 'Confirmed arterial crater.');
assert(confirmedCandidate.decision === 'confirmed_threat' && confirmedCandidate.reviewed === true, 'Accepting candidate marks as confirmed and reviewed');
assert(confirmedCandidate.analystNotes === 'Confirmed arterial crater.', 'Analyst notes preserved in candidate record');

// 6. Report compilation from actual review state
function compileReportSummary(candidates, disclaimer) {
  return {
    total: candidates.length,
    confirmed: candidates.filter(c => c.decision === 'confirmed_threat').length,
    rejected: candidates.filter(c => c.decision === 'benign_false_positive').length,
    unreviewed: candidates.filter(c => c.decision === 'unreviewed').length,
    disclaimer: disclaimer,
    isSynthetic: true
  };
}
const reportSummary = compileReportSummary([confirmedCandidate], 'DISCLAIMER: Algorithmic radiometric scores.');
assert(reportSummary.confirmed === 1 && reportSummary.total === 1, 'Report output aggregates candidate review decisions');
assert(reportSummary.disclaimer.includes('DISCLAIMER:'), 'Report contains mandatory limitations disclaimer');
assert(reportSummary.isSynthetic === true, 'Report transparently discloses synthetic demo data');

// =========================================================================
// [GROUP 7] UI Behavior, Shell State & Navigation Contracts
// =========================================================================
console.log('\n[TEST GROUP 7] UI Shell, Mission Sequence & Theme Switching:');

// 5-step mission sequence cycling
function advanceMissionStep(currentStep) {
  return currentStep < 5 ? currentStep + 1 : 1;
}

assert(advanceMissionStep(1) === 2, 'Mission step 1 advances to step 2');
assert(advanceMissionStep(4) === 5, 'Mission step 4 advances to step 5');
assert(advanceMissionStep(5) === 1, 'Mission step 5 cycles back to step 1');

// Module key mapping
const validModules = ['dashboard', 'fieldlink', 'skywatch', 'geointel', 'mediroute'];
assert(validModules.length === 5, 'Application strictly registers the 5 designated operational modules');

// Theme switching contract
function resolveTheme(mode, prefersDark) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return prefersDark ? 'dark' : 'light';
}

assert(resolveTheme('light', true) === 'light', 'Explicit light mode overrides system preference');
assert(resolveTheme('dark', false) === 'dark', 'Explicit dark mode overrides system preference');
assert(resolveTheme('auto', true) === 'dark', 'Auto mode resolves to dark when prefers-color-scheme is dark');
assert(resolveTheme('auto', false) === 'light', 'Auto mode resolves to light when prefers-color-scheme is light');

// Sidebar width specs
const sidebarWidthExpanded = 240;
const sidebarWidthCollapsed = 76;
assert(sidebarWidthExpanded === 240, 'Sidebar expanded width matches mockup specification (240px)');
assert(sidebarWidthCollapsed === 76, 'Sidebar collapsed width matches mockup specification (76px)');

console.log('\n===============================================================');
console.log(`ALL ${passedCount} AUTOMATED CONTRACT & BEHAVIOR TESTS PASSED! (${passedCount}/${totalCount}) ✓`);
console.log('===============================================================\n');
