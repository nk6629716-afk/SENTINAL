# SENTINEL — Theme-Based Backend Audit & Target Architecture Plan

**Document Type:** Technical Architecture Audit & Engineering Plan  
**Repository:** `https://github.com/nk6629716-afk/fallingsun`  
**Date of Audit:** October 26, 2026  
**Auditor Role:** Senior Backend Architect & Systems Auditor  
**Audit Scope:** Repository-wide audit of backend architecture, API services, database/persistence layer, offline synchronization, module contracts, simulation boundaries, and security controls against the original SENTINEL project theme.

---

## 1. Executive Summary & Overall Scope

The **SENTINEL** platform is conceived as an **Integrated Situational Awareness & Emergency Response Platform** modeling a military-grade, multi-domain Common Operational Picture (COP) / C4ISR command console. The project comprises five distinct operational domains:
1. **Command Dashboard / COP:** Unified real-time operational picture, KPI summaries, and system health.
2. **FieldLink (Problem Statement 1):** Offline-first tactical incident reporting and decentralized mesh communications.
3. **SkyWatch (Problem Statement 2):** Airspace security, counter-UAV tracking, and rule-based kinematic anomaly detection.
4. **GeoIntel (Problem Statement 3):** Geospatial intelligence, multi-temporal satellite imagery comparison, and candidate change detection.
5. **MediRoute (Problem Statement 4):** Emergency medical triage (algorithmic START protocol) and hazard-aware evacuation routing.

### Key Audit Findings

1. **Working Software vs. Production Backend:**
   SENTINEL has achieved an impressive, highly cohesive, and deterministic **hackathon-grade demonstration system**. Core business logic, mathematical algorithms (Dijkstra routing, START triage, satellite pixel matrix differencing, UAV kinematics), and client-side offline storage (IndexedDB) are fully operational and verified by extensive automated test suites.
2. **The "Database" Reality:**
   Despite the presence of `server/src/db/supabaseClient.ts`, `server/src/db/schema.sql`, `supabase_schema.sql`, and `@supabase/supabase-js`, **Supabase / PostgreSQL is NOT used for application data persistence**. The server explicitly reports `"supabasePersistenceActive": false` at `/api/health`. All server-side CRUD operations and state persistence read from and write to a single local JSON file (`server/data/sentinel_store.json`) or in-memory dictionary.
3. **Offline Sync Scope Limitations:**
   The batch reconciliation endpoint (`POST /api/sync`) only reconciles `IncidentReport` items. While the frontend IndexedDB schema defines stores for 8 entity types (`incidents`, `alerts`, `geointel`, `casualties`, `hazards`, `markers`, `mesh_messages`, `sync_logs`), the server does not have an atomic multi-entity batch sync contract. GeoIntel observations synchronize via an ad-hoc REST loop, while casualty triage, hazard toggles, tactical map markers, and mesh messages lack offline outbox synchronization.
4. **Device-to-Device Mesh Communications:**
   FieldLink's multi-tab communications rely entirely on the browser's DOM `BroadcastChannel` API (`sentinel_mesh_bus`). There is **zero backend participation, zero cross-device networking, and zero radio/mesh transport**. The system operates across separate browser tabs on the same origin on a single machine, but cannot communicate between separate physical devices without network connectivity.
5. **Build and Test Integrity Issues Discovered:**
   - **`npm run build:server` FAILS:** Running `tsc` in `server/` fails with `TS2322: Type '"failed_sync"' is not assignable to type 'IncidentStatus'` in `server/tests/persistence.test.ts:110`.
   - **Root `npm test` hangs on Windows:** `tests/fieldlink-messaging.test.ts:93` uses `if (import.meta.url === file://${process.argv[1]})`, which fails on Windows due to forward vs. backward slash and URL-encoding mismatches. Because the test function is not called and `meshService` instantiates a global `BroadcastChannel` with an active event listener, Node's event loop hangs indefinitely.
6. **Security & Governance Gaps:**
   The backend API currently features **zero authentication**, **zero authorization/RBAC**, **no rate limiting**, **wildcard CORS with credentials**, and **no CSRF or HTTP security headers**. Destructive control endpoints (such as `POST /api/demo/reset`) are publicly exposed without access controls.

---

## 2. Original Theme & Intended Requirements

### 2.1 Authoritative Requirement Sources
The project theme and technical specifications were recovered directly from:
- [README.md](file:///c:/Flling%20Sun/fallingsun/README.md)
- [SENTINEL.md](file:///c:/Flling%20Sun/fallingsun/SENTINEL.md)
- [PERSON_2_BACKEND_EXECUTION_PLAN.md](file:///c:/Flling%20Sun/fallingsun/PERSON_2_BACKEND_EXECUTION_PLAN.md)
- [shared/contracts.ts](file:///c:/Flling%20Sun/fallingsun/shared/contracts.ts) & [shared/types.ts](file:///c:/Flling%20Sun/fallingsun/shared/types.ts)

### 2.2 Core Mandates & Intent
- **Hackathon Demo Context:** The system is explicitly designed for the *Falling Sun 2026* operational trial and judging presentation.
- **Honest Simulation Transparency:** A foundational theme mandate is that all telemetry, drone tracks, patient vitals, satellite imagery differences, and disaster hazards are synthetic. All data structures MUST carry `isSimulated: true`.
- **Offline Air-Gap Reliability:** The application must function when completely severed from the network, providing local triage, routing, and reporting, with automated reconciliation when the network is restored.
- **Deterministic Replayability:** A judge or commander must be able to trigger a clean reset (`/api/demo/reset`) to demonstrate identical scenarios repeatedly without database pollution or state drift.

---

## 3. Actual Repository and Git State

The repository audit was conducted on the active working copy without modifying any tracked files:

| Attribute | Audited State |
| :--- | :--- |
| **Branch** | `main` |
| **Tracking Remote** | `origin/main` (`https://github.com/nk6629716-afk/fallingsun`) |
| **HEAD Commit** | `82ad5cd40940a571980a5f8105593dccfbe3edfc` (`82ad5cd`) |
| **Latest Commit Message** | `fix: prevent duplicate fixtures and improve mesh message handling and persistence` |
| **Working Tree Status** | `M REPORT.md` (uncommitted automated dossier timestamp update from existing repository hook; preserved intact) |
| **Node.js Environment** | Node.js v20+ / Windows 10/11 x64 (PowerShell environment) |
| **Runtime Storage State** | `data/sentinel_store.json` (19.9 KB), plus temporary lock files |

---

## 4. Module-by-Module Audit Against Theme

### A. FieldLink — Tactical Reporting & Offline Communication

| Dimension | Actual Code Implementation | Audit Status |
| :--- | :--- | :--- |
| **Incident Creation & Validation** | Handled via `POST /api/incidents` and `POST /api/sync`. Strict validation in [validators.ts:86-160](file:///c:/Flling%20Sun/fallingsun/server/src/validation/validators.ts#L86-L160) validates `title` (1-200 chars), `priority` (`low`, `medium`, `high`, `critical`), `sourceModule`, `type` (13 allowed enums), and `location` (lat -90..90, lng -180..180). | **Implemented & Verified** |
| **IndexedDB Outbox & Persistence** | [indexedDb.ts:45-78](file:///c:/Flling%20Sun/fallingsun/src/services/storage/indexedDb.ts#L45-L78) configures `SENTINEL_TACTICAL_DB` v2 with `incidents` store containing `syncStatus` and `createdAt` indices. Offline creations are marked `pending_sync` and survive reloads. | **Implemented & Verified** |
| **Idempotency & Deduplication** | `SyncService.processBatch()` in [syncService.ts:48-81](file:///c:/Flling%20Sun/fallingsun/server/src/services/syncService.ts#L48-L81) maintains `syncRegistry` keyed by client-generated `clientId`. Duplicate submissions return outcome `already_received` with existing `serverId`. | **Implemented & Verified** |
| **Multi-Entity Synchronization** | `POST /api/sync` strictly processes `Incident` items. Observations, patients, hazards, markers, and mesh messages cannot be submitted in a unified batch. | **Partially Implemented** |
| **Offline Device-to-Device Mesh** | Implemented exclusively via `BroadcastChannel('sentinel_mesh_bus')` in [meshService.ts:72-92](file:///c:/Flling%20Sun/fallingsun/src/services/mesh/meshService.ts#L72-L92). Only relays between open browser tabs on the same machine. No RF, Bluetooth, WebRTC, or backend relay exists. | **Simulated / Demo-Only** |

### B. SkyWatch — Airspace Monitoring & Threat Alerting

| Dimension | Actual Code Implementation | Audit Status |
| :--- | :--- | :--- |
| **Telemetry Ingestion & Simulation** | Synthetic telemetry managed by [simulationEngine.ts](file:///c:/Flling%20Sun/fallingsun/src/simulation/simulationEngine.ts) (client) and [telemetryService.ts](file:///c:/Flling%20Sun/fallingsun/server/src/services/telemetryService.ts) (server). Generates 3 baseline tracks: `TRK-001` (patrol), `TRK-002` (incursion), `TRK-003` (transit). Every record carries `isSimulated: true`. | **Implemented & Verified** |
| **Anomaly Detection Logic** | Server implements transparent, explainable kinematic rules: (1) `SUDDEN_ACCELERATION` (delta > 40 kts), (2) `ALTITUDE_CORRIDOR_BREACH` (<300m or >1200m), (3) `ZONE_INCURSION` (Haversine distance < zone radius). | **Implemented & Verified** |
| **Alert Lifecycle & Persistence** | Alerts are persisted in `sentinel_store.json`. Acknowledgment via `PATCH /api/alerts/:id` sets `acknowledged: true` and logs officer callsign. | **Implemented & Verified** |
| **Real-time Event Delivery** | Delivered via SSE (`GET /api/events`) managed by [sseHandler.ts](file:///c:/Flling%20Sun/fallingsun/server/src/realtime/sseHandler.ts). Includes a 15-second heartbeat ping. | **Implemented & Verified** |
| **Sensors & Real Drone Hardware** | No physical radar, ADS-B receiver, or SDR integration exists. Entirely simulated. | **Simulated / Demo-Only** |
| **Event Replay / Missed Event Resume** | SSE does not track event IDs or support `Last-Event-ID` resume. If a client disconnects, missed events are lost from the stream and must be reconciled via REST polling. | **Partially Implemented** |

### C. GeoIntel — Geospatial Reconnaissance & Imagery Differencing

| Dimension | Actual Code Implementation | Audit Status |
| :--- | :--- | :--- |
| **Image Differencing Pipeline** | [imageDiff.ts](file:///c:/Flling%20Sun/fallingsun/src/algorithms/geointel/imageDiff.ts) executes pure 2D matrix differencing: grayscale conversion, delta computation, thresholding, and 8-connected component clustering. Runs **entirely in the browser canvas**, not on the server. | **Implemented & Verified (Client-Side)** |
| **Server/Client Processing Boundary** | The server has **no image upload or image processing endpoints**. The server only receives JSON metadata candidate records via `POST /api/geointel/observations`. | **Partially Implemented** |
| **Review State Persistence** | Analyst actions (`confirm_candidate` / `dismiss_false_positive`) are persisted on the server via `PATCH /api/geointel/observations/:id` and broadcast via SSE. | **Implemented & Verified** |
| **External Geospatial / Satellite Feeds** | No Sentinel-2, Landsat, or GIS tile server integration exists. Uses two bundled local raster images (`terrain-default.png`, `terrain-blue.png`) and procedural SVG canvas terrain. | **Simulated / Demo-Only** |

### D. MediRoute — Triage Classification & Evacuation Logistics

| Dimension | Actual Code Implementation | Audit Status |
| :--- | :--- | :--- |
| **Algorithmic START Triage** | Dual implementation in [MediRouteModule.tsx:43-94](file:///c:/Flling%20Sun/fallingsun/src/modules/mediroute/MediRouteModule.tsx#L43-L94) and [mediRouteService.ts:300-334](file:///c:/Flling%20Sun/fallingsun/server/src/services/mediRouteService.ts#L300-L334). Implements 6 rules (walking, apnea, respiratory distress, perfusion, mental status, systemic trauma) with transparent rationale. | **Implemented & Verified** |
| **Hazard-Aware Dijkstra Routing** | Implemented on server in [mediRouteService.ts:109-240](file:///c:/Flling%20Sun/fallingsun/server/src/services/mediRouteService.ts#L109-L240). Dynamically routes around blocked edges (e.g., Highway 9 bridge collapse diverts to North Ridgeline Bypass, adding 1.1 km). | **Implemented & Verified** |
| **Disconnected Network Handling** | Returns `{ routeFound: false, totalDistanceKm: 0, estimatedTimeMinutes: 0, pathNodeIds: [] }` with clear explanation when no valid path exists. | **Implemented & Verified** |
| **Patient & Hazard Persistence** | CRUD endpoints (`/api/patients`, `/api/hazards`) persist state in `sentinel_store.json`. | **Implemented & Verified** |
| **Real CAD / Hospital Dispatch Systems** | No integration with actual 911/CAD, ambulance telemetry, or hospital EHR systems exists. | **Simulated / Demo-Only** |

### E. Shared Backend Infrastructure

| Dimension | Actual Code Implementation | Audit Status |
| :--- | :--- | :--- |
| **API Endpoints Inventory** | 31 REST and SSE endpoints implemented across 9 modular routers. Clean separation of concerns. | **Implemented & Verified** |
| **Database Persistence (Supabase)** | Supabase credentials can be loaded, and `getSupabaseClient()` initializes a client, but **zero SQL queries or Supabase table operations exist in the codebase**. | **Simulated / Config-Only** |
| **Local File Persistence** | [database.ts:142-164](file:///c:/Flling%20Sun/fallingsun/server/src/db/database.ts#L142-L164) implements atomic JSON persistence using temporary write and atomic rename (`fs.renameSync` with fallback copy). Survives process restarts. | **Implemented & Verified** |
| **Authentication & Authorization** | None. Zero JWT, API key, session, or role validation. All mutating and administrative endpoints (`/api/demo/reset`) are open to the public. | **Missing** |
| **Rate Limiting & Security Headers** | No `express-rate-limit`, no `helmet`. Wildcard CORS (`*`) with credentials enabled. Payload limit set to 1MB. | **Missing** |

---

## 5. Backend, API & Database Inventory

### 5.1 Route & Endpoint Inventory

```
Base URL: http://localhost:5000/api
```

| Router | Method | Path | Auth | Purpose | Storage Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` | None | Service status, uptime, storage mode, Supabase state | In-memory |
| **Dashboard** | `GET` | `/dashboard` | None | Aggregated counts & KPIs across all modules | Computed from JSON store |
| **Realtime** | `GET` | `/events` | None | Server-Sent Events (SSE) live push stream | In-memory client set |
| **Incidents** | `GET` | `/incidents` | None | List/filter incident reports | `sentinel_store.json` |
| | `GET` | `/incidents/:id` | None | Retrieve single incident by ID | `sentinel_store.json` |
| | `POST` | `/incidents` | None | Create incident with validation | `sentinel_store.json` |
| | `PATCH` | `/incidents/:id` | None | Update incident status or priority | `sentinel_store.json` |
| **Sync** | `POST` | `/sync` | None | Idempotent batch outbox synchronization | `sentinel_store.json` |
| **Telemetry** | `GET` | `/telemetry` | None | Active UAV kinematic tracks | In-memory / JSON store |
| | `GET` | `/telemetry/status`| None | Simulation running state & tick stats | In-memory |
| | `POST` | `/telemetry/tick` | None | Step simulation & evaluate anomaly rules | In-memory / JSON store |
| | `POST` | `/telemetry/pause`| None | Pause server simulation loop | In-memory |
| | `POST` | `/telemetry/resume`| None | Resume server simulation loop | In-memory |
| | `GET` | `/telemetry/:id` | None | Retrieve single track by ID | `sentinel_store.json` |
| **Alerts** | `GET` | `/alerts` | None | List airspace intrusion alerts | `sentinel_store.json` |
| | `GET` | `/alerts/:id` | None | Retrieve alert details | `sentinel_store.json` |
| | `PATCH` | `/alerts/:id` | None | Acknowledge threat alert | `sentinel_store.json` |
| **GeoIntel** | `GET` | `/geointel/observations` | None | List satellite change observations | `sentinel_store.json` |
| | `GET` | `/geointel/observations/:id` | None | Get observation candidate regions | `sentinel_store.json` |
| | `POST` | `/geointel/observations` | None | Register new change detection candidate | `sentinel_store.json` |
| | `PATCH` | `/geointel/observations/:id` | None | Analyst review confirmation/rejection | `sentinel_store.json` |
| **MediRoute** | `GET` | `/patients` | None | List casualty intake records | `sentinel_store.json` |
| | `GET` | `/patients/:id` | None | Get casualty triage & vitals details | `sentinel_store.json` |
| | `POST` | `/patients` | None | Intake casualty with automated START triage | `sentinel_store.json` |
| | `PATCH` | `/patients/:id` | None | Update patient triage or workflow status | `sentinel_store.json` |
| | `GET` | `/hazards` | None | List road hazards & blocked statuses | `sentinel_store.json` |
| | `POST` | `/hazards` | None | Report/toggle road blockage on graph | `sentinel_store.json` |
| | `POST` | `/routes/calculate` | None | Execute Dijkstra hazard-aware routing | Computed (Road Graph) |
| | `GET` | `/routes/graph` | None | Retrieve road nodes & edges for map | Road Graph fixtures |
| **Demo** | `POST` | `/demo/reset` | None | Non-destructive reset to baseline fixtures | `sentinel_store.json` |
| | `POST` | `/demo/seed` | None | Initialize cross-module scenario | `sentinel_store.json` |

### 5.2 Persistence Layer Analysis

```
                              ┌───────────────────────────────────┐
                              │     Express API Application       │
                              │           (Port 5000)             │
                              └─────────────────┬─────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
      ┌─────────────────────────────┐                       ┌─────────────────────────────┐
      │   Database Class Instance   │                       │   Supabase Client Module    │
      │    (server/src/db/database) │                       │  (server/src/db/supabase)   │
      └──────────────┬──────────────┘                       └──────────────┬──────────────┘
                     │                                                     │
                     ▼                                                     ▼
      ┌─────────────────────────────┐                       ┌─────────────────────────────┐
      │   Atomic File Persistence   │                       │      CLIENT INITIALIZED     │
      │  data/sentinel_store.json   │                       │      NO CRUD OPERATIONS     │
      │  - Temp write + Rename      │                       │  supabasePersistenceActive: │
      │  - Survives Server Restarts │                       │            false            │
      └─────────────────────────────┘                       └─────────────────────────────┘
```

1. **Active Engine:** `Database` class in [database.ts](file:///c:/Flling%20Sun/fallingsun/server/src/db/database.ts). Uses in-memory state serialized to disk as `sentinel_store.json`.
2. **Schema Definition:** `supabase_schema.sql` and `server/src/db/schema.sql` define comprehensive SQL tables (`incidents`, `airspace_tracks`, `airspace_alerts`, `geointel_observations`, `patients`, `road_hazards`, `sync_registry`). However, **these tables are never migrated or queried**.
3. **Reset Behavior:** `resetToBaseline(preservePending = true)` cleanly resets baseline demonstration records while preserving pending offline incidents (`inc.syncStatus === 'pending' || inc.syncStatus === 'failed'`).

---

## 6. Theme-Compliance Matrix

| Requirement / Capability | Current Implementation | Evidence & File Location | Status | Identified Architectural Gap | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Durable Data Persistence** | Local JSON store with atomic file renaming | [database.ts:142-164](file:///c:/Flling%20Sun/fallingsun/server/src/db/database.ts#L142-L164) | **Partially Implemented** | Supabase/PostgreSQL is configured but not connected to CRUD pipeline; file store does not support horizontal scaling. | **P1** |
| **Server Build & Compilation** | TypeScript compilation via `tsc` in `server/` | [package.json:10](file:///c:/Flling%20Sun/fallingsun/server/package.json#L10) | **Failing / Broken** | `tests/persistence.test.ts:110` assigns invalid `'failed_sync'` to `IncidentStatus`, breaking `npm run build:server`. | **P0** |
| **Offline Incident Sync** | Batch reconciliation with idempotency key | [syncService.ts:12-151](file:///c:/Flling%20Sun/fallingsun/server/src/services/syncService.ts#L12-L151) | **Implemented & Verified** | Only supports incidents; no multi-entity batch contract for casualties, hazards, or observations. | **P1** |
| **Offline Multi-Tab Communication** | DOM `BroadcastChannel` (`sentinel_mesh_bus`) | [meshService.ts:72-92](file:///c:/Flling%20Sun/fallingsun/src/services/mesh/meshService.ts#L72-L92) | **Simulated / Demo-Only** | Restricted to same-origin browser tabs on one machine; zero physical mesh transport or backend relay. | **P2** |
| **Airspace Telemetry & Anomalies** | Deterministic simulation + 3 explainable rules | [telemetryService.ts:80-170](file:///c:/Flling%20Sun/fallingsun/server/src/services/telemetryService.ts#L80-L170) | **Implemented & Verified** | Telemetry is synthetic; no external radar/SDR hardware ingestion interface. | **P3** |
| **Realtime Event Streaming** | Express SSE endpoint (`/api/events`) | [sseHandler.ts:28-49](file:///c:/Flling%20Sun/fallingsun/server/src/realtime/sseHandler.ts#L28-L49) | **Implemented & Verified** | No event persistence or `Last-Event-ID` replay; disconnected clients lose events during drops. | **P2** |
| **GeoIntel Image Differencing** | Grayscale delta + component clustering | [imageDiff.ts:40-120](file:///c:/Flling%20Sun/fallingsun/src/algorithms/geointel/imageDiff.ts#L40-L120) | **Implemented & Verified** | Runs 100% in browser canvas; server has no image intake, storage, or processing endpoints. | **P2** |
| **START Triage Classification** | 6-rule clinical decision tree with rationale | [mediRouteService.ts:300-334](file:///c:/Flling%20Sun/fallingsun/server/src/services/mediRouteService.ts#L300-L334) | **Implemented & Verified** | Illustrative workflow; properly disclaimed as non-clinical synthetic demonstration. | **P3** |
| **Hazard-Aware Dijkstra Routing** | Weighted shortest-path avoiding blocked edges | [mediRouteService.ts:109-240](file:///c:/Flling%20Sun/fallingsun/server/src/services/mediRouteService.ts#L109-L240) | **Implemented & Verified** | Road graph is a static 6-node fixture; no GIS/GeoJSON open road network integration. | **P3** |
| **API Security & Access Control** | Public endpoints, wildcard CORS, 1MB limit | [app.ts:23-29](file:///c:/Flling%20Sun/fallingsun/server/src/app.ts#L23-L29) | **Missing** | Zero authentication, no rate-limiting, and open demo reset endpoint create security vulnerabilities. | **P1** |
| **Automated Test Suite Portability** | Node test runner + tsx test suites | [tests/fieldlink-messaging.test.ts:93](file:///c:/Flling%20Sun/fallingsun/tests/fieldlink-messaging.test.ts#L93) | **Failing on Windows** | Path separator mismatch hangs test runner indefinitely on Windows environments. | **P0** |

*Priority Key:*  
- **P0:** Fundamental correctness, build failure, or test hang blocker.  
- **P1:** Essential for core data persistence, multi-entity sync, and security.  
- **P2:** Important operational reliability and backend capability extension.  
- **P3:** Polish, external protocol integration, or long-term operational enhancement.

---

## 7. Security and Reliability Findings

### 7.1 Security Deficiencies
1. **Unauthenticated Mutating & Administrative Endpoints:**
   Any client on the network can trigger `POST /api/demo/reset` or `POST /api/demo/seed`, instantly wiping all non-pending records and altering application state.
2. **Insecure CORS Configuration:**
   [app.ts:23-28](file:///c:/Flling%20Sun/fallingsun/server/src/app.ts#L23-L28) configures `cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true })`. Reflecting wildcard origins while allowing credentials is an anti-pattern that exposes APIs to cross-site request forgery in multi-tenant environments.
3. **Absence of Rate Limiting & DoS Protection:**
   The server lacks request throttling. An attacker or malfunctioning client in a tight retry loop can flood `POST /api/routes/calculate` or `POST /api/sync`, exhausting CPU and disk I/O.
4. **Missing HTTP Security Headers:**
   The server does not include `helmet` or standard security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`).

### 7.2 Reliability & Concurrency Risks
1. **Single-File JSON Write Contention:**
   `Database.persist()` writes the entire database state to disk on every mutation. Under concurrent requests from multiple field units, concurrent calls to `fs.renameSync()` can encounter file lock collisions on Windows (mitigated only by a catch-and-copy block).
2. **Memory Footprint Scaling:**
   Because all records are held in memory (`this.state`), the server's memory usage grows linearly with every incident, alert, observation, and sync registry entry. There is no pagination at the database level.
3. **SSE Connection Leaks on Network Severing:**
   `sseHandler.ts` detects disconnection only via `req.on('close')`. If a network interface abruptly drops without TCP FIN/RST packets, the server can retain dead client response objects until the next heartbeat write fails.

---

## 8. Target Backend Architecture

To evolve SENTINEL from a hackathon prototype into a resilient operational backend while preserving all existing verified contracts, the target architecture establishes a clean tiered design:

```
                           ┌──────────────────────────────────────────────┐
                           │      Client Layer (Browser / PWA)            │
                           │   React 18 + IndexedDB (SENTINEL_TACTICAL_DB) │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │            API Gateway & Security            │
                           │  - Helmet (CSP, HSTS)                        │
                           │  - Rate Limiter (express-rate-limit)         │
                           │  - Auth Middleware (JWT / Call-sign token)   │
                           │  - CORS Policy (Strict allowed origins)      │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │              Router Layer                    │
                           │  /health, /dashboard, /incidents, /sync,     │
                           │  /telemetry, /alerts, /geointel, /mediroute  │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │             Service & Domain Logic           │
                           │  - Multi-Entity Sync Reconciler              │
                           │  - Kinematic Drone Anomaly Engine            │
                           │  - Dijkstra Hazard Route Calculator          │
                           │  - START Triage Classifier                   │
                           └──────────────┬────────────────┬──────────────┘
                                          │                │
                     ┌────────────────────┘                └────────────────────┐
                     ▼                                                          ▼
      ┌─────────────────────────────┐                            ┌─────────────────────────────┐
      │     Realtime Bus (SSE)      │                            │  Durable Repository Pattern │
      │  - Event Replay Buffer      │                            │     (Storage Abstraction)   │
      │  - Last-Event-ID Handling   │                            └──────────────┬──────────────┘
      │  - Heartbeat & Auto-Prune   │                                           │
      └─────────────────────────────┘                     ┌─────────────────────┴─────────────────────┐
                                                          ▼                                           ▼
                                           ┌─────────────────────────────┐             ┌─────────────────────────────┐
                                           │    PostgreSQL / Supabase    │             │      Local JSON Store       │
                                           │       (Production Mode)     │             │     (Offline/Airgap Mode)   │
                                           │   Row-level security, ACID  │             │  Atomic temp write + rename │
                                           └─────────────────────────────┘             └─────────────────────────────┘
```

### 8.1 Tier 1: Minimum Changes for Demonstrable Prototype Integrity (Hackathon Scope)
1. **Fix `server/tests/persistence.test.ts:110`:** Replace `status: 'failed_sync'` with `status: 'pending_sync'` so `npm run build:server` compiles cleanly.
2. **Fix `tests/fieldlink-messaging.test.ts:93`:** Use path-normalized matching (`path.resolve(process.argv[1])`) and ensure explicit `process.exit(0)` on completion to eliminate test suite hangs on Windows.
3. **Multi-Entity Sync Protocol:** Update `POST /api/sync` to accept polymorphic batch payloads containing `incidents`, `observations`, and `casualties`.
4. **Resilient Local File Storage:** Maintain `sentinel_store.json` as the default air-gap persistence engine with verified atomicity.

### 8.2 Tier 2: Additional Changes for Production-Grade Service
1. **Real PostgreSQL / Supabase Integration:** Implement repository interfaces connecting the domain services to actual PostgreSQL tables defined in `schema.sql`.
2. **Durable SSE Resume:** Store real-time events in a circular buffer with incremental event IDs so reconnected clients can request `Last-Event-ID` backfills.
3. **Role-Based Tactical Authentication:** Introduce military duty role tokens (Watch Officer, Field Medic, Recon Analyst, System Admin) via signed JWTs.
4. **Physical Mesh Transport Gateway:** Provide a WebSocket or WebRTC data channel bridge connecting field nodes running on distinct physical devices.

---

## 9. Prioritized Implementation Roadmap

### Phase 1: Build & Test Suite Hardening (Blocker Remediation)
- **Task 1.1: Fix Server TypeScript Type Error in Persistence Test**
  - *Problem:* `tests/persistence.test.ts:110` uses `'failed_sync'` which violates `IncidentStatus` enum, causing `npm run build:server` to fail.
  - *Files:* `server/tests/persistence.test.ts`
  - *Complexity:* Low.
- **Task 1.2: Fix Windows Path Matching in FieldLink Messaging Test**
  - *Problem:* `import.meta.url === file://${process.argv[1]}` fails on Windows path separators, causing the test runner to hang on BroadcastChannel listeners.
  - *Files:* `tests/fieldlink-messaging.test.ts`
  - *Complexity:* Low.

### Phase 2: Offline-First Synchronization Completeness
- **Task 2.1: Polymorphic Multi-Entity Batch Synchronization**
  - *Problem:* `POST /api/sync` only processes incidents; offline casualties, hazards, and observations cannot be synced atomically.
  - *Files:* `server/src/routes/syncRoutes.ts`, `server/src/services/syncService.ts`, `shared/types.ts`
  - *Complexity:* Medium.
- **Task 2.2: Outbox Conflict & Version Resolution**
  - *Problem:* Conflicts are resolved strictly via First-Accepted; no versioning metadata exists for concurrent record edits.
  - *Files:* `server/src/db/database.ts`, `server/src/services/syncService.ts`
  - *Complexity:* Medium.

### Phase 3: Real Database Layer Integration (PostgreSQL / Supabase)
- **Task 3.1: Repository Pattern Storage Abstraction**
  - *Problem:* `database.ts` hardcodes JSON file access; switching between local file and Supabase requires rewriting service calls.
  - *Files:* `server/src/db/repository.ts`, `server/src/db/postgresRepository.ts`, `server/src/db/fileRepository.ts`
  - *Complexity:* High.
- **Task 3.2: Database Migration Runner & Seed Integration**
  - *Problem:* `schema.sql` exists but cannot be executed automatically against a fresh PostgreSQL instance.
  - *Files:* `server/src/db/migrate.ts`, `server/package.json`
  - *Complexity:* Medium.

### Phase 4: API Security, Governance & Observability
- **Task 4.1: Access Control & Role Guards**
  - *Problem:* Administrative endpoints like `/api/demo/reset` are unauthenticated.
  - *Files:* `server/src/middleware/auth.ts`, `server/src/routes/demoRoutes.ts`
  - *Complexity:* Medium.
- **Task 4.2: Rate Limiting & HTTP Security Hardening**
  - *Problem:* Server is vulnerable to request floods and lacks security headers.
  - *Files:* `server/src/app.ts`
  - *Dependencies:* `helmet`, `express-rate-limit`
  - *Complexity:* Low.

---

## 10. Tests and Commands Executed (Audit Verification Ledger)

All verification checks were executed non-destructively:

| Command Executed | Result / Exit Code | Findings & Exact Output Summary |
| :--- | :---: | :--- |
| `git status --short --branch` | `0` (Clean + `M REPORT.md`) | Branch is `main`, tracking `origin/main`. Working tree clean except for pre-existing `REPORT.md` timestamp update. |
| `git log -n 5 --oneline` | `0` | Latest commit is `82ad5cd fix: prevent duplicate fixtures and improve mesh message handling and persistence`. |
| `npm test` (root contracts) | `0` (122/122 passed) | [src/tests/frontend-contracts.test.js](file:///c:/Flling%20Sun/fallingsun/src/tests/frontend-contracts.test.js) executed 122 contract tests across 13 test groups; 100% passed. |
| `tests/simulation.test.ts` | `0` (passed) | 60-tick deterministic simulation test executed; Engine 1 & Engine 2 outputs 100% identical. |
| `tests/fieldlink-messaging.test.ts` | **Hangs on Windows** | Direct execution stalls due to `import.meta.url === file://${process.argv[1]}` path evaluation failure on Windows. |
| `npm run test --prefix server` | `0` (27/27 passed) | All 27 server integration and persistence tests passed via Node test runner (`tsx --test tests/*.test.ts`). |
| `python tests/run_verification.py` | `0` (23/23 passed) | All 23 algorithmic engine verification checks passed (START triage, Dijkstra bypass, pixel diff, UAV rules). |
| `npm run test:algorithms` | `0` (29/29 passed) | All 29 pure algorithm and simulation tests passed. |
| `npm run test:demo` | `0` (Runs 1 & 2 passed) | Multi-run demonstration workflow executed twice with zero drift, zero stale records, and verified idempotency. |
| `npm run build:frontend` | `0` (Built in 25.7s) | Production bundle built successfully (`dist/assets/index-C-PGZ-Cl.js`, 400.26 kB). |
| `npm run build:server` | **Code 1 (Failed)** | Failed with `TS2322: Type '"failed_sync"' is not assignable to type 'IncidentStatus'` in `server/tests/persistence.test.ts:110`. |

---

## 11. Limitations, Unknowns and Assumptions

1. **Supabase Environment Credentials:**
   The repository `.env.example` lists placeholder names, while `server/src/config.ts` has a default Supabase project URL (`https://cajrbzfsfsimxweomrlt.supabase.co`). However, no service role key is active in the environment, so live Supabase cloud connectivity was not evaluated against a remote cluster.
2. **Multi-User Realtime Concurrency:**
   SSE was tested with up to two concurrent client connections in test scripts. Enterprise-scale concurrent client handling (>1,000 active SSE streams) requires an external pub/sub layer (such as Redis) not present in this single-node Express architecture.
3. **Client-Side Image Processing Memory Constraints:**
   Because satellite image differencing runs in the browser via Canvas `getImageData()`, very large satellite rasters (>50MB TIFFs or >8000x8000 px) would crash browser tab memory. Production satellite pipelines require tiled server-side raster engines (e.g., GDAL / rasterio).

---

## 12. Final Verdict: What Exists, What Is Simulated, What Is Missing & Next Steps

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SENTINEL SYSTEM VERDICT                                │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│           EXISTS              │           SIMULATED           │        MISSING         │
│     (Real & Verified)         │     (Honest Demo Model)       │   (Architectural Gap)  │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • 31 Express API Endpoints    │ • UAV Telemetry Kinematics    │ • PostgreSQL/Supabase  │
│ • Local JSON Atomic Store     │ • Drone Anomaly Detections    │   Active CRUD Storage  │
│ • Incident Idempotent Sync    │ • START Triage Decision Rules │ • Multi-Entity Batch   │
│ • Dijkstra Rerouting Engine   │ • Satellite Differencing Data │   Sync Contract        │
│ • Client-Side IndexedDB       │ • Multi-Tab Mesh (BroadcastCh)│ • Authentication /     │
│ • Neumorphic UI Design System │ • Casualty & Hazard Fixtures  │   Role Permissions     │
│ • 200+ Automated Tests Passed │ • Emergency Dispatch Feeds    │ • Clean Server Build   │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

### What Should Be Built Next (Immediate Action Items)
1. **Fix Server Compilation:** Correct the type error in [server/tests/persistence.test.ts:110](file:///c:/Flling%20Sun/fallingsun/server/tests/persistence.test.ts#L110) so `npm run build:server` succeeds cleanly.
2. **Fix Windows Test Runner Script:** Fix the direct execution check in [tests/fieldlink-messaging.test.ts:93](file:///c:/Flling%20Sun/fallingsun/tests/fieldlink-messaging.test.ts#L93) so root `npm test` runs to completion without hanging.
3. **Expand Batch Sync to All Entities:** Extend `POST /api/sync` so that offline casualty updates, GeoIntel reviews, and road hazard toggles synchronize through the same durable idempotency outbox as incidents.
4. **Implement Real Database CRUD:** Connect the existing `supabase_schema.sql` tables to an active PostgreSQL repository implementation, replacing `sentinel_store.json` when configured.
