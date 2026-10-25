# SENTINEL: Integrated Situational Awareness & Emergency Response Platform

A browser-based hackathon operations platform demonstrating four critical mission workflows:
1. **FieldLink (Offline Tactical Reporting)**: Offline-first incident reporting backed by IndexedDB, local queue manager, and batch reconciliation with idempotent deduplication.
2. **SkyWatch (Counter-Drone & Airspace Security)**: Deterministic synthetic UAV telemetry tracking, radar sweep visualization, and transparent rule-based anomaly detection (`ZONE_INCURSION`, `SUDDEN_ACCELERATION`, `ROUTE_DEVIATION`).
3. **GeoIntel (Geospatial Reconnaissance)**: Multi-temporal satellite imagery analysis, swipe/side-by-side comparison, candidate change detection with difference scores, analyst review drawer, and intelligence debrief export.
4. **MediRoute (Triage & Evacuation Logistics)**: Algorithmic START triage classification with visible clinical rationale, casualty evacuation queue, interactive road graph, and Dijkstra hazard-aware routing around blocked bridges and debris.

> **Important Disclosure**: All telemetry, incidents, casualties, hazards, and drone tracks in this system are synthetic and simulated for demonstration purposes. Triage logic is an illustrative workflow simulation and is not clinically validated medical advice.

---

## Architecture & Team Division

- **Person 1 (Frontend & Experience)**: React 18, TypeScript, Vite, bespoke SVG/Canvas tactical map engine, IndexedDB offline store, command UI, and mock/live API coordinator (`src/`).
- **Person 2 (Backend, Persistence & Sync)**: Node.js + Express API (`/api/*`), durable atomic store (`data/sentinel_store.json`), idempotent batch sync (`/api/sync`), dynamic Dijkstra routing, Server-Sent Events stream (`/api/events`), and comprehensive test suite (`server/`).
- **Person 3 (Algorithms & Simulation)**: Pure deterministic scenario generation, START triage decision trees, Dijkstra/A* routing, and change detection algorithms (`src/algorithms/` & `src/simulation/`).
- **Shared Contracts (`shared/`)**: Single source of truth for TypeScript interfaces, route constants, and baseline fixtures shared across all three components.

---

## Quickstart & Verification

### 1. Installation
Install root frontend dependencies and backend dependencies:
```bash
# Root frontend dependencies
npm install

# Backend server dependencies
cd server
npm install
cd ..
```

### 2. Run Local Development Servers

To run both the Frontend and Live Backend concurrently:

**Terminal 1 — Backend API Server (Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend Application (Port 5173):**
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser. The frontend automatically proxies `/api` calls to the live backend server.

### 3. Run Automated Tests
```bash
# Frontend contract & algorithm verification tests
npm test

# Backend integration & persistence tests (in server directory)
cd server && npm test
```

### 4. Production Build
```bash
# Build frontend
npm run build

# Build backend
cd server && npm run build
```

---

## 3-Minute Judge Demonstration Checklist

1. **Unified Dashboard (`/`)**:
   - Inspect the KPI summary metrics (FieldLink Reports, Drone Tracks, GeoIntel Recon, MediRoute Casualties).
   - View the Common Operational Picture on the interactive Tactical Map (pan/zoom, layer toggles).
2. **FieldLink Offline Reporting**:
   - Toggle **"Go Offline"** in the top navigation header.
   - Note the **"OFFLINE TACTICAL MODE ACTIVE"** warning banner.
   - Fill out an incident report (e.g., "Perimeter Trip") and click **"Save Locally to Outbox"**.
   - Confirm the report appears in the outbox marked **`AWAITING SYNC`** (persisted in browser IndexedDB).
   - Click **"Restore Network Link"** and hit **"Sync Outbox"** to observe confirmation and deduplication.
3. **SkyWatch Counter-Drone Radar**:
   - Observe real-time synthetic UAV tracks moving along heading vectors with breadcrumb flight history.
   - Inspect the alert card explaining `NO_FLY_ZONE_INCURSION` with observed distance vs threshold.
   - Click **"Acknowledge Threat Alert"** to record duty officer acknowledgement.
4. **GeoIntel Reconnaissance**:
   - Use the interactive swipe split-slider to compare Baseline vs Surveillance satellite imagery.
   - Click **"Run Image Difference"** to trigger multi-spectral change detection.
   - Select candidate `CAN-01` to view its 88% difference score, enter analyst notes, and mark as **"Confirm & Review"**.
   - Click **"Export Report"** to download the intelligence debrief text report.
5. **MediRoute Triage & Evacuation**:
   - Adjust the respiratory rate slider (>30/min) in the casualty intake form to observe dynamic Rule 3 `IMMEDIATE (RED)` classification with explicit justification.
   - On the road network, click **"Highway 9 Main Corridor"** to toggle between **BLOCKED** and **OPEN**.
   - Click **"Recalculate Evacuation Route"** to verify Dijkstra hazard diversion via the North Ridgeline Bypass (+1.1 km).
6. **Deterministic Replay**:
   - Click **"Reset Demo"** in the header at any time to restore the pristine baseline scenario for judges.

---

## API Contract Reference (Backend Server — Port 5000)

### 1. Unified Dashboard & Health
- `GET /api/health`: Health status, uptime, storage mode, and simulated marker.
- `GET /api/dashboard`: Aggregated metrics (open incidents, active tracks, pending reviews, evacuees, active hazards) computed dynamically from stored records.
- `GET /api/events`: Server-Sent Events (SSE) live push stream (with REST polling fallback).

### 2. FieldLink (Incidents & Offline Sync)
- `GET /api/incidents`: Filter by `sourceModule`, `type`, `priority`, `status`, or `search`.
- `GET /api/incidents/:id`: Fetch single incident.
- `POST /api/incidents`: Create incident with validation.
- `PATCH /api/incidents/:id`: Update status or priority.
- `POST /api/sync`: Batch sync endpoint for offline clients with idempotent deduplication and per-item reconciliation.

### 3. SkyWatch (Airspace Monitoring & Anomaly Alerts)
- `GET /api/telemetry`: Retrieve active drone tracks (position, altitude, heading, speed, simulation marker).
- `POST /api/telemetry/tick`: Step simulation forward and evaluate explainable anomaly rules.
- `GET /api/alerts`: List alerts (filter by `acknowledged`, `severity`, `trackId`).
- `PATCH /api/alerts/:id`: Acknowledge an alert (`{ acknowledged: true }`).

### 4. GeoIntel (Geospatial Analysis)
- `GET /api/geointel/observations`: List candidate change observations with normalized bounding boxes.
- `POST /api/geointel/observations`: Register new candidate observation from comparison pipeline.
- `PATCH /api/geointel/observations/:id`: Analyst review action.

### 5. MediRoute (Triage & Evacuation Routing)
- `GET /api/patients`: List casualty records (filter by `workflowStatus`, `triageCategory`).
- `POST /api/patients`: Casualty intake with transparent START triage reason.
- `PATCH /api/patients/:id`: Update workflow status (`assessed`, `assigned`, `evacuated`).
- `GET /api/hazards`: List road network hazards and blocked status.
- `POST /api/hazards`: Report/toggle road blockage on graph edges.
- `POST /api/routes/calculate`: Dijkstra shortest-path calculation rerouting around blocked roads.
- `GET /api/routes/graph`: Retrieve road nodes and edges for map rendering.

### 6. Demo Replayability
- `POST /api/demo/reset`: Deterministically restores clean baseline scenario for judges.
- `POST /api/demo/seed`: Initializes connected cross-module demo story.
