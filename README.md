# SENTINEL --- Integrated Situational Awareness & Emergency Response Platform

> **Falling Sun 2026 Web & App Prototype**  
> **Simulation Notice:** All airspace tracks, reconnaissance image difference candidates, casualty records, triage logic, and road hazards are synthetic demo simulations for evaluation purposes.

---

## Overview

**SENTINEL** is an integrated tactical command and emergency response platform built for disaster relief, search and rescue, and situational monitoring. It brings together four distinct operational workflows into one cohesive, responsive Common Operational Picture (COP):

1. **FieldLink (Offline Tactical Reporting)**: Offline-first incident reporting backed by IndexedDB, queue manager, and batch reconciliation with idempotent deduplication.
2. **SkyWatch (Counter-Drone & Airspace Security)**: Deterministic synthetic UAV telemetry tracking, radar sweep visualization, and transparent rule-based anomaly detection (`NO_FLY_ZONE_INCURSION`, `RAPID_ACCELERATION_SPIKE`).
3. **GeoIntel (Geospatial Reconnaissance)**: Multi-temporal satellite imagery analysis, swipe/side-by-side comparison, candidate change detection with difference scores, analyst review drawer, and intelligence debrief export.
4. **MediRoute (Triage & Evacuation Logistics)**: Algorithmic START triage classification with visible clinical rationale, casualty evacuation queue, interactive road graph, and Dijkstra hazard-aware routing around blocked bridges and debris.

---

## Architecture & Team Division

- **Person 1 (Frontend & Experience)**: React 18, TypeScript, Vite, bespoke SVG/Canvas tactical map engine, IndexedDB offline store, command UI, and mock/live API coordinator.
- **Person 2 (Backend & Persistence)**: Node/Express API (`/api/*`), SQLite/PostgreSQL durable store, batch sync endpoint (`/api/sync`), and shared data models (`shared/types.ts`).
- **Person 3 (Algorithms & Simulation)**: Pure deterministic scenario generation, START triage decision trees, Dijkstra/A* routing, and change detection algorithms.

---

## Quickstart & Verification

### 1. Installation
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### 3. Run Automated Tests
```bash
npm test
```
Executes contract validation, START triage evaluation rules, hazard rerouting, and offline sync deduplication tests.

### 4. Production Build
```bash
npm run build
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