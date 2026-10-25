/**
 * SENTINEL — Core Algorithms, Simulation & Data Engine
 * 
 * Public API Surface for Person 1 (Frontend UI) & Person 2 (Backend API)
 */

// Shared Data Contracts
export * from '../shared/contracts';

// Module 1: FieldLink (Offline Queue & Sync Reconciliation)
export * from './algorithms/fieldlink/queueManager';

// Module 2: SkyWatch (Flight Simulator & Explainable Anomaly Detection)
export * from './algorithms/skywatch/simulator';
export * from './algorithms/skywatch/anomalyDetector';

// Module 3: GeoIntel (Matrix Diffing, Region Clustering & Review)
export * from './algorithms/geointel/imageDiff';

// Module 4: MediRoute (Emergency Triage Rules & Dijkstra Routing)
export * from './algorithms/mediroute/triageEngine';
export * from './algorithms/mediroute/graphRouter';

// Simulation, Baseline Fixtures & Cross-Module Scenario
export * from './simulation/demoFixtures';
export * from './simulation/scenarios/crossModuleStory';
