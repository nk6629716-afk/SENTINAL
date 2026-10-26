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

  // Call reset
  const resetRes = await request(app).post('/api/demo/reset');
  assert.strictEqual(resetRes.status, 200);

  // Verify that pending incident was preserved
  const preserved = db.getIncidentById('INC-PENDING-OFFLINE-TEST');
  assert.ok(preserved, 'Pending offline incident report must be preserved after demo reset');
  assert.strictEqual(preserved?.syncStatus, 'pending');

  // Clean up test record after assertion
  await request(app).post('/api/demo/reset?preservePending=false');
});

