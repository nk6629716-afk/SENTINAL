# SENTINEL: Integrated Situational Awareness & Emergency Response Platform

A browser-based hackathon operations platform demonstrating four critical mission workflows:
1. **FieldLink**: Offline Tactical Communication & Battlefield Awareness (offline-first incident logging & idempotent batch sync).
2. **SkyWatch**: Counter-Drone Monitoring & Airspace Security (synthetic track telemetry, explainable anomaly detection, and alert management).
3. **GeoIntel**: Geospatial Intelligence & Reconnaissance Analysis (image difference change candidates, bounding boxes, analyst review workflow).
4. **MediRoute**: Emergency Medical Triage & Evacuation Logistics (fictional START triage logic, hazard tracking, and dynamic Dijkstra routing around blocked roads).

> **Important Disclosure**: All telemetry, incidents, casualties, hazards, and drone tracks in this system are synthetic and simulated for demonstration purposes. Triage logic is an illustrative workflow simulation and is not clinically validated medical advice.

---

## Architecture & Team Ownership

- **`shared/` (All Team Members)**:
  - Single source of truth for TypeScript types, API endpoint routes, error codes, and deterministic demo fixtures.
- **`server/` (Person 2 - Backend, Data & Synchronization)**:
  - Express + TypeScript backend service with persistent disk storage (`data/sentinel_store.json`), input validation, idempotent batch sync, dynamic routing (Dijkstra), SSE stream (`/api/events`), and 100% automated test coverage.
- **`src/` (Person 1 - Frontend & Product Experience)**:
  - Unified dashboard, Leaflet/Map visualizer, module views, and offline state management.
- **`src/algorithms/` & `src/simulation/` (Person 3 - Algorithms, Simulation & Module Logic)**:
  - Deterministic generators and pure algorithm pipelines for change detection, trajectory simulations, and routing rules.

---

## Backend Quickstart (Person 2 Deliverable)

### 1. Requirements
- Node.js >= 18.x
- npm >= 9.x

### 2. Setup & Installation
```bash
cd server
cp .env.example .env
npm install
```

### 3. Running the Server
```bash
# Development mode with hot-reloading (port 5000)
npm run dev

# Or build and start production bundle
npm run build
npm start
```

### 4. Running the Test Suite
The automated test suite runs 23 comprehensive unit and integration tests verifying all 4 modules, validation rules, idempotency, persistence across server restarts, and routing algorithms:
```bash
npm test
```

### 5. Seeding Baseline Demo Fixtures
```bash
npm run seed
```

---

## API Contract Reference

Base URL: `http://localhost:5000`

### 1. Unified Dashboard & Health
- `GET /api/health`: Health status, uptime, storage mode, and simulated marker.
- `GET /api/dashboard`: Aggregated metrics (open incidents, active tracks, pending reviews, evacuees, active hazards) computed dynamically from stored records.
- `GET /api/events`: Server-Sent Events (SSE) live event channel (`incident:created`, `alert:triggered`, `hazard:updated`, etc.). REST polling fallback is fully supported.

### 2. FieldLink (Incidents & Offline Sync)
- `GET /api/incidents`: Filter by `sourceModule`, `type`, `priority`, `status`, or `search`.
- `GET /api/incidents/:id`: Fetch single incident.
- `POST /api/incidents`: Create incident. Validates title, priority, location coordinates, and timestamps.
- `PATCH /api/incidents/:id`: Update status (`active`, `in_progress`, `resolved`, `archived`) or priority.
- `POST /api/sync`: Batch sync endpoint for offline clients.
  - Accepts `{ items: [ { clientId, title, priority, ... } ] }`.
  - Fully idempotent: repeating a batch marks items as `already_received` without creating duplicates.
  - Partial batch failure: returns per-item status (`accepted`, `already_received`, `rejected`).
  - Preserves original client `createdAt` timestamp.

### 3. SkyWatch (Airspace Monitoring & Anomaly Alerts)
- `GET /api/telemetry`: Retrieve active drone tracks (position, altitude, heading, speed, simulation marker).
- `GET /api/telemetry/:id`: Retrieve single track.
- `POST /api/telemetry/tick`: Step simulation forward and evaluate explainable anomaly rules (`ZONE_INCURSION`, `SUDDEN_ACCELERATION`, `ROUTE_DEVIATION`).
- `GET /api/alerts`: List alerts (filter by `acknowledged`, `severity`, `trackId`).
- `PATCH /api/alerts/:id`: Acknowledge an alert (`{ acknowledged: true }`).

### 4. GeoIntel (Geospatial Analysis)
- `GET /api/geointel/observations`: List candidate change observations with normalized bounding boxes `[x, y, width, height]`.
- `POST /api/geointel/observations`: Register new candidate observation from comparison pipeline.
- `PATCH /api/geointel/observations/:id`: Analyst review action (`reviewStatus`: `confirmed_candidate` | `dismissed_false_positive`, `analystNotes`).

### 5. MediRoute (Triage & Evacuation Routing)
- `GET /api/patients`: List casualty records (filter by `workflowStatus`, `triageCategory`).
- `POST /api/patients`: Casualty intake; evaluates vitals against START triage logic and provides transparent reason.
- `PATCH /api/patients/:id`: Update workflow status (`assessed`, `assigned`, `evacuated`).
- `GET /api/hazards`: List road network hazards and blocked status.
- `POST /api/hazards`: Report/toggle road blockage on graph edges (`{ edgeId, blocked: true, ... }`).
- `POST /api/routes/calculate`: Dijkstra shortest-path calculation:
  - Request: `{ startNodeId, destinationNodeId, avoidHazards: true }`
  - Response: `{ routeFound, pathNodeIds, edgesTraversed, totalDistanceKm, estimatedTimeMinutes, hazardsAvoided }`
  - Dynamically reroutes to alternate paths when roads are blocked!
- `GET /api/routes/graph`: Retrieve all road network nodes and edges for map rendering.

### 6. Demo Replayability
- `POST /api/demo/reset`: Deterministically restores clean baseline scenario for judges.
- `POST /api/demo/seed`: Initializes connected cross-module demo story.

---

## Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | BAD_REQUEST | INTERNAL_ERROR",
    "message": "Human readable explanation",
    "details": [
      { "field": "location.lat", "message": "Latitude must be between -90 and 90" }
    ]
  }
}
```