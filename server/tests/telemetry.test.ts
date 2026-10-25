import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('GET /api/telemetry returns tracks marked as simulated', async () => {
  const res = await request(app).get('/api/telemetry');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 3);
  for (const track of res.body.data) {
    assert.strictEqual(track.isSimulated, true);
    assert.ok(track.callsign);
    assert.ok(track.position);
  }
});

test('POST /api/telemetry/tick advances simulation and returns explainable alerts', async () => {
  const res = await request(app).post('/api/telemetry/tick');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.tracks));
});

test('GET /api/alerts and PATCH /api/alerts/:id acknowledge alert', async () => {
  const listRes = await request(app).get('/api/alerts');
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.body.data.length > 0);

  const targetAlert = listRes.body.data[0];
  assert.strictEqual(targetAlert.acknowledged, false);

  // Acknowledge the alert
  const ackRes = await request(app)
    .patch(`/api/alerts/${targetAlert.id}`)
    .send({ acknowledged: true });

  assert.strictEqual(ackRes.status, 200);
  assert.strictEqual(ackRes.body.data.acknowledged, true);
  assert.ok(ackRes.body.data.acknowledgedAt);

  // Verify in list
  const updatedListRes = await request(app).get('/api/alerts?acknowledged=true');
  const found = updatedListRes.body.data.find((a: any) => a.id === targetAlert.id);
  assert.ok(found);
});
