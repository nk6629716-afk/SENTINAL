import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

test('GET /api/health returns 200 and simulated indicator', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(res.body.isSimulated, true);
  assert.ok(typeof res.body.uptimeSeconds === 'number');
});
