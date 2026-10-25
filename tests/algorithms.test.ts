/**
 * SENTINEL — Comprehensive Unit Test Suite
 * 
 * Verifies all 4 modules and Cross-Module Scenario:
 * - Module 1: FieldLink (Queue, Idempotency, Retry, Sync Reconciliation)
 * - Module 2: SkyWatch (Kinematic Simulator, 4 Anomaly Rules, Alert Transparency)
 * - Module 3: GeoIntel (Matrix Diffing, Clustering, Dimension Validation, Review Workflow)
 * - Module 4: MediRoute (START Triage Rules, Dijkstra Hazard-Aware Routing, Detours)
 * - Cross-Module Integration & Deterministic Reset
 */

import {
  FieldLinkQueueManager,
  computeReportIdempotencyKey
} from '../src/algorithms/fieldlink/queueManager';

import {
  SkyWatchSimulator,
  haversineDistanceMeters
} from '../src/algorithms/skywatch/simulator';

import {
  SkyWatchAnomalyDetector
} from '../src/algorithms/skywatch/anomalyDetector';

import {
  GeoIntelImageDiff,
  getIdenticalMatrixFixture,
  getKnownDifferenceMatrixFixture,
  validateImageMatrices
} from '../src/algorithms/geointel/imageDiff';

import {
  MediRouteTriageEngine
} from '../src/algorithms/mediroute/triageEngine';

import {
  MediRouteGraphRouter
} from '../src/algorithms/mediroute/graphRouter';

import {
  CrossModuleStoryOrchestrator
} from '../src/simulation/scenarios/crossModuleStory';

// Simple lightweight assertion runner
function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export function runAllAlgorithmTests(): { passed: number; total: number; logs: string[] } {
  const logs: string[] = [];
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      logs.push(`[PASS] ${name}`);
    } catch (err: any) {
      logs.push(`[FAIL] ${name} -> ${err.message}`);
    }
  }

  // ==========================================
  // Module 1: FieldLink Tests
  // ==========================================
  test('FieldLink: Enqueue report sets pending status and generates stable ID', () => {
    const q = new FieldLinkQueueManager();
    const rep = q.enqueue({
      type: 'Debris',
      priority: 'high',
      notes: 'Road blocked by debris',
      location: { lat: 34.05, lng: -118.24 }
    });
    assert(rep.status === 'pending', 'Status must be pending');
    assert(rep.clientId.startsWith('rep-'), 'Client ID should be generated');
    assert(q.getAll().length === 1, 'Queue length should be 1');
  });

  test('FieldLink: Idempotency key is deterministic for identical inputs', () => {
    const k1 = computeReportIdempotencyKey('Debris', 'high', 'Same text', { lat: 34.05, lng: -118.24 }, '2026-10-25T12:00:00Z');
    const k2 = computeReportIdempotencyKey('Debris', 'high', 'Same text', { lat: 34.05, lng: -118.24 }, '2026-10-25T12:00:00Z');
    const k3 = computeReportIdempotencyKey('Debris', 'low', 'Same text', { lat: 34.05, lng: -118.24 }, '2026-10-25T12:00:00Z');
    assert(k1 === k2, 'Identical input must produce identical idempotency key');
    assert(k1 !== k3, 'Different priority must produce different key');
  });

  test('FieldLink: Sync batch lifecycle handles accepted, already_received, and rejected', () => {
    const q = new FieldLinkQueueManager();
    const r1 = q.enqueue({ type: 'A', priority: 'low', notes: 'n1', location: { lat: 0, lng: 0 } });
    const r2 = q.enqueue({ type: 'B', priority: 'medium', notes: 'n2', location: { lat: 0, lng: 0 } });
    const r3 = q.enqueue({ type: 'C', priority: 'high', notes: 'n3', location: { lat: 0, lng: 0 } });

    const batch = q.prepareSyncBatch();
    assert(batch !== null, 'Batch should be prepared');
    assert(batch!.reports.length === 3, 'Batch should have 3 reports');

    // Check that items transitioned to syncing
    assert(q.getAll().every(r => r.status === 'syncing'), 'All items should be syncing');

    const result = q.applySyncResults({
      batchId: batch!.batchId,
      processedCount: 3,
      failedCount: 1,
      results: [
        { clientId: r1.clientId, serverId: 'SRV-1', outcome: 'accepted', syncTimestamp: '2026-10-25T12:01:00Z' },
        { clientId: r2.clientId, serverId: 'SRV-2', outcome: 'already_received', syncTimestamp: '2026-10-25T12:01:00Z' },
        { clientId: r3.clientId, serverId: '', outcome: 'rejected', errorMessage: 'Invalid payload', syncTimestamp: '2026-10-25T12:01:00Z' }
      ]
    });

    assert(result.syncedCount === 2, '2 items should be synced');
    assert(result.failedCount === 1, '1 item should have failed');
    assert(q.getByStatus('synced').length === 2, '2 items in queue should have synced status');
    assert(q.getByStatus('failed').length === 1, '1 item in queue should have failed status');
  });

  test('FieldLink: Retry failed items resets them to pending', () => {
    const q = new FieldLinkQueueManager();
    const r = q.enqueue({ type: 'Test', priority: 'low', notes: '', location: { lat: 0, lng: 0 } });
    q.prepareSyncBatch();
    q.applySyncResults({
      batchId: 'b1',
      processedCount: 1,
      failedCount: 1,
      results: [{ clientId: r.clientId, serverId: '', outcome: 'rejected', errorMessage: 'Error', syncTimestamp: '' }]
    });

    assert(q.getByStatus('failed').length === 1, 'Item is failed');
    const resetCount = q.retryFailed();
    assert(resetCount === 1, 'Should reset 1 item');
    assert(q.getByStatus('pending').length === 1, 'Item is pending again');
  });

  // ==========================================
  // Module 2: SkyWatch Tests
  // ==========================================
  test('SkyWatch: Deterministic simulator generates repeatable steps', () => {
    const sim1 = new SkyWatchSimulator();
    const sim2 = new SkyWatchSimulator();

    const pt1 = sim1.step();
    const pt2 = sim2.step();
    assert(pt1 !== null && pt2 !== null, 'Steps should return track point');
    assert(pt1!.lat === pt2!.lat, 'Identical steps must have matching coordinates');
    assert(pt1!.speedKnots === pt2!.speedKnots, 'Speeds must match');
  });

  test('SkyWatch: Normal patrol scenario produces zero critical alerts', () => {
    const sim = new SkyWatchSimulator();
    sim.setScenario('normal_patrol');
    const detector = new SkyWatchAnomalyDetector();

    for (let i = 0; i < 4; i++) {
      const pt = sim.step();
      if (pt) {
        detector.evaluate(pt);
      }
    }

    assert(detector.getAlerts().length === 0, 'Nominal patrol should not trigger false positive alerts');
  });

  test('SkyWatch: Speed spike anomaly triggers explainable alert', () => {
    const sim = new SkyWatchSimulator();
    sim.setScenario('speed_spike_anomaly');
    const detector = new SkyWatchAnomalyDetector({ speedChangeThresholdKnots: 45 });

    const p1 = sim.step(); // Normal
    if (p1) detector.evaluate(p1);
    const p2 = sim.step(); // Normal
    if (p2) detector.evaluate(p2);
    const spikePt = sim.step(); // Spikes to 155 knots
    assert(spikePt !== null, 'Spike step generated');

    const alerts = detector.evaluate(spikePt!);
    assert(alerts.length >= 1, 'Should trigger at least 1 alert');
    const speedAlert = alerts.find(a => a.ruleName === 'speed_anomaly');
    assert(speedAlert !== undefined, 'Speed anomaly rule must fire');
    assert(speedAlert!.observedValue.includes('kts delta'), 'Observed value should show delta');
    assert(speedAlert!.explanation.includes('Sudden kinematic velocity shift'), 'Explanation should be clear');
  });

  test('SkyWatch: Restricted zone breach triggers critical alert with perimeter distance', () => {
    const sim = new SkyWatchSimulator();
    sim.setScenario('restricted_zone_breach');
    const detector = new SkyWatchAnomalyDetector();

    sim.step();
    const breachPt = sim.step();
    assert(breachPt !== null, 'Breach point generated');

    const alerts = detector.evaluate(breachPt!);
    const zoneAlert = alerts.find(a => a.ruleName === 'restricted_zone_entry');
    assert(zoneAlert !== undefined, 'Zone breach rule must fire');
    assert(zoneAlert!.severity === 'critical', 'Zone breach must be critical severity');
    assert(zoneAlert!.explanation.includes('Restricted Airspace Zone Bravo'), 'Must name violated zone');
  });

  test('SkyWatch: Alert acknowledgement updates status', () => {
    const detector = new SkyWatchAnomalyDetector();
    const pt1 = { trackId: 'T1', callsign: 'C1', lat: 0, lng: 0, altitudeMeters: 100, speedKnots: 50, headingDeg: 0, timestamp: '2026-10-25T12:00:00Z', isSimulated: true as const };
    const pt2 = { trackId: 'T1', callsign: 'C1', lat: 0, lng: 0, altitudeMeters: 100, speedKnots: 150, headingDeg: 0, timestamp: '2026-10-25T12:00:05Z', isSimulated: true as const };
    detector.evaluate(pt1);
    const alerts = detector.evaluate(pt2);

    assert(alerts.length > 0, 'Alert created');
    const alertId = alerts[0].id;
    assert(!alerts[0].acknowledged, 'Initial status unacknowledged');
    const acked = detector.acknowledgeAlert(alertId);
    assert(acked, 'Acknowledge should return true');
    assert(detector.getAlerts().find(a => a.id === alertId)!.acknowledged, 'Alert should be acknowledged');
  });

  // ==========================================
  // Module 3: GeoIntel Tests
  // ==========================================
  test('GeoIntel: Identical image matrices produce zero candidate changes', () => {
    const diff = new GeoIntelImageDiff();
    const fixture = getIdenticalMatrixFixture();
    const candidates = diff.analyze(fixture.before, fixture.after);
    assert(candidates.length === 0, 'Identical matrices must return 0 candidate regions');
  });

  test('GeoIntel: Known difference fixture identifies precise 4x4 candidate region', () => {
    const diff = new GeoIntelImageDiff();
    const fixture = getKnownDifferenceMatrixFixture();
    const candidates = diff.analyze(fixture.before, fixture.after);

    assert(candidates.length === 1, 'Should find exactly 1 candidate region');
    const c = candidates[0];
    assert(c.bbox.x === fixture.expectedBbox.x, `BBox X must match ${fixture.expectedBbox.x}`);
    assert(c.bbox.y === fixture.expectedBbox.y, `BBox Y must match ${fixture.expectedBbox.y}`);
    assert(c.bbox.width === fixture.expectedBbox.width, `BBox Width must match ${fixture.expectedBbox.width}`);
    assert(c.bbox.height === fixture.expectedBbox.height, `BBox Height must match ${fixture.expectedBbox.height}`);
    assert(c.areaPixels === 16, 'Area should be 16 pixels');
    assert(c.differenceScore > 0.4, 'Difference score should be significant');
  });

  test('GeoIntel: Dimension mismatch returns clear structured error', () => {
    const diff = new GeoIntelImageDiff();
    const m1 = { id: '1', label: '1', width: 10, height: 10, data: new Array(100).fill(0) };
    const m2 = { id: '2', label: '2', width: 12, height: 10, data: new Array(120).fill(0) };

    let errored = false;
    try {
      diff.analyze(m1, m2);
    } catch (e: any) {
      errored = true;
      assert(e.message.includes('Dimension mismatch'), 'Error should specify dimension mismatch');
    }
    assert(errored, 'Should have thrown error on dimension mismatch');
  });

  test('GeoIntel: Review workflow and limitation disclaimer', () => {
    const diff = new GeoIntelImageDiff();
    const fixture = getKnownDifferenceMatrixFixture();
    const candidates = diff.analyze(fixture.before, fixture.after);
    const confirmed = diff.confirmCandidate(candidates[0], 'Confirmed bridge span collapse.');
    assert(confirmed.reviewStatus === 'confirmed', 'Candidate review status confirmed');
    assert(confirmed.analystNotes === 'Confirmed bridge span collapse.', 'Analyst notes preserved');

    const report = diff.compileReport('Demo Report', fixture.before.id, fixture.after.id, [confirmed], 'Summary');
    assert(report.confirmedCount === 1, 'Report confirmed count is 1');
    assert(report.limitationsDisclaimer.includes('DISCLAIMER:'), 'Report must include limitation disclaimer');
  });

  // ==========================================
  // Module 4: MediRoute Tests
  // ==========================================
  test('MediRoute: Triage - Walking wounded categorized as Minimal (Green)', () => {
    const result = MediRouteTriageEngine.evaluate({
      ageGroup: 'adult',
      canWalk: true,
      respiratoryRate: 18,
      pulse: 75,
      mentalStatus: 'alert'
    });
    assert(result.category === 'minimal_green', 'Should be minimal green');
    assert(result.decisionTreePath.length > 0, 'Decision tree path documented');
  });

  test('MediRoute: Triage - Severe bleeding triggers Immediate (Red)', () => {
    const result = MediRouteTriageEngine.evaluate({
      ageGroup: 'adult',
      canWalk: false,
      severeBleeding: true,
      respiratoryRate: 20,
      pulse: 90,
      mentalStatus: 'alert'
    });
    assert(result.category === 'immediate_red', 'Should be immediate red');
    assert(result.triageReason.includes('Hemorrhage') || result.triageReason.includes('hemorrhage'), 'Reason cites bleeding');
  });

  test('MediRoute: Triage - Apnea (RR 0) triggers Expectant (Black)', () => {
    const result = MediRouteTriageEngine.evaluate({
      ageGroup: 'adult',
      canWalk: false,
      severeBleeding: false,
      respiratoryRate: 0,
      pulse: 0,
      mentalStatus: 'unresponsive'
    });
    assert(result.category === 'expectant_black', 'Should be expectant black');
  });

  test('MediRoute: Triage - Non-ambulatory stable triggers Delayed (Yellow)', () => {
    const result = MediRouteTriageEngine.evaluate({
      ageGroup: 'adult',
      canWalk: false,
      severeBleeding: false,
      respiratoryRate: 22,
      pulse: 88,
      mentalStatus: 'alert'
    });
    assert(result.category === 'delayed_yellow', 'Should be delayed yellow');
  });

  test('MediRoute: Shortest route selected when all edges are open', () => {
    const router = new MediRouteGraphRouter();
    const route = router.calculateRoute('CAS-01', 'HOSP-01', true);
    assert(route.hasRoute, 'Route must exist');
    // Path should go: CAS-01 -> INT-01 -> BRG-01 -> HOSP-01 (4 + 6 + 7 = 17 min)
    assert(route.pathNodeIds.includes('BRG-01'), 'Open route should take Bridge Highway Alpha');
    assert(route.totalTimeMin === 17, `Expected 17 min, got ${route.totalTimeMin}`);
    assert(route.blockedEdgesAvoided.length === 0, 'No edges blocked yet');
  });

  test('MediRoute: Blocking bridge edge reroutes via Mountain Bypass', () => {
    const router = new MediRouteGraphRouter();
    router.setEdgeBlockage('E-INT-BRG', true, 'Bridge collapsed');
    const route = router.calculateRoute('CAS-01', 'HOSP-01', true);

    assert(route.hasRoute, 'Alternate route must exist');
    // Path should avoid BRG-01 and use BYP-01: CAS-01 -> INT-01 -> BYP-01 -> HOSP-01 (4 + 12 + 14 = 30 min)
    assert(!route.pathNodeIds.includes('BRG-01'), 'Rerouted path must not use blocked bridge');
    assert(route.pathNodeIds.includes('BYP-01'), 'Rerouted path must use bypass');
    assert(route.totalTimeMin === 30, `Expected 30 min via bypass, got ${route.totalTimeMin}`);
    assert(route.blockedEdgesAvoided.includes('E-INT-BRG'), 'Should report blocked edge avoided');
  });

  test('MediRoute: Disconnected destination returns clear no-route result', () => {
    const router = new MediRouteGraphRouter();
    // Block both routes to hospital
    router.setEdgeBlockage('E-INT-BRG', true, 'Bridge out');
    router.setEdgeBlockage('E-BYP-HOSP', true, 'Landslide on bypass');

    const route = router.calculateRoute('CAS-01', 'HOSP-01', true);
    assert(!route.hasRoute, 'Should not find route');
    assert(route.pathNodeIds.length === 0, 'Path should be empty');
    assert(route.message.includes('No traversable evacuation route exists'), 'Clear explanation provided');
  });

  // ==========================================
  // Cross-Module Scenario & Reset Tests
  // ==========================================
  test('Cross-Module: Orchestrator executes full 5-step scenario and resets cleanly', () => {
    const orchestrator = new CrossModuleStoryOrchestrator();
    const finalState = orchestrator.runFullScenario();

    assert(finalState.incidents.some(i => i.id === 'INC-FL-02'), 'FieldLink incident present');
    assert(finalState.roadGraph.edges.find(e => e.id === 'E-INT-BRG')!.isBlocked, 'Road edge blocked');
    assert(finalState.activeRoute !== undefined && !finalState.activeRoute.pathNodeIds.includes('BRG-01'), 'Route rerouted');
    assert(finalState.candidateRegions.length > 0, 'GeoIntel candidate present');
    assert(finalState.skyWatchAlerts.length > 0, 'SkyWatch alert present');
    assert(finalState.scenarioHistory.length === 6, 'Scenario history has 6 events (baseline + 5 steps)');

    // Test deterministic reset
    const resetState = orchestrator.resetToBaseline();
    assert(resetState.incidents.length === 1, 'Incidents restored to baseline (1)');
    assert(!resetState.roadGraph.edges.find(e => e.id === 'E-INT-BRG')!.isBlocked, 'Road edge unblocked');
    assert(resetState.candidateRegions.length === 0, 'Candidate regions cleared');
    assert(resetState.skyWatchAlerts.length === 0, 'SkyWatch alerts cleared');
    assert(resetState.scenarioHistory.length === 1, 'History reset to baseline step');
  });

  return { passed, total, logs };
}
