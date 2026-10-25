import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('GET /api/incidents returns seeded incidents with simulation marker', async () => {
  const res = await request(app).get('/api/incidents');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 3);
  assert.strictEqual(res.body.meta.isSimulated, true);
});

test('GET /api/incidents?priority=high filters results correctly', async () => {
  const res = await request(app).get('/api/incidents?priority=high');
  assert.strictEqual(res.status, 200);
  for (const item of res.body.data) {
    assert.strictEqual(item.priority, 'high');
  }
});

test('POST /api/incidents validates required fields and rejects invalid payload with 400', async () => {
  const res = await request(app).post('/api/incidents').send({
    title: '', // Empty title
    priority: 'invalid_priority',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('POST /api/incidents creates a valid incident and sets timestamps', async () => {
  const payload = {
    sourceModule: 'fieldlink',
    type: 'medical',
    priority: 'high',
    title: 'Emergency Medical Evacuation Needed',
    notes: 'Transport team requesting armed escort through perimeter gate 3.',
    location: {
      lat: 34.0522,
      lng: -118.2437,
      name: 'Perimeter Gate 3',
    },
  };

  const res = await request(app).post('/api/incidents').send(payload);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.title, payload.title);
  assert.strictEqual(res.body.data.isSimulated, true);
  assert.ok(res.body.data.id.startsWith('INC-'));
  assert.ok(res.body.data.createdAt);
});

test('PATCH /api/incidents/:id updates incident status and returns updated record', async () => {
  const res = await request(app)
    .patch('/api/incidents/INC-101')
    .send({ status: 'resolved' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, 'resolved');

  // Verify persistence
  const getRes = await request(app).get('/api/incidents/INC-101');
  assert.strictEqual(getRes.body.data.status, 'resolved');
});
