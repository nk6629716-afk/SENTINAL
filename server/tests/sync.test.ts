import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('POST /api/sync accepts valid offline reports batch and creates incidents', async () => {
  const batch = {
    items: [
      {
        clientId: 'client-offline-uuid-1',
        sourceModule: 'fieldlink',
        type: 'infrastructure',
        priority: 'high',
        title: 'Water Main Rupture in Zone 2',
        notes: 'Flood waters advancing toward primary communication bunker.',
        location: { lat: 34.053, lng: -118.245, name: 'Zone 2 North' },
        createdAt: '2026-10-25T06:30:00.000Z',
      },
      {
        clientId: 'client-offline-uuid-2',
        sourceModule: 'fieldlink',
        type: 'hazard',
        priority: 'medium',
        title: 'Fallen Power Line on Secondary Access Way',
        notes: 'Arced cables across roadway. Area cordoned off with tape.',
        location: { lat: 34.056, lng: -118.241, name: 'Secondary Access' },
        createdAt: '2026-10-25T06:35:00.000Z',
      },
    ],
  };

  const res = await request(app).post('/api/sync').send(batch);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.processedCount, 2);
  assert.strictEqual(res.body.data.acceptedCount, 2);
  assert.strictEqual(res.body.data.duplicateCount, 0);
  assert.strictEqual(res.body.data.rejectedCount, 0);

  // Verify records exist in incident list with preserved client createdAt
  const incRes = await request(app).get('/api/incidents');
  const found = incRes.body.data.find((i: any) => i.clientId === 'client-offline-uuid-1');
  assert.ok(found);
  assert.strictEqual(found.createdAt, '2026-10-25T06:30:00.000Z');
  assert.ok(found.syncedAt);
});

test('POST /api/sync is idempotent: repeating batch marks items as already_received without creating duplicates', async () => {
  const batch = {
    items: [
      {
        clientId: 'idempotent-test-key-99',
        sourceModule: 'fieldlink',
        type: 'recon',
        priority: 'low',
        title: 'Perimeter Sensor Battery Low',
        notes: 'Sensor node P-12 reported battery at 12%. Replacement scheduled.',
        location: { lat: 34.058, lng: -118.249 },
        createdAt: '2026-10-25T06:40:00.000Z',
      },
    ],
  };

  // First sync
  const firstRes = await request(app).post('/api/sync').send(batch);
  assert.strictEqual(firstRes.status, 200);
  assert.strictEqual(firstRes.body.data.acceptedCount, 1);
  assert.strictEqual(firstRes.body.data.results[0].status, 'accepted');
  const serverId = firstRes.body.data.results[0].serverId;

  const countBeforeSecondSync = db.getIncidents().length;

  // Second sync (simulating network retry or duplicate client batch submission)
  const secondRes = await request(app).post('/api/sync').send(batch);
  assert.strictEqual(secondRes.status, 200);
  assert.strictEqual(secondRes.body.data.duplicateCount, 1);
  assert.strictEqual(secondRes.body.data.acceptedCount, 0);
  assert.strictEqual(secondRes.body.data.results[0].status, 'already_received');
  assert.strictEqual(secondRes.body.data.results[0].serverId, serverId);

  // Verify total count did NOT increase
  const countAfterSecondSync = db.getIncidents().length;
  assert.strictEqual(countAfterSecondSync, countBeforeSecondSync);
});

test('POST /api/sync handles partial failures gracefully returning per-item outcomes', async () => {
  const mixedBatch = {
    items: [
      {
        clientId: 'valid-item-abc',
        sourceModule: 'fieldlink',
        type: 'medical',
        priority: 'high',
        title: 'First Aid Kit Restock Requested',
        notes: 'Aid station 3 supplies low on gauze and antiseptic.',
        location: { lat: 34.055, lng: -118.243 },
        createdAt: '2026-10-25T07:00:00.000Z',
      },
      {
        clientId: 'invalid-item-def',
        sourceModule: 'fieldlink',
        type: 'invalid_type', // Invalid type!
        priority: 'high',
        title: '', // Empty title!
        location: { lat: 999, lng: 999 }, // Out of bounds coordinates!
      },
    ],
  };

  const res = await request(app).post('/api/sync').send(mixedBatch);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.processedCount, 2);
  assert.strictEqual(res.body.data.acceptedCount, 1);
  assert.strictEqual(res.body.data.rejectedCount, 1);

  const accepted = res.body.data.results.find((r: any) => r.clientId === 'valid-item-abc');
  const rejected = res.body.data.results.find((r: any) => r.clientId === 'invalid-item-def');

  assert.strictEqual(accepted.status, 'accepted');
  assert.ok(accepted.serverId);

  assert.strictEqual(rejected.status, 'rejected');
  assert.strictEqual(rejected.serverId, null);
  assert.ok(rejected.reason);
});

test('POST /api/sync accepts FieldLink UI incident types and legacy reports payload format', async () => {
  // Test canonical items with UI incident types
  const canonicalBatch = {
    items: [
      {
        clientId: 'fl-ui-item-1',
        sourceModule: 'fieldlink',
        type: 'security_breach',
        priority: 'high',
        title: 'Perimeter Intrusion Detected',
        notes: 'Motion tripwire activated on Sector 4 fence.',
        location: { lat: 34.052, lng: -118.243 },
        createdAt: '2026-10-25T07:10:00.000Z',
      },
      {
        clientId: 'fl-ui-item-2',
        sourceModule: 'fieldlink',
        type: 'road_blockage',
        priority: 'critical',
        title: 'Culvert Washout on Bridge 4',
        notes: 'Road collapsed after flash flood surge.',
        location: { lat: 34.062, lng: -118.231 },
        createdAt: '2026-10-25T07:12:00.000Z',
      },
    ],
  };

  const res1 = await request(app).post('/api/sync').send(canonicalBatch);
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.data.acceptedCount, 2);
  assert.strictEqual(res1.body.data.rejectedCount, 0);

  // Test backward-compatible reports envelope
  const legacyReportsBatch = {
    reports: [
      {
        clientId: 'fl-legacy-report-1',
        clientTimestamp: '2026-10-25T07:15:00.000Z',
        report: {
          clientId: 'fl-legacy-report-1',
          sourceModule: 'fieldlink',
          type: 'infrastructure_damage',
          priority: 'medium',
          title: 'Antenna Array Degraded',
          notes: 'Secondary VHF repeater mast tilted by wind.',
          location: { lat: 34.071, lng: -118.258 },
          createdAt: '2026-10-25T07:15:00.000Z',
        },
      },
    ],
  };

  const res2 = await request(app).post('/api/sync').send(legacyReportsBatch);
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.body.data.acceptedCount, 1);
  assert.strictEqual(res2.body.data.results[0].clientId, 'fl-legacy-report-1');
  assert.strictEqual(res2.body.data.results[0].status, 'accepted');
});

