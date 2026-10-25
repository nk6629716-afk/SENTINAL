import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db/database';

beforeEach(() => {
  db.resetToBaseline();
});

test('GET /api/geointel/observations returns observations with normalized coords', async () => {
  const res = await request(app).get('/api/geointel/observations');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.length >= 2);
  const first = res.body.data[0];
  assert.ok(first.normalizedCoordinates);
  assert.strictEqual(first.isSimulated, true);
});

test('POST /api/geointel/observations validates normalized bounding boxes', async () => {
  // Invalid coordinates (out of 0-1 range)
  const invalidRes = await request(app).post('/api/geointel/observations').send({
    samplePairId: 'PAIR-TEST',
    beforeImageId: 'IMG-1',
    afterImageId: 'IMG-2',
    normalizedCoordinates: { x: 1.5, y: -0.2, width: 2.0, height: 1.0 },
    differenceScore: 0.8,
    explanation: 'Test',
  });
  assert.strictEqual(invalidRes.status, 400);
  assert.strictEqual(invalidRes.body.error.code, 'VALIDATION_ERROR');

  // Valid creation
  const validRes = await request(app).post('/api/geointel/observations').send({
    samplePairId: 'PAIR-TEST-VALID',
    beforeImageId: 'IMG-TEST-1',
    afterImageId: 'IMG-TEST-2',
    normalizedCoordinates: { x: 0.1, y: 0.2, width: 0.3, height: 0.25 },
    differenceScore: 0.65,
    explanation: 'Candidate excavation or trench detected in eastern perimeter zone.',
    analystNotes: 'Requires low-altitude UAS confirmation.',
  });
  assert.strictEqual(validRes.status, 201);
  assert.strictEqual(validRes.body.data.reviewStatus, 'pending_review');
});

test('PATCH /api/geointel/observations/:id updates analyst review workflow', async () => {
  const res = await request(app)
    .patch('/api/geointel/observations/GEO-302')
    .send({
      reviewStatus: 'confirmed_candidate',
      analystNotes: 'Confirmed ground anomaly; flagged as priority hazard.',
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.reviewStatus, 'confirmed_candidate');
  assert.ok(res.body.data.reviewedAt);

  // Persistence check
  const getRes = await request(app).get('/api/geointel/observations/GEO-302');
  assert.strictEqual(getRes.body.data.reviewStatus, 'confirmed_candidate');
  assert.strictEqual(getRes.body.data.analystNotes, 'Confirmed ground anomaly; flagged as priority hazard.');
});
