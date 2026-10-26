import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { app } from '../src/app';
import { Database } from '../src/db/database';

test('Database persists records to disk and reloads them on fresh instantiation (server restart test)', async () => {
  const testDataDir = path.resolve(__dirname, '../data-test-persistence');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  const testDbFile = path.join(testDataDir, 'test_persistence.json');

  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  // 1. First DB instance: writes a new incident
  const db1 = new Database(testDbFile, false);
  const now = new Date().toISOString();
  db1.saveIncident({
    id: 'INC-PERSIST-1',
    clientId: 'cli-persist-1',
    sourceModule: 'fieldlink',
    type: 'infrastructure',
    priority: 'high',
    status: 'active',
    title: 'Persistent Fuel Depot Leak',
    notes: 'Stored in persistent disk database.',
    location: { lat: 34.05, lng: -118.25, name: 'Fuel Depot' },
    createdAt: now,
    updatedAt: now,
    syncedAt: now,
    isSimulated: true,
  });

  // Verify file was written to disk
  assert.ok(fs.existsSync(testDbFile), 'Database file should exist on disk');

  // 2. Second DB instance: simulating server restart by reading from same file
  const db2 = new Database(testDbFile, false);
  const reloadedIncident = db2.getIncidentById('INC-PERSIST-1');
  assert.ok(reloadedIncident, 'Incident should be present after server restart');
  assert.strictEqual(reloadedIncident?.title, 'Persistent Fuel Depot Leak');

  // Cleanup test file
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }
  if (fs.existsSync(testDataDir)) {
    fs.rmdirSync(testDataDir);
  }
});

test('POST /api/demo/reset resets data back to deterministic baseline fixtures', async () => {
  // Reset clean first to remove any leftover pending items from prior test runs
  await request(app).post('/api/demo/reset?preservePending=false');

  // Add a test record
  await request(app).post('/api/incidents').send({
    sourceModule: 'fieldlink',
    type: 'recon',
    priority: 'low',
    title: 'Ephemeral Incident Before Reset',
    notes: 'Should be removed upon reset.',
    location: { lat: 34.05, lng: -118.24 },
  });

  // Call reset
  const resetRes = await request(app).post('/api/demo/reset');
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual(resetRes.body.success, true);

  // Check incidents list is back to exactly baseline count (3 items)
  const listRes = await request(app).get('/api/incidents');
  assert.strictEqual(listRes.body.data.length, 3);
  assert.strictEqual(listRes.body.data.some((i: any) => i.title === 'Ephemeral Incident Before Reset'), false);
});

test('POST /api/demo/reset preserves pending offline incident reports and custom user records', async () => {
  const { db } = await import('../src/db/database');
  const now = new Date().toISOString();

  // Save a pending incident (e.g. from offline intake queue)
  db.saveIncident({
    id: 'INC-PENDING-OFFLINE-TEST',
    clientId: 'cli-pending-test-01',
    sourceModule: 'fieldlink',
    type: 'medical_evac',
    priority: 'critical',
    status: 'pending_sync',
    syncStatus: 'pending',
    title: 'Pending Offline Report From Field',
    notes: 'Must not be overwritten by demo reset.',
    location: { lat: 34.06, lng: -118.24, name: 'Field Outpost' },
    createdAt: now,
    updatedAt: now,
    isSimulated: true,
  });

  // Save a failed offline incident
  db.saveIncident({
    id: 'INC-FAILED-OFFLINE-TEST',
    clientId: 'cli-failed-test-01',
    sourceModule: 'fieldlink',
    type: 'infrastructure',
    priority: 'high',
    status: 'active',
    syncStatus: 'failed',
    title: 'Failed Offline Report From Field',
    notes: 'Failed sync must survive demo reset for retry.',
    location: { lat: 34.07, lng: -118.25, name: 'Remote Outpost' },
    createdAt: now,
    updatedAt: now,
    isSimulated: true,
  });

  // Save pending and failed GeoIntel observations
  db.saveObservation({
    id: 'GEO-PENDING-OFFLINE-TEST',
    samplePairId: 'PAIR-DEMO-01',
    name: 'Sector 4 Anomaly',
    description: 'Pending offline satellite observation',
    reviewStatus: 'unreviewed',
    syncStatus: 'pending',
    candidateCount: 1,
    detectedCandidates: [],
    analystNotes: '',
    createdAt: now,
    reviewedAt: null,
    isSimulated: true,
  } as any);

  db.saveObservation({
    id: 'GEO-FAILED-OFFLINE-TEST',
    samplePairId: 'PAIR-DEMO-01',
    name: 'Sector 5 Anomaly',
    description: 'Failed sync satellite observation',
    reviewStatus: 'unreviewed',
    syncStatus: 'failed',
    candidateCount: 1,
    detectedCandidates: [],
    analystNotes: '',
    createdAt: now,
    reviewedAt: null,
    isSimulated: true,
  } as any);

  // Call reset
  const resetRes = await request(app).post('/api/demo/reset');
  assert.strictEqual(resetRes.status, 200);

  // Verify that pending and failed incidents were preserved
  const preservedPending = db.getIncidentById('INC-PENDING-OFFLINE-TEST');
  assert.ok(preservedPending, 'Pending offline incident report must be preserved after demo reset');
  assert.strictEqual(preservedPending?.syncStatus, 'pending');

  const preservedFailed = db.getIncidentById('INC-FAILED-OFFLINE-TEST');
  assert.ok(preservedFailed, 'Failed offline incident report must be preserved after demo reset');
  assert.strictEqual(preservedFailed?.syncStatus, 'failed');

  // Verify that pending and failed Geo observations were preserved
  const preservedPendingObs = db.getObservationById('GEO-PENDING-OFFLINE-TEST');
  assert.ok(preservedPendingObs, 'Pending GeoIntel observation must be preserved after demo reset');
  assert.strictEqual((preservedPendingObs as any)?.syncStatus, 'pending');

  const preservedFailedObs = db.getObservationById('GEO-FAILED-OFFLINE-TEST');
  assert.ok(preservedFailedObs, 'Failed GeoIntel observation must be preserved after demo reset');
  assert.strictEqual((preservedFailedObs as any)?.syncStatus, 'failed');

  // Clean up test records after assertion
  await request(app).post('/api/demo/reset?preservePending=false');
});

test('POST /api/demo/seed does not create duplicate baseline fixtures on repeated calls', async () => {
  // First seed
  const res1 = await request(app).post('/api/demo/seed');
  assert.strictEqual(res1.status, 200);

  const incRes1 = await request(app).get('/api/incidents');
  const initialCount = incRes1.body.data.length;
  assert.strictEqual(initialCount, 3, 'Baseline must have exactly 3 seeded incidents');

  // Repeated seed
  const res2 = await request(app).post('/api/demo/seed');
  assert.strictEqual(res2.status, 200);

  const incRes2 = await request(app).get('/api/incidents');
  assert.strictEqual(incRes2.body.data.length, initialCount, 'Repeated seeding must not duplicate records');

  // Check unique IDs
  const ids = incRes2.body.data.map((i: any) => i.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, ids.length, 'Seeded incident IDs must be unique');
});
