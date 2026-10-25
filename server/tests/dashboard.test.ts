import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('GET /api/dashboard computes metrics dynamically from stored records', async () => {
  const initialRes = await request(app).get('/api/dashboard');
  assert.strictEqual(initialRes.status, 200);
  assert.strictEqual(initialRes.body.success, true);
  const initialOpenCount = initialRes.body.data.metrics.openIncidentsCount;

  // Create a new active incident
  await request(app).post('/api/incidents').send({
    sourceModule: 'fieldlink',
    type: 'hazard',
    priority: 'critical',
    title: 'New Hazard Spawning in Sector Delta',
    notes: 'Testing dashboard dynamic counter update.',
    location: { lat: 34.054, lng: -118.244 },
  });

  const updatedRes = await request(app).get('/api/dashboard');
  assert.strictEqual(updatedRes.body.data.metrics.openIncidentsCount, initialOpenCount + 1);
  assert.strictEqual(updatedRes.body.data.isSimulated, true);
  assert.ok(Array.isArray(updatedRes.body.data.recentIncidents));
  assert.ok(Array.isArray(updatedRes.body.data.activeAlerts));
  assert.strictEqual(updatedRes.body.data.systemHealth.status, 'healthy');
});
