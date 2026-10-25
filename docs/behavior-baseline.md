# SENTINEL v2.6 — Behavior Baseline (Phase 0 Freeze)

This document establishes the exact behavioral contracts, mechanisms, algorithms, data flows, and state models of the SENTINEL application before UI/UX redesign. In accordance with the project specification:
> **Source of Truth**: Attached mockups govern presentation and visual layout; `SENTINEL.md` and the existing codebase govern all functional behavior and data flows. Where mockups disagree with code logic, behavior is strictly preserved from code.

---

## 1. TacticalMap & Radar Scope

### 1.1 Radar Sweep & Visual Dynamics
- **Sweep rotation**: Continuous 360-degree beam sweep rendered via SVG/CSS animation (`radar-sweep-rot` at 4.0s per revolution, or variable sweep speed).
- **Phosphor trail**: 4 trailing wedge paths rendered with diminishing opacity (e.g. 25%, 15%, 8%, 3%) to emulate CRT phosphor decay behind the sweeping line.
- **Range rings**: 4 concentric distance circles rendered at fixed tactical intervals (5 km, 10 km, 15 km, 20 km) centered on the radar origin.
- **Azimuth dial**: Outer compass bezel ring with millimeter tick marks at 5° and 10° intervals, and degree heading numerals printed at 30° intervals: `000`, `030`, `060`, `090`, `120`, `150`, `180`, `210`, `240`, `270`, `300`, `330`.

### 1.2 Viewport Navigation, Pan, and Zoom
- **Wheel zoom**: Mouse wheel scrolling increments or decrements zoom scale clamped strictly between `0.4x` (wide tactical sector) and `4.5x` (high-magnification local reconnaissance) centered on mouse pointer position.
- **Drag pan**: Left-click and drag translates viewport coordinates `pan.x` and `pan.y` with active grabbing cursor.
- **Reset button**: Restores zoom level to `1.0x` and centers pan coordinates to `{ x: 0, y: 0 }`.
- **Fullscreen button**: Toggles full-viewport immersion mode without modifying map state or scale.

### 1.3 Radar Display Modes
- **Mode Mapping**:
  - `Chart` (Mockup) -> `TOPO / Terrain` (Code): Topographical contour and terrain base with green/amber tactical accents.
  - `Radar` (Mockup) -> `PPI / Scope` (Code): Standard military Plan Position Indicator CRT display with cyan/amber radar beam and range rings.
  - `Thermal` (Mockup) -> `FLIR / IR` (Code): High-contrast infrared heat-signature visualization with red/orange thermal styling.

### 1.4 Layer Toggles
- Independent visibility controls for 7 tactical layers:
  1. `incidents`: Ground incident markers, incident radius, and status badges.
  2. `airspace`: Airspace telemetry tracks, heading vectors, and altitude blocks.
  3. `zones`: Restricted airspace circles and no-fly geofences.
  4. `routes`: Primary and secondary evacuation road corridors.
  5. `grid`: Tactical coordinate grid lines and sector divisions.
  6. `rangeRings`: Radar distance rings and azimuth markings.
  7. `terrain`: Contour lines and natural geographic features.

### 1.5 Coordinate Readout & Projection Math
- **Linear Mercator-like projection**:
  - Center: Los Angeles Tactical Sector (`lat: 34.0600° N`, `lng: -118.2450° W`).
  - Base scale: `11,000 * zoom`.
  - SVG viewBox: `1000 x 680`.
  - Formula:
    `x = 500 + (lng - centerLng) * scale + pan.x`
    `y = 350 - (lat - centerLat) * scale + pan.y`
- **Live cursor coordinate readout**: Tracks mouse movement over canvas, continuously unprojects SVG coordinates to latitude/longitude, and displays formatted coordinates:
  - Latitude: `34.0600 N`
  - Longitude: `118.2450 W`
  - Elevation: `84 m MSL` (deterministic geodetic elevation calculation)

### 1.6 Entity Interaction & Inspection
- **Flight Data Block (FDB) hover**: Hovering any entity renders an overlay data tag displaying callsign, aircraft type, altitude, speed, or incident priority.
- **Entity selection**: Clicking an entity emits `onSelectEntity({ type, id, raw })`.
- **Inspection card**: Displays selected asset details and an action button `"Open in Dedicated Module"`, which navigates directly to the owning module (`skywatch`, `fieldlink`, `mediroute`, or `geointel`).

---

## 2. Simulation & Data Engine

### 2.1 Telemetry Bus
- Deterministic in-memory simulated telemetry bus providing updates for airspace tracks, ground reports, satellite observations, and evacuation nodes.
- Polls or triggers state refresh via `apiClient.ts` to `App.tsx` top-level state.

### 2.2 IndexedDB Storage & Seeding
- Native client-side IndexedDB database (`SENTINEL_DB`) with dedicated object stores for all core entities.
- `dbService.seedDefaultFixturesIfEmpty()` executes on boot: verifies existing record counts and safely populates initial fixtures if empty.
- Zero external backend required for full standalone offline operation.

### 2.3 Reset Scenario
- Action button in command header.
- Prompts operator confirmation.
- Executes `api.resetDemoBaseline()` which invokes `dbService.resetToDeterministicBaseline()`.
- Flushes custom state, repopulates baseline incidents, resets road hazards to open state, resets triage records, and calls `refreshAllData()`.

### 2.4 Offline Air-Gap Mode & Network Listeners
- Operator manual toggle `"Go offline"` / `"Offline Mode"`.
- Hardware browser listeners for `window.addEventListener('online')` and `'offline'`.
- Switches `api.setOfflineSimulation(true/false)`.
- When offline:
  - Header button displays critical alert styling (`Offline Mode`).
  - New reports filed in FieldLink receive `syncStatus: 'pending'` and are queued in IndexedDB.
  - Telemetry continues running in local air-gap mode without errors.

### 2.5 Outbox Queue, Sync, and Idempotent Retry
- `pendingSyncCount` dynamically computed from incidents with `syncStatus === 'pending' | 'failed'`.
- Header and sidebar display amber pending count badges when records are waiting.
- `"Sync"` action triggers `api.syncPendingQueue()`:
  - Iterates queued items.
  - Validates unique idempotency hash keys (`clientId` + timestamp).
  - Simulates batch reconciliation, marking successfully delivered records as `'synced'`.
  - Failed records transition to `'failed'` and expose single-item `"Retry"` actions.

---

## 3. Algorithmic Decision Engines

### 3.1 Airspace Rule Engine (`SkyWatch`)
Evaluates live telemetry tracks against airspace safety heuristics:
1. **Rule 1 - Altitude Corridor Breach**: Checks whether track altitude violates maximum floor/ceiling constraints for its sector.
2. **Rule 2 - Speed Anomaly**: Detects velocity spikes exceeding normal flight envelope (e.g. UAV acceleration > 120 kts).
3. **Rule 3 - Geofence Incursion**: Calculates Haversine distance from track position to restricted airspace zone centers; triggers breach alert when distance <= zone radius.
4. **Rule 4 - Transponder Loss**: Identifies tracks with stale or dropped transponder beacons.
- Every generated alert includes an explainable natural-language rationale and priority classification (`critical`, `high`, `medium`).

### 3.2 Change-Detection Scoring (`GeoIntel`)
1. **Spectral Matrix Differencing**: Compares pixel values across co-registered multi-temporal baseline and surveillance imagery passes.
2. **Thresholding & Connected Components**: Applies spatial convolution kernel (e.g. 5x5) and BFS connected-components search to cluster contiguous anomalous pixels.
3. **Bounding Box Extraction & Scoring**: Computes bounding box geometry, anomaly magnitude score (0.0 to 1.0), and neural classification confidence.
4. **Analyst Review Workflow**: Operators can inspect candidates and formally record an audit trail decision (`Accept / Confirm Threat` or `Reject / Dismiss`).

### 3.3 START Algorithmic Triage Engine (`MediRoute`)
Implements the Simple Triage and Rapid Treatment (START) standard:
- **Step 1 (Ambulatory)**: If patient can walk -> `MINIMAL` (Green, Rule 1).
- **Step 2 (Respiration)**:
  - If respiratory rate is 0 -> `EXPECTANT` (Black, Rule 2).
  - If respiratory rate > 30 or < 10 -> `IMMEDIATE` (Red, Rule 3).
- **Step 3 (Perfusion)**:
  - If radial pulse absent or severe bleeding uncontrolled -> `IMMEDIATE` (Red, Rule 4).
- **Step 4 (Mental Status)**:
  - If unable to follow simple commands / unresponsive -> `IMMEDIATE` (Red, Rule 5).
- **Step 5 (Stable Non-Ambulatory)**:
  - If breathing normally, radial pulse present, can follow commands, but cannot walk -> `DELAYED` (Yellow, Rule 6).

### 3.4 Dijkstra Hazard-Aware Routing Engine (`MediRoute`)
- Graph representation: Vertices are casualty collection points (CCPs), road junctions, aid stations, and field hospitals. Edges are road segments with distances in kilometers.
- Road blockages: Toggling a hazard sets edge weight to infinity (`blocked: true`).
- Path calculation: Priority-queue Dijkstra algorithm identifies shortest traversable path from origin CCP to target medical facility avoiding all blocked edges.
- Reroute detection: Dynamically computes detour distance (+km), updated ETA, and alerts operator of active diversion.

### 3.5 Threat Scoring
- Multi-factor heuristic score (0-99) ranking airspace contacts by urgency based on heading angle toward restricted zones, ground velocity, transponder status, and loiter patterns.

---

## 4. UI Behaviors & Shell State

### 4.1 Theme Engine (Auto / Light / Dark)
- Controlled via `themeService.ts`.
- Supported states:
  - `'light'`: Day Chart theme.
  - `'dark'`: Night Tactical Red-Light theme.
  - `'auto'`: System preference via `matchMedia('(prefers-color-scheme: dark)')`.
- Sets `data-theme` attribute on document root (`<html>`).
- Persists user selection in `localStorage` (`'sentinel_theme_mode'`) inside `try/catch`.

### 4.2 Module Navigation
- Fixed order of 5 modules:
  1. `dashboard`: Overview & COP (`COP`)
  2. `fieldlink`: FieldLink Reports (`FLK`)
  3. `skywatch`: SkyWatch Airspace (`SKY`)
  4. `geointel`: GeoIntel Recon (`GEO`)
  5. `mediroute`: MediRoute Logistics (`MED`)
- Navigation updates `activeModule` in `App.tsx` and closes mobile drawer when open.

### 4.3 Sidebar Minimize & Collapse
- Collapsed width: 76 px. Expanded width: 240 px.
- Toggle button at top-right of masthead (`ChevronLeft` / `ChevronRight`).
- Global keyboard shortcut: `Ctrl+B` or `Cmd+B`.
- Minimized view shows emblem, toggle button, icon-only navigation with hover/focus tooltips, badge dots, and compact health card.
- Persisted in `localStorage` (`'sentinel_sidebar_collapsed'`) inside `try/catch`.
- Under 900 px: transitions to off-canvas drawer with backdrop overlay.

### 4.4 Mission Sequence Stepper & Next Step
- 5 operational phases representing cross-domain propagation of an emergency scenario.
- `"Next step"` button advances phase sequentially (`1 -> 2 -> 3 -> 4 -> 5 -> 1`) and automatically switches view to corresponding operational module.

### 4.5 Airspace Alert Acknowledgment
- Operator clicks `"Acknowledge"` on unacknowledged alert.
- Calls `api.acknowledgeAlert(alertId, operatorName)`.
- Re-evaluates unacknowledged alert count and updates sidebar badge count in real time.

### 4.6 Observation Candidate Review
- Analyst clicks `"Accept"` or `"Reject"` on GeoIntel candidates.
- Updates candidate status and logs audit event with analyst identity.

### 4.7 Road Hazard Toggle & Dynamic Reroute
- Operator clicks `"Block"` / `"Unblock"` on road hazard list.
- Calls `api.toggleRoadBlockage(edgeId, !currentBlocked)`.
- If active route is present, immediately triggers route recalculation.

---

## 5. Summary of Baseline Verification
All above mechanisms have been verified against active source code and validated with automated tests. The redesign in Phases 1 through 3 strictly preserves all props, callbacks, algorithm logic, and state models.
