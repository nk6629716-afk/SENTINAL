# SENTINEL UI/UX Bug-Fix, Cleanup & Responsiveness Pass — Changes Log

**Target Application**: SENTINEL Redesigned Operations Platform  
**Deployment**: [falcon-forge.netlify.app](https://falcon-forge.netlify.app)  
**Verification Date**: 2026-10-26 (Asia/Kolkata, IST)  
**Contract Test Suite Status**: 48 / 48 Passed (100%)  
**TypeScript Compilation**: 0 Errors (`npx tsc --noEmit`)  
**Frontend Production Build**: Clean (`vite build` succeeded in 9.82s)

---

## 1. Architectural Guardrails & Preserved Core Mechanisms

As specified in the operational requirements, **no core mechanisms, data models, or algorithms were altered or removed**:
- **Airspace Rule Engine**: Kinematic UAV tracking, geofence incursion, speed/altitude anomaly detection preserved.
- **START Triage Logic**: Algorithmic casualty classification (Minimal, Delayed, Immediate, Expectant) preserved.
- **Dijkstra Dynamic Routing**: Shortest-path routing, hazard-edge avoidance, and route recalculation preserved.
- **IndexedDB & Sync Outbox**: Client ID generation, idempotency hash, offline queuing, retry backoff, and sync reconciliation preserved.
- **TacticalMap**: Radar sweep rotation, phosphor decay trail, range rings, azimuth dial, wheel zoom (0.4x to 4.5x) centered on cursor, drag pan, and mode switching preserved.
- **Satellite Change Detection**: Matrix difference thresholding, connected components clustering, and bounding box extraction preserved.
- **Theme Switching & Shell Navigation**: Light, dark (red night-vision), auto system theme, and sidebar rail navigation preserved.

---

## 2. Phase 0 — Audits Before Editing

Two comprehensive audit artifacts were generated prior to modifying component code:
1. **[`docs/control-audit.md`](file:///c:/Falling%20Sun/fallingsun/docs/control-audit.md)**:
   - Audited every button, tab, toggle, slider, input, and link across all 5 operational modules, command header, sidebar rail, and bottom replay bar.
   - Identified covered controls (e.g. Mode Switch covered by top-left metrics panel; Block/Unblock buttons clipped on narrow hazard widths).
   - Flagged non-functional controls (e.g. Channel 4 team chat, link quality sliders, fake speed multipliers, "Report hazard" opening casualty triage instead of road hazards).
   - Documented explicit decisions: Fix, Wire to real API/state, or Remove mockup leftovers.
2. **[`docs/data-audit.md`](file:///c:/Falling%20Sun/fallingsun/docs/data-audit.md)**:
   - Catalogued every displayed numeral, metric, status badge, timestamp, and queue list.
   - Identified hardcoded mock values (e.g. `142 ms Alert latency`, `38 m Prediction error`, mock casualties CAS-03/CAS-06, fake bed usage bars, static `14:30:12` playhead).
   - Designed reactive single-source-of-truth selectors in `src/selectors/` to bind all displayed figures to real simulation/IndexedDB state.

---

## 3. Phase 1 — Overlaps & Layout Grid

### A. Non-Intersecting 4-Region Overlay Grid Layer
- Replaced floating absolute positioned cards across `TacticalMap` with a declarative 4-region CSS grid overlay:
  - `.map-overlay-layer` (`position: absolute; inset: 0; pointer-events: none; z-index: 20; display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto 1fr; grid-template-areas: "tl tr" "bl br"; padding: 14px;`)
  - `.map-overlay-tl`: Houses a unified flex toolbar (`display: flex; gap: 12px; flex-wrap: wrap; pointer-events: auto;`) containing the module metrics card and the `Chart / Radar / Thermal` Mode Switch side-by-side. On narrow screens or when sidebar expands, the Mode Switch wraps onto a second row without colliding with the metrics panel.
  - `.map-overlay-bl`: Stacks collapsible panels (Layers, Road Hazards, New Incident Report) with `max-height: calc(100% - 70px)` and internal overflow scrolling.
  - `.map-overlay-br`: Houses zoom controls (`+`, `-`, reset, fullscreen) ensuring bottom-left panels never cover zoom buttons.

### B. Collapsible Panels with Micro-Chips
- Implemented collapsible accordion state on `.overlay-collapsible-panel` for:
  - TacticalMap Layers panel
  - FieldLink New Incident Report panel
  - MediRoute Road Hazards panel
- Each panel features a title-bar chevron toggle (`ChevronDown` / `ChevronUp`).
- Automatically defaults to collapsed `.overlay-chip-btn` when viewport width $< 1100\text{px}$ or height $< 700\text{px}$, or when toggled by analyst.

### C. Right Intel Pane Geometry
- Fixed width configured to `clamp(320px, 28vw, 440px)` with `height: 100%`, sticky tabs/header (`position: sticky; top: 0; z-index: 10;`), and body `overflow-y: auto`.
- Ensures zero cut-off: all 5 mission sequence steps on Dashboard, all outbox items on FieldLink, and all Dijkstra route details on MediRoute are completely accessible via scrolling.

### D. Map ResizeObserver & Centering Preservation
- Attached a native `ResizeObserver` on `mapContainerRef` in `TacticalMap.tsx`.
- Listens for sidebar rail expand/collapse width transitions via `transitionend` events and a synchronous `requestAnimationFrame` loop during the 200ms transition.
- Dynamically updates SVG canvas measured dimensions (`width`, `height`), preserving zoom level and cursor pan offset without distorting the radar scope or geographic projection.

### E. Map Label Declutter & Evacuation Node Tooltips
- Implemented an 8-candidate leader-line offset algorithm around track markers, prioritizing:
  1. Selected entity
  2. Hostile / Critical entities
  3. Routine / Neutral entities
- Lower-priority flight data blocks automatically collapse to callsign only if space is constrained, expanding on hover/focus.
- Evacuation graph nodes on the COP now feature descriptive hover titles and tooltips:
  - `I: Intake Station Delta`
  - `F: Field Hospital Alpha`
  - `R: North Ridgeline Bypass`
  - `C: Casualty Collection Point`
- Blocked road segments render with softened stroke contrast (`rgba(224, 49, 49, 0.6)`) and dashed styling so they do not overpower active corridors.
- In Radar PPI and Thermal FLIR modes, restricted zones are cleanly clipped to the circular radar scope circumference using SVG `<clipPath id="scope-circle-clip">`.

---

## 4. Phase 2 — Data Consistency & Single Source of Truth

Created dedicated selectors in `src/selectors/`:
- [`src/selectors/alertSelectors.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/alertSelectors.ts): `selectOpenAlerts`, `selectAlertCounts`
- [`src/selectors/incidentSelectors.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/incidentSelectors.ts): `selectPendingOutbox`, `selectSyncedIncidents`
- [`src/selectors/trackSelectors.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/trackSelectors.ts): `selectRankedThreatQueue`, `calculateTrackThreatScore`
- [`src/selectors/casualtySelectors.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/casualtySelectors.ts): `selectCasualties`, `selectImmediateCasualties`, `selectCasualtiesByTriage`
- [`src/selectors/routeSelectors.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/routeSelectors.ts): `selectBlockedHazards`, `selectActiveRouteEta`, `selectRerouteCount`
- [`src/selectors/index.ts`](file:///c:/Falling%20Sun/fallingsun/src/selectors/index.ts): Barrel export

### Specific Inconsistencies Fixed:
1. **SkyWatch "Alerts 0" vs Alerts Listed**:
   - Fixed: Metric bound strictly to `selectOpenAlerts(alerts).length`.
   - Missing red alert badge on SkyWatch tab/sidebar restored.
2. **Threat Queue Mockups Removed**:
   - Removed hardcoded tracks: `"Track 07"`, `"Swarm U1 to U3/U4"`, `"Track 11"`, `"Airliner AC-48"`.
   - Threat queue dynamically constructed from real telemetry tracks (`SENTINEL-OWL-1`, `UNKNOWN-ROTARY-9`, `INTRUDER-HIGH-SPD`), ranked by calculated threat score with explainable rule breach breakdown.
   - Removed misleading text `"Scores update every second"`.
3. **FieldLink Outbox Count Inconsistency & Mock Messages**:
   - Fixed "Outbox 0" vs "3 pending": All badges and tabs bound directly to `selectPendingOutbox(incidents).length`.
   - Removed fake "Channel 4" chat stream, message input, and "Send" button.
   - Removed fake "Link quality" sliders and "Drag to drop packets" control.
   - Removed hardcoded footer `"Last sync 14:30:44 UTC, 2 sent, 0 conflicts"`.
   - Retained working New Incident Report form, Outbox queue with working `Retry` button, and `Sync Outbox Now`.
4. **MediRoute Casualties Count & Dijkstra Route Details**:
   - Fixed "Casualties 3 vs list of 4": Metric and list both bound strictly to `selectCasualties(casualties)`.
   - Removed hardcoded `mockCasualties` (`CAS-03`, `CAS-06`, `CAS-05`, `CAS-01`), fake trend sparklines ("Worsening", "Stable", "Improving"), and `"Re-scored at 14:31"` lines.
   - Display real casualty vitals and START triage reason (`cas.triageReason`).
   - Removed fake hospital and aid station bed progress bars (`"3 of 4 used"`).
   - Removed fake text `"Recalculated 14:31:48 after hazard report"`.
   - Fixed Mean ETA to display active route ETA (`selectActiveRouteEta(activeRoute)`).
   - Fixed Reroutes metric to count real dynamic recalculations (`selectRerouteCount`).
   - Fixed "Report hazard" button: previously it erroneously triggered the Casualty Triage modal! Wired "Report hazard" to open a dedicated **Report Road Hazard** modal allowing analysts to toggle edge blockage with instantaneous Dijkstra corridor recalculation.
5. **Bottom Replay Bar Real Simulation Wiring**:
   - Play/Pause button wired to `handleToggleSimPause` (`realtimeService`).
   - Removed fake speed multipliers (`1x / 2x / 5x`).
   - Replaced static scrubber and hardcoded `14:30:12` playhead with a pulsing **LIVE / PAUSED** indicator and elapsed simulation clock (`T+MM:SS`).
   - Replaced hardcoded ticker `"Alpha to Command: contact east of bridge..."` with dynamic latest activity feed event derived from real alerts, incidents, and route recalculations.
6. **Command Header Link State Consistency**:
   - Aligned link status pill with sidebar health card: Displays green `LINK ACTIVE` when online, red `OFFLINE` when air-gapped.
   - Eliminated contradictory amber `RECONNECT` pill while connection was active.

---

## 5. Phase 3 — Controls Audit Resolution

- **Mode Switch**: Chart / Radar / Thermal switch moved from absolute center to top-left flex toolbar, guaranteeing it is never covered by metrics panels on any viewport.
- **Save to Outbox**: When title is empty, disabled button displays inline validation hint: `* Title is required to save to outbox`.
- **Road Hazard Toggling**: Road names wrap cleanly (`word-break: break-word; overflow-wrap: anywhere;`) and Block/Unblock buttons have `flex-shrink: 0`, preventing button clipping.
- **Report Road Hazard Flow**: Functional modal with edge selector, Block/Clear actions, and instant route update.

---

## 6. Phase 4 — Time in Indian Standard Time (IST)

- Created [`src/utils/time.ts`](file:///c:/Falling%20Sun/fallingsun/src/utils/time.ts) exporting:
  - `formatIST(date, options)`: Uses `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` (UTC+05:30), 24-hour time labeled "IST".
  - `getLiveIST()`: Generates current live ticking IST time string for header clock (`HH:mm:ss IST`).
  - `formatISTReport(date)`: Formats full ISO strings with explicit `+05:30` offset for incident exports and reports.
- Replaced all legacy `UTC` display labels across header clock, incident cards, alert timestamps, and activity tickers. Internal timestamps remain standard ISO UTC (`toISOString()`).

---

## 7. Phase 5 — Typography & Night Vision Contrast

### A. Barlow Semi Condensed Tabular Numerals
- Slashed zeros (`18:ØØ:ØØ`, `34.Ø459`) caused by Atkinson Hyperlegible's default digit glyphs were eliminated for all numeric readouts.
- Applied Barlow Semi Condensed with `font-variant-numeric: tabular-nums` to `.numeral`, `.clock-value`, `.metric-value`, coordinates, scores, counts, and timestamps.
- Preserved Atkinson Hyperlegible for human-readable narrative body text.

### B. Night Vision (Dark) Theme Contrast
- Updated `--color-ink-2` in dark theme (`tokens.css`) to `#D58C7E`, providing $\ge 4.5:1$ contrast ratio against dark sheet surface `#1D0D0C` (satisfies WCAG AA).
- Minimum body text size enforced at 12px; helper captions at 11.5px.

---

## 8. Phase 6 — Responsive Display Architecture

### Breakpoints & Layout Matrix:
| Viewport Range | Sidebar Rail | Right Intel Pane | Map Overlay Panels | Bottom Bar / Dock |
| :--- | :--- | :--- | :--- | :--- |
| **$\ge 1280\text{px}$** | Expanded (240px) by default | Fixed `clamp(320px, 28vw, 440px)` | Expanded panels | Bottom replay bar with LIVE indicator |
| **$1024\text{px} - 1279\text{px}$** | Minimized rail (76px) by default | Fixed 320px - 340px | Expanded / auto-wrap | Bottom replay bar with LIVE indicator |
| **$768\text{px} - 1023\text{px}$** | Overlay drawer (`btn-mobile-nav`) | Responsive slide-over / bottom | Collapsed micro-chips | Compact bottom replay bar |
| **$< 768\text{px}$** | Overlay drawer | Bottom sheet with scroll | Collapsed micro-chips | 5-module bottom dock (`.mobile-bottom-dock`) |
| **Short ($< 700\text{px}$ H)** | Rail / drawer | Scrollable body | Collapsed micro-chips | Replay bar hidden; compact header (40px) |

- Added touch target padding ($\ge 44\text{px}$) on coarse pointers.
- Created Playwright responsive test suite in [`tests/layout.spec.ts`](file:///c:/Falling%20Sun/fallingsun/tests/layout.spec.ts) covering all 9 required viewports (1366x768, 1536x864, 1920x1080, 2560x1440, 1024x768, 768x1024, 844x390, 390x844, 360x640) across light and dark themes.

---

## 9. Visual Deliverables & Screenshots

All before and after screenshots have been verified and archived in [`docs/screenshots/`](file:///c:/Falling%20Sun/fallingsun/docs/screenshots):
- `before-overview-1440.png`, `after-overview-1440px.png`, `after-overview-1024px.png`, `after-overview-390px.png`
- `before-skywatch-1440.png`, `after-skywatch-1440px.png`, `after-skywatch-1024px.png`, `after-skywatch-390px.png`
- `before-fieldlink-1440.png`, `after-fieldlink-1440px.png`, `after-fieldlink-1024px.png`, `after-fieldlink-390px.png`
- `before-mediroute-1440.png`, `after-mediroute-1440px.png`, `after-mediroute-1024px.png`, `after-mediroute-390px.png`
- `after-geointel-1440px.png`, `after-geointel-1024px.png`, `after-geointel-390px.png`

---

## 10. Summary of Removed vs Preserved Elements

| Module / Component | Element Removed | Reason for Removal | Real Alternative Implemented |
| :--- | :--- | :--- | :--- |
| **Dashboard / COP** | Static timeline scrubber & `14:30:12` playhead | Fake timeline mockup with no history playback | Dynamic LIVE pulsing dot + real elapsed `T+MM:SS` timer |
| **Dashboard / COP** | Fake ticker message | Hardcoded text | Real activity feed derived from latest alert/incident |
| **SkyWatch** | Tracks 07, 11, Swarm U1, AC-48 | Mockup leftover entities | Real tracks from telemetry generator |
| **SkyWatch** | `142 ms` Alert latency, `38 m` error | Hardcoded unbacked metrics | Real open alert and threat counts |
| **FieldLink** | Channel 4 team transmission chat & Send button | Mock chat with no backend mesh implementation | Real incident outbox records with sync retry |
| **FieldLink** | Link quality sliders ("Drag to drop packets") | Fake UI slider with no socket/mesh model | Real SSE/IndexedDB sync status indicator |
| **FieldLink** | Hardcoded `"Last sync 14:30:44 UTC, 2 sent"` | Hardcoded string | Real outbox status and IST timestamps |
| **MediRoute** | Mock casualties CAS-03, CAS-06, etc. | Mockup data overriding real state | Real casualties assessed via START triage |
| **MediRoute** | Fake trend sparklines ("Worsening", "Improving") | Synthetic SVG trends with no telemetry source | Real vital signs and START rule reason |
| **MediRoute** | Hospital/aid-station bed capacity progress bars | Capacity data not present in node model | Real corridor node path and Dijkstra distance/ETA |
| **Command Header**| Amber RECONNECT pill while online | Contradicted active SSE health status | Aligned status pill: green LINK ACTIVE / red OFFLINE |
