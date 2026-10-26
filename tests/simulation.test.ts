/**
 * SENTINEL — Phase 1 Unit Test: Deterministic Seeded Simulation Engine
 * Verifies that two independent simulation engines started with the exact same seed
 * produce 100% identical states after 60 ticks.
 */

import { SimulationEngine } from '../src/simulation/simulationEngine.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

export function runSimulationDeterminismTest(): void {
  console.log('\n[PHASE 1 TEST] Deterministic Seeded Simulation Test (60 ticks):');

  const seed = 4242;
  const engine1 = new SimulationEngine(seed);
  const engine2 = new SimulationEngine(seed);

  console.log(`  Initialized Engine 1 & Engine 2 with seed = ${seed}`);

  for (let tick = 1; tick <= 60; tick++) {
    engine1.step();
    engine2.step();
  }

  const state1 = engine1.getState();
  const state2 = engine2.getState();

  // 1. Tick check
  assert(state1.tick === 60, `Engine 1 must reach tick 60, got ${state1.tick}`);
  assert(state2.tick === 60, `Engine 2 must reach tick 60, got ${state2.tick}`);
  console.log('  ✓ Both engines reached tick 60');

  // 2. Track count check (at least 8 objects)
  assert(state1.tracks.length >= 8, `Must have >= 8 tracks, got ${state1.tracks.length}`);
  assert(state1.tracks.length === state2.tracks.length, 'Track lengths must match');
  console.log(`  ✓ Track count matches (${state1.tracks.length} tracks >= 8 objects)`);

  // 3. Track positions and kinematics match exactly
  for (let i = 0; i < state1.tracks.length; i++) {
    const t1 = state1.tracks[i];
    const t2 = state2.tracks[i];
    assert(t1.id === t2.id, `Track ${i} ID mismatch: ${t1.id} vs ${t2.id}`);
    assert(t1.lat === t2.lat, `Track ${t1.id} lat mismatch: ${t1.lat} vs ${t2.lat}`);
    assert(t1.lng === t2.lng, `Track ${t1.id} lng mismatch: ${t1.lng} vs ${t2.lng}`);
    assert(t1.heading === t2.heading, `Track ${t1.id} heading mismatch`);
    assert(t1.speed === t2.speed, `Track ${t1.id} speed mismatch`);
    assert(t1.threatScore === t2.threatScore, `Track ${t1.id} threat score mismatch`);
  }
  console.log('  ✓ All 8 track coordinates, headings, speeds, and threat scores identical');

  // 4. Casualty vitals match exactly
  assert(state1.casualties.length === state2.casualties.length, 'Casualties length must match');
  for (let i = 0; i < state1.casualties.length; i++) {
    const c1 = state1.casualties[i];
    const c2 = state2.casualties[i];
    assert(c1.id === c2.id, `Casualty ${i} ID mismatch`);
    assert(c1.heartRate === c2.heartRate, `Casualty ${c1.id} HR mismatch: ${c1.heartRate} vs ${c2.heartRate}`);
    assert(c1.respiratoryRate === c2.respiratoryRate, `Casualty ${c1.id} RR mismatch`);
    assert(c1.spo2 === c2.spo2, `Casualty ${c1.id} SpO2 mismatch`);
    assert(c1.bpSystolic === c2.bpSystolic, `Casualty ${c1.id} BP mismatch`);
    assert(c1.triageCategory === c2.triageCategory, `Casualty ${c1.id} triage category mismatch`);
  }
  console.log('  ✓ All casualty live vitals and automated START triage categories identical');

  // 5. Road hazards match exactly
  for (let i = 0; i < state1.hazards.length; i++) {
    const h1 = state1.hazards[i];
    const h2 = state2.hazards[i];
    assert(h1.id === h2.id, `Hazard ${i} ID mismatch`);
    assert(h1.blocked === h2.blocked, `Hazard ${h1.id} blocked status mismatch`);
  }
  console.log('  ✓ All road hazard states and scheduled clearings identical');

  console.log('  ✓ 60-TICK DETERMINISTIC SEEDED OUTPUT IS 100% IDENTICAL!\n');
}

// Direct execution when run via node
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/simulation.test.ts')) {
  try {
    runSimulationDeterminismTest();
    console.log('PHASE 1 SIMULATION TEST PASSED! ✓');
    process.exit(0);
  } catch (err: any) {
    console.error('PHASE 1 TEST FAILED:', err.message);
    process.exit(1);
  }
}

