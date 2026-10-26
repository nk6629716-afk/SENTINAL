# SENTINEL — System Logic, Architecture & Operational Execution Guide

> **Target Audience**: AI Agents, Systems Engineers, and Tactical Software Operators.  
> **Purpose**: A definitive, end-to-end reference explaining every subsystem, execution pipeline, visual rendering logic, state management flow, offline-first mechanism, and inter-module contract in the SENTINEL platform.

---

## 1. System Philosophy & Architecture Overview

SENTINEL is an offline-first, mission-critical Common Operating Picture (COP) and tactical situational-awareness platform designed for austere, bandwidth-denied, or disconnected disaster-relief and defense operations.

### High-Level Topology

```
                  +-------------------------------------------------------+
                  |                  BROWSER / CLIENT                     |
                  |                                                       |
                  |  +-------------------------------------------------+  |
                  |  |          React 18 Single Page Application        |  |
                  |  |  (App.tsx -> CommandHeader, Sidebar, Modules)   |  |
                  |  +------------------------+------------------------+  |
                  |                           |                           |
                  |      +--------------------+--------------------+      |
                  |      |                    |                    |      |
                  |  +---+-----------+  +-----+----------+  +------+---+  |
                  |  |  SyncManager  |  | BroadcastMesh  |  | Service  |  |
                  |  |  (Outbox Sync)|  | Channel (Tabs) |  |  Worker  |  |
                  |  +-------+-------+  +----------------+  +-----+----+  |
                  |          |                                    |       |
                  |  +-------+------------------------------------+---+   |
                  |  |       IndexedDB (SENTINEL_TACTICAL_DB v3)      |   |
                  |  |  [incidents, outbox, geointel, casualties, ...] |   |
                  |  +------------------------+-----------------------+   |
                  +---------------------------|---------------------------+
                                              | HTTP / SSE / REST
                                              v
                  +-------------------------------------------------------+
                  |               BACKEND ENGINE (Node.js / Express)      |
                  |                                                       |
                  |  +-------------------------------------------------+  |
                  |  |   Express REST Endpoints (/api/*) & SSE Stream  |  |
                  |  +------------------------+------------------------+  |
                  |                           |                           |
                  |  +------------------------+------------------------+  |
                  |  | Services: Telemetry, GeoIntel, MediRoute, Sync  |  |
                  |  +------------------------+------------------------+  |
                  |                           |                           |
                  |  +------------------------+------------------------+  |
                  |  |  Storage: sentinel_store.json (Local File DB)   |  |
                  |  |  Optional: Supabase Remote PostgreSQL Engine    |  |
                  |  +-------------------------------------------------+  |
                  +-------------------------------------------------------+
```

### Key Technical Tenets
1. **Never Display Chrome Dinosaur**: The application shell (HTML, hashed CSS, hashed JS, icons, terrain rasters) is cached on first visit. Offline navigation returns the cached application shell with zero network exceptions.
2. **IndexedDB is Local Ground Truth**: User mutations are immediately written to local IndexedDB and reflected in UI state before any server round-trip.
3. **Idempotent Synchronization**: Every offline operation carries a client UUID and idempotency key. Network retries cannot produce duplicate server records.
4. **Resilient Startup**: A 1,000ms safety watchdog prevents startup hangs, while `Promise.allSettled` ensures individual API failures never prevent the UI from loading.
5. **No Data Loss on Reset**: The demo reset endpoint (`POST /api/demo/reset`) restores baseline simulation fixtures while explicitly preserving un-synced user reports and pending outbox queues.

---

## 2. Startup, Lifecycle & Offline Execution Pipeline

### A. Entry & Boot Sequence (`index.html` -> `src/main.tsx` -> `src/app/App.tsx`)
1. **HTML Shell (`index.html`)**: Defines the tactical viewport, dark `#0B101B` theme meta tags, PWA manifest link (`/manifest.json`), and SVG/PNG icon paths.
2. **PWA & Storage Boot (`src/main.tsx`)**:
   - Executes `navigator.storage.persist()` on supported browsers to protect IndexedDB and CacheStorage from automated browser eviction.
   - Registers `/sw.js` in production builds.
   - Mounts React DOM to `#root`.
3. **State Initialization (`src/app/App.tsx`)**:
   - Initializes core data stores with deterministic in-memory defaults (`DEFAULT_INITIAL_SUMMARY`, `INITIAL_INCIDENTS`, `INITIAL_TRACKS`, etc.) so the screen is immediately populated even before disk reads complete.
   - Mounts a **1,000ms Safety Watchdog** (`setTimeout`): guarantees `isLoading` flips to `false` within 1 second regardless of cold storage or slow networks.
   - Calls `dbService.seedDefaultFixturesIfEmpty()` to populate IndexedDB on a pristine browser.
   - Calls `refreshAllData()` using `Promise.allSettled` to query all endpoints simultaneously without blocking on partial failures.

### B. Service Worker Mechanics (`public/sw.js`)
- **Precache Phase (`install` event)**:
  - Cache name: `sentinel-shell-v2`.
  - Precaches `/`, `/index.html`, `/manifest.json`, tactical icons, terrain rasters, and the production-hashed bundles (`/assets/index-*.js`, `/assets/index-*.css`) injected by the Vite `pwaBundlePlugin`.
  - Executes `self.skipWaiting()` for immediate activation.
- **Activation Phase (`activate` event)**:
  - Sweeps CacheStorage, identifying and deleting legacy caches (e.g. `sentinel-shell-v1`).
  - Calls `self.clients.claim()` to immediately take control of open tabs.
- **Fetch Interception Strategy**:
  1. **Navigation Requests (`mode === 'navigate'`)**: Network-First strategy with fallback to `/index.html`. Supported deep links (`#fieldlink`, `#skywatch`, etc.) resolve seamlessly to the SPA shell offline.
  2. **Static Assets (`.js`, `.css`, `.png`, `.svg`)**: Cache-First strategy. Bundles load instantaneously from local disk.
  3. **Telemetry & API Endpoints (`/api/*` and `/events`)**: Strictly **Network-Only**. If the server is offline, the fetch handler catches the failure and returns a structured HTTP 503 JSON response (`{ error: 'offline', status: 'offline', message: 'Backend unreachable' }`) rather than an unhandled browser network rejection.

---

## 3. Screen Layout, Visual Architecture & UI Modules

The interface is structured into three primary structural layers:
- **`CommandHeader`** (Top Bar: 64px)
- **`Sidebar`** (Left Navigation: 240px desktop, collapsed icon rail on mobile)
- **`Module Content Area`** (Flex-1 Main Canvas)

### Module Navigation & Hash Routing
The application uses hash-based client routing (`parseModuleFromHash(window.location.hash)`):
- `#dashboard` $\to$ Unified Common Operating Picture (COP)
- `#fieldlink` $\to$ Tactical Messaging, Incident Reports & Outbox
- `#skywatch` $\to$ Airspace Radar, Kinematic Tracking & Threat Queue
- `#geointel` $\to$ Satellite / Drone Image-Diff Analysis & Analyst Review
- `#mediroute` $\to$ START Triage & Dijkstra Evacuation Routing

---

### Detailed Module Walkthroughs

#### 1. CommandHeader (`src/app/CommandHeader.tsx`)
- **System Status Badge**:
  - `LIVE SERVER`: Displayed in green when the backend health probe confirms reachability and live SSE streaming.
  - `OFFLINE (LOCAL DB)`: Displayed in high-visibility amber when the network is severed or backend is offline.
- **Tactical Time Engine (`updateISTClock`)**:
  - Displays formatted Indian Standard Time (`UTC + 5:30`) with live second ticks, mission elapsed time, and Julian date.
- **Simulation Control Panel**:
  - Play / Pause button: controls backend / local telemetry advancement.
  - Step Tick (`POST /api/telemetry/tick`): manually steps the simulation forward by 1 tick (1 second kinematic advance).
  - Speed Multiplier: toggles between `1x`, `2x`, and `5x` simulation acceleration.
- **Sync Trigger & Storage Badge**:
  - Shows current storage engine: `FILE` (`sentinel_store.json`), `MEMORY`, or `SUPABASE`.
  - Displays pending outbox counter. Clicking **Trigger Sync** executes `syncManager.triggerSync()`.

---

#### 2. Dashboard — Common Operating Picture (`src/dashboard/Dashboard.tsx`)
- **KPI Metrics Ribbon**:
  - Dynamic KPI cards computing live totals from IndexedDB / memory state:
    - Active Incidents (with High/Critical breakdown)
    - Active Airspace Tracks & Threat Posture
    - Unacknowledged Alerts (deduplicated by `trackId:ruleName`)
    - Pending GeoIntel Reviews
    - Critical Patients Awaiting Evac (Immediate / Red triage)
    - Blocked Road Corridors
- **TacticalMap (`src/components/TacticalMap.tsx`)**:
  - An SVG and Canvas GIS display rendering a 2D geospatial coordinate projection of the operational area.
  - **Layers Rendered**:
    1. Terrain Base: Synthetic terrain elevation background raster.
    2. Airspace Restricted Geofences: Semi-transparent polygons indicating Restricted Airspace Corridor R-2.
    3. Road Network: Line segments connecting nodes, colored green (open) or red/dashed (blocked by hazard).
    4. Triage Casualties: Color-coded pulsing pins (Red = Immediate, Yellow = Delayed, Green = Minimal, Black = Expectant).
    5. Airspace Tracks: Dynamic aircraft glyphs with velocity vector tails, callsign labels, altitude tags, and color-coded threat rings (Red = Hostile, Yellow = Unknown, Blue = Friendly).
    6. Tactical Markers: User-placed waypoint markers synchronized via BroadcastChannel.
- **Active Airspace Alerts Ribbon**:
  - Displays real-time explainable warnings generated by SkyWatch anomaly detection.
  - Includes a 1-click **Acknowledge** action that updates alert status to `acknowledged: true` across all tabs and persists to the backend.

---

#### 3. FieldLink (`src/modules/fieldlink/FieldLinkModule.tsx`)
- **Purpose**: Tactical report filing, mesh communications, and durable store-and-forward outbox.
- **Operational Logic**:
  1. The user files an incident report specifying Type, Title, Location, Severity (`critical`, `high`, `medium`, `low`), and Tactical Notes.
  2. The client generates a temporary local identifier: `LOCAL-${Date.now()}-${random}`.
  3. The record is written to IndexedDB store `incidents` with `syncStatus: 'pending'` and queued in `outbox`.
  4. The UI updates instantaneously: the incident appears in the list marked with an amber `LOCAL PENDING` badge.
  5. If online, `apiClient.createIncident()` transmits the report to `POST /api/incidents` or `POST /api/sync`.
  6. **De-ghosting Logic**: When the server confirms the record and returns a canonical ID (`INC-SYNC-...`), `apiClient` saves the confirmed record and explicitly calls `dbService.deleteIncident(oldLocalId)`. This prevents the old local record from resurfacing as a phantom pending duplicate.
  7. The status badge transitions to green `SERVER CONFIRMED`. If sync fails, it shows red `SYNC FAILED` with retry capabilities.
- **Multi-Tab Mesh Chatter**:
  - Messages sent in FieldLink are broadcast over the `sentinel_mesh_bus` and `sentinel_tactical_mesh` BroadcastChannels, immediately rendering in other open tabs without requiring a network round-trip.

---

#### 4. SkyWatch (`src/modules/skywatch/SkyWatchModule.tsx`)
- **Purpose**: Real-time airspace surveillance, kinematic target tracking, and autonomous anomaly detection.
- **Target Representation (`TelemetryTrack`)**:
  - `id`: Unique identifier (e.g. `TRK-001`, `TRK-002`).
  - `callsign`: Aircraft callsign (e.g. `VIPER-1`, `HAWK-2`).
  - `x, y, z`: Coordinates in local tactical projection (`z` = altitude in meters).
  - `vx, vy, vz`: Velocity vectors in knots / m/s.
  - `heading`: Compass heading in degrees ($0^{\circ}$–$360^{\circ}$).
  - `threatScore`: Integer from 0 to 100 based on flight profile.
  - `classification`: `FRIENDLY`, `HOSTILE`, `UNKNOWN`, `CIVILIAN`.
  - `isSimulated`: Boolean flag ensuring simulated tracks are clearly marked.
- **Autonomous Anomaly Detection Rules (`server/src/services/telemetryService.ts`)**:
  1. **Speed Spike Anomaly (`SUDDEN_ACCELERATION`)**: Triggered when $|\Delta v| > 150\text{ kts/s}$. Identifies missile launches or unexpected afterburner sprints. Deduplicated so identical active alerts are not spammed.
  2. **Altitude Corridor Breach (`LOW_ALTITUDE_BREACH`)**: Triggered when an aircraft descends below the 400m floor within urban corridors.
  3. **Restricted Zone Incursion (`ZONE_BREACH`)**: Triggered when a track breaches the boundary of Restricted Airspace R-2. Calculates perimeter penetration distance.
- **Radar Scope Display**:
  - Canvas-based rotating sweep line ($360^{\circ}$ continuous sweep).
  - Phosphor glow blips with decaying persistence trails.
  - Ranked Threat Priority Queue: sorts tracks descending by threat score.

---

#### 5. GeoIntel (`src/modules/geointel/GeoIntelModule.tsx`)
- **Purpose**: Autonomous surface alteration detection comparing satellite/drone before-and-after raster imagery.
- **Algorithmic Pipeline (`src/algorithms/geointel/imageDiff.ts`)**:
  1. **Matrix Differencing**:
     $$\Delta(x, y) = |I_{\text{after}}(x, y) - I_{\text{before}}(x, y)|$$
  2. **Threshold Sensitivity Filtering**: Pixels where $\Delta(x, y) < \text{threshold}$ are zeroed out to eliminate sensor noise and atmospheric haze.
  3. **Connected Components Clustering**: Groups adjacent altered pixels into distinct candidate bounding boxes: $[x, y, w, h]$.
  4. **Filtering**: Regions smaller than `minRegionSize` (e.g. 4x4) are pruned as spurious noise.
  5. **MGRS Coordinate Mapping**: Translates pixel coordinates into Military Grid Reference System (MGRS) strings (e.g. `11S LR 85877 85418`).
- **Analyst Workflow & Mandatory Disclaimer**:
  - Candidates are highlighted with yellow bounding boxes on the Surveillance Canvas.
  - The analyst inspects candidates using the **Candidate Inspector**, toggles before/after views, and marks candidates as `confirmed` or `dismissed`.
  - Confirmed candidates can be compiled into an Intelligence Report.
  - Every compiled report automatically injects the mandatory legal/operational disclaimer:  
    `"NOTICE: AI-assisted surface change detection requires human analyst validation before tactical action."`

---

#### 6. MediRoute (`src/modules/mediroute/MediRouteModule.tsx`)
- **Purpose**: Mass casualty triage management and hazard-avoiding ambulance route optimization.
- **START Triage Algorithm (`src/algorithms/mediroute/triageEngine.ts`)**:
  Executes the standardized Simple Triage and Rapid Treatment (START) protocol:
  ```
                        [Can the Casualty Walk?]
                               /         \
                             YES          NO
                             /             \
                  MINIMAL (Green)     [Breathing?]
                                      /          \
                                    NO            YES
                                   /                \
                    [Airway Reposition]        [Rate > 30 bpm?]
                       /          \               /          \
                     NO            YES          YES           NO
                     /              \           /              \
             EXPECTANT (Black)  IMMEDIATE (Red) IMMEDIATE (Red) [Radial Pulse?]
                                                               /          \
                                                             NO            YES
                                                             /              \
                                                    IMMEDIATE (Red)   [Follows Commands?]
                                                                        /           \
                                                                      NO             YES
                                                                      /               \
                                                               IMMEDIATE (Red)  DELAYED (Yellow)
  ```
- **Dynamic Hazard-Aware Graph Router (`src/algorithms/mediroute/graphRouter.ts`)**:
  - Models the regional transportation network as a weighted graph $G = (V, E)$ where vertices $V$ represent junctions, casualty pickup locations, and field hospitals, and edges $E$ represent road segments with distance weights.
  - When calculating the route between origin and destination:
    1. Evaluates all active road hazards in IndexedDB store `hazards`.
    2. Identifies edges blocked by landslides, fissures, or flooding (e.g. `EDGE-2`).
    3. Prunes blocked edges from the adjacency graph.
    4. Executes Dijkstra's algorithm to compute the shortest unblocked path.
    5. If a detour is necessary, details the diverted route and added transit time.
    6. **Honest Failure Reporting**: If all routes to the destination are severed, the router returns `routeFound: false` with the explicit explanation: `"No available unblocked route between origin and destination"` rather than fabricating an unreachable path.

---

## 4. Local Persistence & Data Synchronization Engine

### IndexedDB Schema Version 3 (`SENTINEL_TACTICAL_DB`)

| Store Name | Primary Key | Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `incidents` | `id` | `syncStatus`, `clientId`, `createdAt` | FieldLink reports and operational incidents |
| `outbox` | `id` | `status`, `entityType`, `createdAt` | Durable mutation queue for store-and-forward sync |
| `geointel` | `id` | `syncStatus` | Analyst reviews, candidate annotations, and observations |
| `casualties` | `id` | — | Patient intake records, triage categories, and vitals |
| `hazards` | `id` | — | Road blockages, structural bridge fissures, and hazards |
| `markers` | `id` | — | Shared tactical map markers placed by operators |
| `mesh_messages` | `id` | — | Local tactical mesh chatter history |
| `sync_logs` | `id` | — | Historical record of synchronization attempts and outcomes |
| `alerts` | `id` | — | Airspace anomaly alerts and officer acknowledgements |

### SyncManager (`src/services/sync/syncManager.ts`)
The `SyncManager` coordinates background and foreground synchronization between IndexedDB and the Express backend:
1. **Network Listeners**:
   - Subscribes to browser `window.addEventListener('online')` and `'offline'`.
   - Listens to `document.addEventListener('visibilitychange')`: when an operator returns to the tab, an immediate health check probe is dispatched.
2. **Health Probing with Bounded Exponential Backoff**:
   - Probes `GET /api/health`.
   - On connectivity loss, retries are throttled using exponential backoff: $3\text{s} \to 6\text{s} \to 12\text{s} \to 24\text{s} \to 30\text{s}$ (capped at 30 seconds).
   - Prevents overwhelming low-bandwidth tactical satellite links with reconnection storms.
3. **Execution Steps on Sync**:
   - Queries `dbService.getPendingOutboxItems()` and `apiClient.getPendingSyncIncidents()`.
   - Packages pending items into batch payload for `POST /api/sync`.
   - The backend processes items idempotently using `clientId` / `idempotencyKey`.
   - If an item was already received, the server returns `outcome: 'already_received'` along with the canonical `serverId`.
   - The client updates the local record's status to `syncStatus: 'synced'`, records `syncedAt`, and deletes obsolete local keys.
   - Dispatches a sync completion event across the `sentinel_mesh_bus` BroadcastChannel so all open tabs update their counters in unison.

---

## 5. Multi-Tab Mesh Architecture (`src/services/mesh/meshService.ts`)

SENTINEL allows an operator to run multiple monitoring displays (e.g. Map on Monitor 1, FieldLink on Monitor 2) without data drift:
- Utilizes the browser `BroadcastChannel` API under channel names `sentinel_mesh_bus` and `sentinel_tactical_mesh`.
- **Event Types Broadcast**:
  - `MESH_MESSAGE_SEND`: New tactical communication broadcast.
  - `MARKER_UPDATE`: User placed or removed a map waypoint.
  - `SYNC_EVENT`: Outbox item synchronized with server.
  - `ALERT_ACK`: Watch officer acknowledged an airspace threat.
- **De-duplication Protection**:
  - Records arriving via both BroadcastChannel and server synchronization are matched by stable UUID / `id` so duplicate cards are never rendered in the UI.

---

## 6. Directory Structure & Key Files

```
fallingsun/
├── public/
│   ├── manifest.json              # Standalone PWA manifest & theme tokens
│   ├── sw.js                      # sentinel-shell-v2 service worker
│   ├── icons/                     # 192px, 512px, SVG, and maskable tactical icons
│   └── assets/                    # Synthetic terrain rasters (terrain-default.png, etc.)
├── server/
│   ├── src/
│   │   ├── index.ts               # Express server entry point (port 5000)
│   │   ├── db/database.ts         # JSON file persistence (sentinel_store.json)
│   │   ├── routes/                # REST endpoints (incidents, telemetry, sync, etc.)
│   │   └── services/              # Kinematic simulator, GeoIntel, MediRoute
│   └── tests/                     # 27 server test suites
├── shared/
│   ├── types.ts                   # Unified TypeScript interfaces across client and server
│   └── fixtures.ts                # Deterministic baseline tactical entities
├── src/
│   ├── app/
│   │   ├── App.tsx                # Main state controller, routing, and watchdog timer
│   │   ├── CommandHeader.tsx      # System status, IST clock, simulation controls
│   │   └── Sidebar.tsx            # Tactical navigation rail
│   ├── components/
│   │   └── TacticalMap.tsx        # Unified SVG/Canvas COP display
│   ├── dashboard/                 # KPI metrics ribbon and COP summaries
│   ├── modules/
│   │   ├── fieldlink/             # Incident reports, outbox queue, mesh chatter
│   │   ├── skywatch/              # Radar scope, track queue, anomaly alerts
│   │   ├── geointel/              # Satellite image difference raster analyzer
│   │   └── mediroute/             # START triage and Dijkstra router
│   ├── services/
│   │   ├── api/apiClient.ts       # REST client with outbox deduplication
│   │   ├── api/realtimeService.ts # Server-Sent Events (SSE) telemetry subscriber
│   │   ├── storage/indexedDb.ts   # SENTINEL_TACTICAL_DB v3 object stores
│   │   ├── sync/syncManager.ts    # Reconnection probing, exponential backoff
│   │   └── mesh/meshService.ts    # Multi-tab BroadcastChannel bridge
│   └── styles/
│       ├── index.css              # Dark mode styling and tactical animations
│       └── tokens.css             # Standardized CSS custom properties
├── tests/
│   ├── offline-sync.test.ts       # 14 offline PWA & synchronization regression tests
│   ├── algorithms.test.ts         # GeoIntel, START triage, and Dijkstra test suites
│   └── demonstration.ts           # End-to-end multi-module repeatable demonstration
├── vite.config.ts                 # Vite bundler config with PWA bundle injector plugin
└── package.json                   # Scripts: dev, dev:server, build, test
```

---

## 7. Verification & Testing Commands

To verify the platform's integrity, execute the following commands from the project root (`/home/abhay/Desktop/Sentinals/fallingsun`):

```bash
# 1. Run all 122 contract tests, seeded simulations, multi-tab comms, and 14 offline-sync tests
npm test

# 2. Run the 27 server-side REST, persistence, and synchronization test suites
npm run test:server

# 3. Run algorithmic correctness tests (START triage, Dijkstra routing, GeoIntel image diff)
npm run test:algorithms

# 4. Run the end-to-end repeatable multi-module demonstration test
npm run test:demo

# 5. Build production frontend (validates bundle injection into dist/sw.js)
npm run build:frontend

# 6. Build production backend
npm run build:server
```

---

## 8. Summary for Operating AI Agents

When interacting with or extending SENTINEL:
1. **Never bypass IndexedDB**: All user-initiated data writes must go through `dbService` or `apiClient` so that records are durable locally before reaching the server.
2. **Never change existing entity IDs on retry**: Preserve `clientId` and `idempotencyKey` so server synchronization remains strictly idempotent.
3. **Preserve the offline cache**: Production assets are injected into `dist/sw.js` at build time by `vite.config.ts`. Avoid hardcoding asset hashes manually.
4. **Respect the legal disclaimer in GeoIntel**: AI-generated surface change detections must never be finalized without preserving the required human-analyst review disclaimer.
5. **Always test offline**: Ensure any UI additions function gracefully when the backend returns HTTP 503 or when `navigator.onLine` is false.
