# SENTINEL — Technical Audit Report
**Integrated Situational Awareness & Emergency Response Platform**

---

## 1. Executive Summary

This report presents a comprehensive, evidence-based technical audit of the **SENTINEL** repository (workspace: `fallingsun`), conducted by inspecting source code, dependencies, build artifacts, test suites, live API endpoints, data persistence mechanisms, and simulation engines.

### Key Audit Findings

1. **Working Operational Platform:** SENTINEL is a functional, architecturally sophisticated prototype. The backend (Express / TypeScript) and frontend (React 18 / TypeScript / Vite / Vanilla CSS Neumorphic design) build cleanly without errors (`build:frontend` and `build:server` exit code 0).
2. **Deterministic Algorithmic Engines:** Core mission algorithms are implemented and verified:
   - **MediRoute START Triage:** Evaluates vitals (ambulatory status, respiratory rate, perfusion/radial pulse, mental status, hemorrhage) and returns transparent clinical justifications (e.g. Rule 3 tachypnea `> 30/min` triggers `immediate`).
   - **MediRoute Dijkstra Routing:** Computes shortest evacuation corridors on a weighted road network and dynamically diverts around blocked road edges (e.g., detouring around collapsed Highway 9 to North Ridgeline Bypass, adding 1.1 km).
   - **SkyWatch Anomaly Detection:** Rule-based kinematic detector flags unauthorized flight ceiling violations (`SUDDEN_ACCELERATION`), perimeter breaches (`ZONE_INCURSION`), and trajectory deviations.
   - **GeoIntel Matrix Diffing:** Algorithmic matrix diffing and BFS connected-component clustering (`src/algorithms/geointel/imageDiff.ts`) identifies pixel changes between multi-temporal observation matrices.
3. **Active Real-Time Telemetry:** Server-Sent Events (`/api/events`) and an auto-ticking simulation loop stream live UAV track kinematic updates and trigger explainable alerts every 3000 ms.
4. **Passing Automated Test Suites:** 56 tests pass across the standard test pipeline (`npm run test:all`), comprising 9 frontend contract tests, 24 backend integration/persistence tests, and 23 algorithmic engine tests.
5. **Critical Gaps Discovered (P0/P1):**
   - **Sync Contract Schema Discrepancy (P0):** In `src/services/api/apiClient.ts` line 315, the frontend sync engine sends `{ reports: payloads }`, while the backend validator `server/src/validation/validators.ts` line 197 strictly rejects requests unless formatted with `{ items: [...] }`. This causes real end-to-end sync batch submissions from the UI to fail with HTTP 400 `VALIDATION_ERROR`.
   - **Supabase Storage Mode Misrepresentation (P0):** The backend client `server/src/db/supabaseClient.ts` instantiates `@supabase/supabase-js`, and `/api/health` reports `storageMode: 'supabase'` when credentials exist. However, `server/src/db/database.ts` contains **no** Supabase table query operations. All reads and writes execute exclusively against local disk file storage (`data/sentinel_store.json`).
   - **Absence of URL Deep Linking (P1):** Navigation is held in React state (`useState('dashboard')`). Refreshing any page returns the operator to the Dashboard; deep linking does not exist.
   - **Unit Test Flaw in `tests/algorithms.test.ts` (P1):** Standalone unit test `SkyWatch: Speed spike anomaly triggers explainable alert` fails because the test does not pass baseline points to `detector.evaluate()` prior to testing the spike step.

---

## 2. Audit Scope and Environment

- **Audit Date & Local Timestamp:** `2026-10-25T22:46:18+05:30` (UTC `17:16:18Z`)
- **Workspace Directory:** `/home/nikhil/Desktop/Sentinals/fallingsun`
- **Active Git Branch:** `main`
- **Git HEAD Commit:** `86e53366000c3f1320a1d80c68a377b5f3b8a5b7`
- **Commit Message:** `merge: resolve CommandHeader.tsx keeping SSE live indicator and IST clock`
- **Working Tree Status:** Clean (`nothing to commit, working tree clean`)
- **Upstream Remote:** `origin` -> `https://github.com/nk6629716-afk/fallingsun` (in sync with `origin/main`)
- **Node.js Runtime:** `v20.18.0` / `npm 10.8.2`
- **Platform OS:** Linux x86_64

---

## 3. Architecture Discovered

### 3.1 Frontend Architecture
- **Framework & Build:** React 18.3.1, TypeScript 5.6.3, Vite 5.4.11 / 5.4.21.
- **Entry Points:** `index.html` mounts `src/main.tsx`, which renders `src/app/App.tsx`.
- **Navigation & Routing:** Managed via React state (`activeModule: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute'`). No `react-router` or HTML5 History API integration exists.
- **Styling System:** Vanilla CSS design system (`src/styles/index.css`) implementing an Editorial Neumorphic C4ISR interface with dual-theme support (Titanium Light and Tactical Obsidian Dark via `data-theme` attribute).
- **Visualization:** Custom interactive Canvas and SVG tactical maps (`src/components/TacticalMap.tsx` and `src/modules/geointel/components/SurveillanceCanvas.tsx`), featuring radar sweep PPI animations, waypoint trails, and dynamic road corridor glows.

### 3.2 Backend Architecture
- **Framework:** Express 4.19.2 on Node.js, written in TypeScript (`server/src/index.ts` and `server/src/app.ts`).
- **Service Layer:**
  - `server/src/services/dashboardService.ts`: Dynamic metrics computation.
  - `server/src/services/incidentService.ts`: CRUD with input validation and timestamps.
  - `server/src/services/syncService.ts`: Idempotent batch sync reconciliation and deduplication.
  - `server/src/services/telemetryService.ts`: UAV kinematics, radar sector sweeps, anomaly rule evaluations.
  - `server/src/services/geoIntelService.ts`: Normalized bounding box analysis and analyst review states.
  - `server/src/services/mediRouteService.ts`: START triage categorizer and Dijkstra shortest-path router.
- **Error Handling & Middleware:** Express JSON parser (`limit: 1mb`), CORS (`credentials: true`), centralized error middleware handling `ValidationError` (400), malformed JSON (400), and internal errors (500).

### 3.3 Data Model & Persistence Layers
- **Client Storage (Browser):** IndexedDB via `src/services/storage/indexedDb.ts` (`SENTINEL_TACTICAL_DB` v1), maintaining 5 object stores: `incidents` (indexed by `syncStatus` and `createdAt`), `alerts`, `geointel`, `casualties`, and `hazards`.
- **Server Persistence:** `server/src/db/database.ts` implements atomic file persistence to `sentinel_store.json` using atomic temporary file write and `renameSync` replacement. Supports runtime switch to in-memory mode when `STORAGE_MODE=memory`.
- **Supabase Integration Status:** DDL schemas are defined (`supabase_schema.sql` and `server/src/db/schema.sql`). `server/src/db/supabaseClient.ts` initializes the Supabase client if `SUPABASE_SERVICE_ROLE_KEY` is present, but no service queries the Supabase database.

### 3.4 Real-Time Mechanism
- **Transport:** Server-Sent Events (SSE) via `GET /api/events` handled by `SseManager` (`server/src/realtime/sseHandler.ts`).
- **Heartbeat:** Periodic ping event every 15,000 ms (`SSE_HEARTBEAT_INTERVAL_MS`).
- **Event Bus:** Decoupled `EventEmitter` (`server/src/realtime/eventBus.ts`) broadcasting `telemetry:tick`, `alert:created`, `alert:acknowledged`, `incident:created`, `patient:created`, `hazard:updated`, and `demo:reset`.
- **Client Consumer:** `RealtimeService` (`src/services/api/realtimeService.ts`) handles automatic reconnection, stale-connection detection, and state dispatch to React components.

### 3.5 Offline / Low-Bandwidth Synchronization Strategy
- **Client Outbox:** Reports created while offline are queued in IndexedDB with `syncStatus: 'pending'` and `status: 'pending_sync'`.
- **Idempotency:** Stable client-generated UUID (`clientId`) and cryptographic hash (`computeReportIdempotencyKey`) ensure repeat sync requests are detected without creating duplicate database records.
- **Reconciliation Protocol:** Batch sync returns itemized outcomes (`accepted`, `already_received`, `rejected`). Accepted and already-received records transition to `synced` and receive a permanent `serverId`.

### 3.6 Deployment & Serving Configuration
- **Full-Stack Serving:** When running the server in production mode (`npm run start`), Express inspects candidate paths for `dist/` and serves static assets directly, with wildcard SPA fallback (`res.sendFile('dist/index.html')`) for non-API routes.
- **Development Serving:** Vite dev server on port 5173 proxies `/api` to port 5000 (`vite.config.ts`).

---

## 4. Requirements Compliance Matrix

| Requirement Area | Status | Evidence & Test Details | User-Visible Impact | Specific Gap or Risk | Recommended Next Step |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Operational Dashboard** | **PRESENT — VERIFIED** | Loads at `http://localhost:5000/`; `GET /api/dashboard` computes dynamic KPIs; SVG/Canvas map renders tracks and sectors. | Instant common operational picture with interactive filters and reset. | Deep links do not work after refresh (always resets to dashboard). | Add URL hash routing (`#dashboard`, `#fieldlink`, etc.) in `App.tsx`. |
| **B. Real-Time Telemetry** | **PRESENT — VERIFIED** | SSE at `/api/events` streams ticks every 3s; `TRK-003` speed spikes trigger real-time alert `ALT-...` without manual refresh. | Operators see live UAV kinematic tracks and real-time alert badges. | Disconnecting SSE does not display explicit banner outside header. | Add persistent toast notification on stream disconnect. |
| **C. Responsive Layout** | **PARTIAL** | CSS `@media (max-width: 900px)` mobile drawer and touch targets verified; visual headless checks unverified due to Playwright container download block. | Layout adapts to mobile and desktop via CSS grid/flex and slide-out menu. | Visual regression across unusual aspect ratios is unverified by browser automation. | Test on physical mobile device or enable local browser binaries. |
| **D. Offline Queue & Sync** | **PARTIAL** | IndexedDB stores pending records; backend `/api/sync` validates idempotency; contract payload key mismatch (`reports` vs `items`). | Manual sync from UI triggers 400 error unless payload format is aligned. | High: Field users cannot sync offline records to live server from UI. | Align `apiClient.ts` to send `{ items: payloads }` or update `validators.ts` to accept `reports`. |
| **E. Explainable Algorithms** | **PRESENT — VERIFIED** | START triage rules with clinical rationales; Dijkstra hazard detour routing; SkyWatch anomaly detector; GeoIntel matrix diffing. | Demonstrates transparent algorithmic decision support to judges. | Standalone `tests/algorithms.test.ts` has 1 setup bug in speed anomaly assertion. | Feed baseline point in `tests/algorithms.test.ts` line 174 before triggering spike. |

---

## 5. Module-by-Module Findings

### 5.1 FieldLink (Tactical Offline Reporting)
- **Files:** `src/modules/fieldlink/FieldLinkModule.tsx`, `src/algorithms/fieldlink/queueManager.ts`, `server/src/services/syncService.ts`.
- **Implementation State:** Comprehensive offline UI form with preset geolocations, outbox counter, priority badges, and search filter.
- **Contract Mismatch (P0 Gap):**
  - Frontend `apiClient.ts` line 315:
    ```typescript
    body: JSON.stringify({ reports: payloads })
    ```
  - Backend validator `server/src/validation/validators.ts` line 197:
    ```typescript
    if (!Array.isArray(b.items)) {
      throw new ValidationError('Sync request must contain an "items" array', ...);
    }
    ```
- **Type Restriction:** `VALID_INCIDENT_TYPES` in `validators.ts` only permits `['medical', 'hazard', 'hostile_drone', 'infrastructure', 'recon', 'general']`. Non-matching types are rejected.

### 5.2 SkyWatch (Counter-Drone & Airspace Security)
- **Files:** `src/modules/skywatch/SkyWatchModule.tsx`, `src/algorithms/skywatch/simulator.ts`, `src/algorithms/skywatch/anomalyDetector.ts`, `server/src/services/telemetryService.ts`.
- **Implementation State:** Continuous radar simulation with heading vector calculations, breadcrumb flight histories, and interactive speed controls (1x, 2x, 5x).
- **Anomaly Detection Rules:**
  - `ZONE_INCURSION`: Triggers when distance to restricted polygon boundary is `<= 0`.
  - `SUDDEN_ACCELERATION`: Triggers when speed delta exceeds threshold (e.g. `> 45 kts` or ceiling `> 75 kts`).
  - `ROUTE_DEVIATION`: Triggers on cross-track drift `> 350m`.
- **Alert Lifecycle:** Verified via `PATCH /api/alerts/:id` with `{ "acknowledged": true, "acknowledgedBy": "..." }`.

### 5.3 GeoIntel (Geospatial Reconnaissance & Image Diff)
- **Files:** `src/modules/geointel/GeoIntelModule.tsx`, `src/algorithms/geointel/imageDiff.ts`, `server/src/services/geoIntelService.ts`.
- **Implementation State:** Dual-sensor reconnaissance interface with before/after imagery, swipe split-slider, candidate inspector, and MGRS coordinate converter.
- **Algorithmic Decoupling (P2 Gap):**
  - `src/algorithms/geointel/imageDiff.ts` contains a complete BFS image differencing and clustering algorithm (verified via `python3 tests/run_verification.py` and unit tests).
  - However, in `GeoIntelModule.tsx`, `handleStartAnalysis` runs a simulated progressive timer that exposes backend fixtures rather than running the diff engine directly on arbitrary user-uploaded rasters.

### 5.4 MediRoute (Triage & Evacuation Logistics)
- **Files:** `src/modules/mediroute/MediRouteModule.tsx`, `src/algorithms/mediroute/triageEngine.ts`, `src/algorithms/mediroute/graphRouter.ts`, `server/src/services/mediRouteService.ts`.
- **Implementation State:** Full START triage intake calculator with live rationale preview, road graph hazard toggles, and Dijkstra hazard-aware routing.
- **Verified Behavior:**
  - Ambulatory casualty -> `minimal` (Rule 1).
  - Respiratory rate 34 -> `immediate` ("Tachypnea detected RR 34 > 30").
  - Absent radial pulse -> `immediate` ("Hemodynamic compromise").
  - Road blockage on Highway 9 (`EDGE-2`) automatically diverts routing through North Ridgeline Bypass (`EDGE-4 -> EDGE-7 -> EDGE-3`).
  - Graph disconnection cleanly returns `routeFound: false` without crashing.

---

## 6. Integrated Severe-Storm Situation Task

The fictional civilian emergency drill was evaluated step-by-step against the live local backend (`http://localhost:5000`):

| Step | Operation & Target Endpoint | Expected Result | Observed Result | Verdict |
| :---: | :--- | :--- | :--- | :---: |
| **1** | App startup & `GET /api/dashboard` | Dashboard loads cleanly; KPI counts accurate | Server started; returned `openIncidentsCount: 3`, `activeTracksCount: 3`, `storageMode: 'file'` | **PASS** |
| **2** | Create storm report (`POST /api/incidents`) | Validates fields; persists record; updates metrics | Created `INC-MVO33HAJ-821B`; `openIncidentsCount` incremented from 3 to 4 | **PASS** |
| **3** | Offline incident & sync (`POST /api/sync`) | Enqueues locally; accepts first sync; deduplicates retry | First sync with `{ items: [...] }` returned `outcome: "accepted"`; second retry returned `outcome: "already_received"` | **PASS\*** *(Requires `{ items }` payload)* |
| **4** | SkyWatch simulated alert & acknowledgement | Anomaly detector flags violation; duty officer acknowledges | Alert `ALT-MVO35BU7-D4R` acknowledged via `PATCH /api/alerts/:id`; updated status broadcast via SSE | **PASS** |
| **5** | GeoIntel observation review (`PATCH /api/geointel/...`) | Analyst reviews candidate change and records notes | `GEO-302` updated to `confirmed_candidate`; `pendingGeoReviewsCount` updated from 1 to 0 | **PASS** |
| **6** | MediRoute triage & route calculation | Evaluates triage; calculates detour avoiding blocked road | Vitals with RR 34 assigned `immediate`; Dijkstra rerouted around blocked `EDGE-2` to `EDGE-4,7,3` (4.4 km) | **PASS** |
| **7** | Cross-module state consistency | All modules reflect consistent counts in dashboard | Dashboard KPI metrics reflect new incidents, acknowledged alerts, and confirmed reviews | **PASS** |
| **8** | Responsiveness & error handling | Invalid payloads return structured error codes | Tested invalid priority and disconnected graph; returned clean JSON errors (`VALIDATION_ERROR`, 400) | **PASS** |
| **9** | Persistence across server restart | State is reloaded from `sentinel_store.json` on disk | Database state persisted to `server/dist/data/sentinel_store.json` (18.6 KB) and reloaded | **PASS** |
| **10**| Clean demo reset (`POST /api/demo/reset`) | Restores pristine baseline fixtures | Restored 3 incidents, 3 tracks, baseline alerts, and unblocked edges | **PASS** |

*\*Note on Step 3: Succeeded when calling the API directly with `{ items: [...] }`, but would fail if invoked directly from the frontend UI due to the contract mismatch in `apiClient.ts`.*

---

## 7. API and Persistence Verification

### 7.1 Verified Backend Endpoints
- `GET /api/health` -> HTTP 200, returns uptime, storage mode, and simulation flag.
- `GET /api/dashboard` -> HTTP 200, computes dynamic KPIs from database state.
- `GET /api/incidents` & `POST /api/incidents` -> HTTP 200/201, handles field validation and search filters.
- `POST /api/sync` -> HTTP 200, processes batch sync with idempotency check.
- `GET /api/telemetry` & `POST /api/telemetry/tick` -> HTTP 200, steps UAV positions and evaluates rules.
- `GET /api/alerts` & `PATCH /api/alerts/:id` -> HTTP 200, acknowledges alerts.
- `GET /api/geointel/observations` & `PATCH /api/geointel/observations/:id` -> HTTP 200, analyst review workflow.
- `POST /api/patients` & `PATCH /api/patients/:id` -> HTTP 200/201, START triage intake.
- `POST /api/routes/calculate` -> HTTP 200, Dijkstra route with hazard avoidance.
- `POST /api/demo/reset` -> HTTP 200, resets stores to deterministic baseline.
- `GET /api/events` -> HTTP 200 `text/event-stream`, real-time SSE stream with 15s heartbeats.

### 7.2 Persistence & Storage Mode Audit
- **Local JSON File Mode:** True primary persistence layer. Writes to `config.dataDir/sentinel_store.json` with temporary file atomic swapping (`tempPath` -> `renameSync`).
- **Supabase Integration Status:**
  - `SUPABASE_URL` defaults to `https://cajrbzfsfsimxweomrlt.supabase.co`.
  - `SUPABASE_SERVICE_ROLE_KEY` is not populated in `.env` by default.
  - **Code Path Reality:** No query functions in `server/src/db/database.ts` call Supabase. Even if credentials are provided, data is written solely to the local filesystem.

---

## 8. Responsive UI, Accessibility, and Error-State Review

### 8.1 Layout Breakpoints (`src/styles/index.css`)
- **Desktop (`>= 1100px`):** Complete C4ISR layout with 248px sidebar, sticky command header, multi-column KPI grids, and side-by-side tactical maps.
- **Tablet (`900px - 1100px`):** Subtitles hide gracefully; columns collapse to 2-up grids.
- **Mobile (`<= 900px`):** App shell switches to flex column; sidebar transforms into an off-canvas drawer (`transform: translateX(-100%)`) with dark overlay backdrop (`.sidebar-backdrop`) and hamburger trigger (`.btn-mobile-nav`).
- **Touch Targets (`<= 600px`):** Touch targets expand to `>= 44px` (`min-width: 44px, min-height: 44px`).

### 8.2 Accessibility Audit
- **Focus Rings:** Visible focus ring defined for keyboard navigation (`outline: 2px solid var(--accent); outline-offset: 2px`).
- **Contrast Ratios:** Text tokens (`#0F172A` on `#F8FAFC` in light mode; `#F1F5F9` on `#0A0E17` in dark mode) exceed WCAG 2.1 AA standards (contrast ratio `> 12:1`).
- **Keyboard Shortcuts:** Global hotkey `Ctrl+B` / `Cmd+B` toggles sidebar collapse on desktop or mobile drawer on small screens; `Escape` closes open drawers and modals.

---

## 9. Tests, Builds, Commands, and Exact Results

### 9.1 Build Verification
- **`npm run build:frontend` (`tsc && vite build`)**
  - Exit Code: **0**
  - Bundle Output: `dist/index.html` (1.87 kB), `dist/assets/index-BGt5RDI4.css` (12.96 kB), `dist/assets/index-CineEjEK.js` (360.03 kB).
  - Time: **4.18s**
- **`npm run build:server` (`npm --prefix server run build`)**
  - Exit Code: **0**
  - Output: Compiled TypeScript to `server/dist/server/src/index.js`.

### 9.2 Test Suite Execution Results
- **`npm test` (`node src/tests/frontend-contracts.test.js`):**
  - Exit Code: **0**
  - Passed: **9 / 9** tests (START triage rules, Dijkstra detour, FieldLink idempotency).
- **`npm run test:server` (`tsx --test tests/*.test.ts`):**
  - Exit Code: **0**
  - Passed: **24 / 24** tests across dashboard, geointel, health, incidents, mediroute, persistence, sync, and telemetry.
- **`python3 tests/run_verification.py`:**
  - Exit Code: **0**
  - Passed: **23 / 23** tests (100% success rate across all 4 algorithmic modules).
- **Standalone `tests/algorithms.test.ts`:**
  - Exit Code: **0** (runner catches assertion errors internally)
  - Passed: **20 / 21** tests.
  - **Single Failure:** `SkyWatch: Speed spike anomaly triggers explainable alert -> Assertion failed: Should trigger at least 1 alert` (Test setup omits calling `evaluate` on baseline points before testing spike point).

---

## 10. Security, Privacy, Reliability, and Data-Loss Risks

1. **Synthetic Data Boundaries:** All datasets are strictly synthetic and clearly marked with `isSimulated: true`. No real drone telemetry, classified intelligence, or clinical patient records exist in the repository.
2. **Credential Safety:** No hardcoded secrets were found in git commits. Supabase service-role keys are safely read from environment variables and redacted in logs.
3. **Engine Compatibility Warning:** The Supabase JavaScript client (`@supabase/supabase-js@2.118.0`) outputs deprecation notices under Node.js v20 (requires Node.js 22+).
4. **Data Loss Risk:** Because backend storage is an atomic local JSON file, deploying to ephemeral container platforms (e.g., standard Render/Heroku web dynos without persistent volume mounts) will cause demo data to reset on container restart.

---

## 11. Prioritized Gap List (P0–P3)

| Priority | Gap Title | Evidence | Impact on Demo | Proposed Solution | Files Affected | Verification Test |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | **Sync Payload Schema Mismatch** | `apiClient.ts:315` sends `{ reports }`; `validators.ts:197` demands `{ items }`. | Manual "Sync Outbox" button in UI fails with HTTP 400. | Update `validators.ts` to accept `b.items \|\| b.reports` OR update `apiClient.ts` to send `{ items }`. | `server/src/validation/validators.ts`, `src/services/api/apiClient.ts` | Queue offline incident in UI, reconnect, hit "Sync Outbox", verify 200 OK. |
| **P0** | **Misleading Supabase Storage Status** | `healthRoutes.ts:16` sets `storageMode: 'supabase'`, but `database.ts` only writes to disk. | Judges/evaluators are misled into believing cloud DB is active. | Report `storageMode: 'file (supabase unlinked)'` unless live table sync is implemented. | `server/src/routes/healthRoutes.ts`, `server/src/index.ts` | Curl `/api/health` and verify accurate storage mode label. |
| **P1** | **Absence of URL Routing / Deep Links** | `App.tsx:25` uses `useState('dashboard')` without URL sync. | Refreshing browser during demo resets view to Dashboard. | Sync `activeModule` to `window.location.hash` (`#fieldlink`, `#skywatch`, etc.). | `src/app/App.tsx`, `src/app/Sidebar.tsx` | Navigate to `#mediroute`, refresh browser, confirm MediRoute view remains active. |
| **P1** | **Algorithm Test Suite Fixture Bug** | `tests/algorithms.test.ts:175-178` evaluates spike without prior track history. | 1 test fails in standalone test suite (20/21). | Call `detector.evaluate(pt)` on the initial 2 nominal steps prior to evaluating `spikePt`. | `tests/algorithms.test.ts` | Run `tsx tests/algorithms.test.ts` and verify 21/21 tests pass. |
| **P2** | **GeoIntel UI Algorithmic Decoupling** | `GeoIntelModule.tsx:145` simulates progress with timer rather than running `GeoIntelImageDiff`. | Judges cannot test arbitrary uploaded images in real time. | Wire `GeoIntelImageDiff.analyze()` directly into image comparison runner. | `src/modules/geointel/GeoIntelModule.tsx` | Run analysis and inspect output candidate cluster boundaries. |
| **P2** | **Node 20 Supabase Deprecation Warning** | Console outputs Node 20 engine warning during test runs. | Clutters terminal during live evaluation. | Upgrade environment to Node.js 22 LTS or lock Supabase client version. | `package.json`, environment Dockerfile | Run `npm test:server` and verify zero deprecation warnings. |
| **P3** | **Shortcut Discoverability Polish** | `Ctrl+B` shortcut works but has no visible tooltip. | Minor usability gap for keyboard power users. | Add `(Ctrl+B)` hint to sidebar toggle button in header. | `src/app/CommandHeader.tsx` | Hover over collapse button and inspect tooltip. |

---

## 12. What to Preserve / What Not to Rewrite

1. **Do Not Rewrite the UI Architecture:** The Neumorphic CSS design system, typography tokens, and responsive layout are visually exceptional, performant, and robust.
2. **Do Not Rewrite MediRoute Dijkstra & Triage:** Both the frontend and backend graph routing algorithms and START decision trees are mathematically sound, fully tested, and cleanly structured.
3. **Do Not Rewrite FieldLink Offline Queue:** The IndexedDB client queue manager, retry lifecycle, and deduplication hashing are well-architected; only the payload key mismatch in `POST /api/sync` requires alignment.
4. **Do Not Rewrite Real-Time Telemetry:** The SSE event bus and client multiplexer operate smoothly with reconnection and heartbeat monitoring.

---

## 13. Minimum Credible Demo Checklist

For a completely reliable, flawless judge presentation, ensure the following steps are followed:

- [ ] **1. Fix Sync Payload Contract:** Change `reports` to `items` in `apiClient.ts` line 315 so offline outbox synchronization works end-to-end from the UI.
- [ ] **2. Fix Unit Test Prime Step:** Add `detector.evaluate(pt)` on nominal steps in `tests/algorithms.test.ts` line 174 so all 21 algorithm unit tests pass.
- [ ] **3. Verify Services Running:** Ensure backend is started on port 5000 (`npm run start:server` or `npm run dev:server`) and frontend is on port 5173.
- [ ] **4. Demonstration Script:**
  - Show unified Dashboard metrics and Tactical Map with live SSE drone tracks.
  - Switch to FieldLink, toggle "Go Offline", create a field report, restore connectivity, and click "Sync Outbox" to show green sync badge.
  - Switch to SkyWatch, observe speed anomaly alert `SUDDEN_ACCELERATION`, and click "Acknowledge".
  - Switch to MediRoute, adjust respiratory rate to 34 to demonstrate dynamic Rule 3 `IMMEDIATE (RED)` triage classification.
  - Toggle road blockage on Highway 9 and click "Recalculate Route" to show Dijkstra diversion via North Ridgeline Bypass (+1.1 km).
  - Click "Reset Demo" in header to return to pristine baseline for next judge.

---

## 14. Limitations and Unverified Items

1. **Automated Headless Browser Visual Inspection:** The browser subagent encountered an offline container limitation when downloading Playwright binaries (`404 Not Found` on `playwright.azureedge.net`). Visual responsiveness was verified via exhaustive inspection of CSS media queries and component code rather than automated live screenshot capture.
2. **Hosted Production Deployment:** Inspection was conducted entirely on the local Linux workspace. No public cloud deployment URL was active or configured in the repository.
3. **Live Supabase Synchronization:** The hosted Supabase instance (`cajrbzfsfsimxweomrlt.supabase.co`) was unverified because no service-role secret key was provided in the environment.

---

## 15. Final Factual Verdict

**What Works Now:**
- Backend API server with 11 endpoint suites, complete input validation, and atomic JSON disk persistence.
- Real-time SSE telemetry pipeline broadcasting UAV movements and alert notifications.
- MediRoute START triage calculation with explainable rationales and Dijkstra hazard-aware routing.
- Responsive Neumorphic UI with dark/light themes, Canvas/SVG tactical maps, and state management.
- Comprehensive automated test suites (56 tests passing in `npm run test:all`).
- Demo reset endpoint `/api/demo/reset` restoring deterministic baseline fixtures.

**What Partly Works:**
- Offline sync: The outbox queue, local IndexedDB persistence, and backend deduplication logic work, but the frontend client sends `{ reports }` while the backend requires `{ items }`.
- GeoIntel: Multi-temporal satellite canvas and review workflow work, but AI analysis uses timed mock progression rather than executing `imageDiff.ts` on live user canvas inputs.

**What Remains Before a Reliable Demonstration:**
- Align the batch sync contract schema between `apiClient.ts` and `validators.ts` (1-line fix).
- Correct the test setup in `tests/algorithms.test.ts` to ensure 100% test pass rate across all test files.
- Add URL hash synchronization in `App.tsx` so page refreshes do not lose the active module view.
