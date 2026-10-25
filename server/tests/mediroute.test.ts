import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('POST /api/patients validates intake and automatically assigns explainable demo triage category', async () => {
  const patientData = {
    fictionalName: 'Test Casualty Echo-1',
    age: 29,
    gender: 'Female',
    vitals: {
      respiratoryRate: 36, // Tachypnea > 30 -> Immediate (Red)
      pulsePresent: true,
      canFollowCommands: true,
      ambulatory: false,
    },
    location: { lat: 34.062, lng: -118.238, name: 'Sector Charlie' },
  };

  const res = await request(app).post('/api/patients').send(patientData);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.triageCategory, 'immediate');
  assert.ok(res.body.data.triageReason.includes('36/min'));
  assert.strictEqual(res.body.data.ruleVersion, 'DEMO_START_TRIAGE_V1');
  assert.strictEqual(res.body.data.isSimulated, true);
});

test('PATCH /api/patients/:id updates workflow status', async () => {
  const res = await request(app)
    .patch('/api/patients/PAT-401')
    .send({ workflowStatus: 'evacuated' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.workflowStatus, 'evacuated');

  // Verify persistence
  const getRes = await request(app).get('/api/patients/PAT-401');
  assert.strictEqual(getRes.body.data.workflowStatus, 'evacuated');
});

test('POST /api/routes/calculate calculates shortest route on open edges', async () => {
  // Clear all hazards so all roads are open
  db.resetToBaseline();
  // Clear blocked hazard
  const hazard = db.getHazardByEdgeId('EDGE-2');
  if (hazard) {
    db.saveHazard({ ...hazard, blocked: false });
  }

  const res = await request(app).post('/api/routes/calculate').send({
    startNodeId: 'NODE-CASUALTY-1',
    destinationNodeId: 'NODE-HOSPITAL-CENTRAL',
    avoidHazards: true,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.routeFound, true);
  // Shortest path: NODE-CASUALTY-1 -> NODE-JUNCTION-A -> NODE-JUNCTION-B -> NODE-HOSPITAL-CENTRAL (1.2 + 1.0 + 1.4 = 3.6 km)
  assert.deepStrictEqual(res.body.data.pathNodeIds, [
    'NODE-CASUALTY-1',
    'NODE-JUNCTION-A',
    'NODE-JUNCTION-B',
    'NODE-HOSPITAL-CENTRAL',
  ]);
  assert.strictEqual(res.body.data.totalDistanceKm, 3.6);
});

test('POST /api/routes/calculate reroutes dynamically when EDGE-2 is blocked by hazard', async () => {
  // Ensure EDGE-2 is blocked
  await request(app).post('/api/hazards').send({
    edgeId: 'EDGE-2',
    fromNode: 'NODE-JUNCTION-A',
    toNode: 'NODE-JUNCTION-B',
    blocked: true,
    hazardType: 'road_blocked',
    reportedBy: 'Scout Unit 4',
  });

  const res = await request(app).post('/api/routes/calculate').send({
    startNodeId: 'NODE-CASUALTY-1',
    destinationNodeId: 'NODE-HOSPITAL-CENTRAL',
    avoidHazards: true,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.routeFound, true);
  // Since EDGE-2 is blocked, it takes bypass: CASUALTY-1 -> JUNCTION-C -> JUNCTION-B -> HOSPITAL-CENTRAL (0.9 + 2.1 + 1.4 = 4.4 km)
  assert.deepStrictEqual(res.body.data.pathNodeIds, [
    'NODE-CASUALTY-1',
    'NODE-JUNCTION-C',
    'NODE-JUNCTION-B',
    'NODE-HOSPITAL-CENTRAL',
  ]);
  assert.ok(res.body.data.hazardsAvoided.includes('EDGE-2'));
  assert.strictEqual(res.body.data.totalDistanceKm, 4.4);
});

test('POST /api/routes/calculate handles disconnected graph cleanly with routeFound: false', async () => {
  // Block both routes to hospital (EDGE-3: access way to hospital)
  await request(app).post('/api/hazards').send({
    edgeId: 'EDGE-3',
    fromNode: 'NODE-JUNCTION-B',
    toNode: 'NODE-HOSPITAL-CENTRAL',
    blocked: true,
  });

  const res = await request(app).post('/api/routes/calculate').send({
    startNodeId: 'NODE-CASUALTY-1',
    destinationNodeId: 'NODE-HOSPITAL-CENTRAL',
    avoidHazards: true,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.routeFound, false);
  assert.ok(res.body.data.message.includes('No available unblocked route'));
});
