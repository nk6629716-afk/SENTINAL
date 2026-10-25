# SENTINEL v2.6 — AI-Readable Application Reference

> **Purpose of this document**: This file is written so any AI agent can understand the complete visual design, information architecture, data flows, UI patterns, and module workflows of the SENTINEL application without seeing the source code or a live screenshot. Use this as your primary context when building on, redesigning, or extending this codebase.

---

## 1. What Is SENTINEL?

SENTINEL v2.6 is a **military-grade, multi-domain Common Operational Picture (COP) web application** designed to simulate a real-time C4ISR (Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance) command console.

It is built as a **hackathon-grade single-page application (SPA)** using React + TypeScript, Vite, and a custom neumorphic CSS design system. It runs fully **offline-first** using IndexedDB as its primary data store and simulates a WebSocket telemetry bus via deterministic in-memory fixtures.

The app has **five distinct screens** (modules), accessible via a fixed left sidebar:

| Module Key | Label | Icon | Code |
|---|---|---|---|
| `dashboard` | Overview & COP | Layers | `COP` |
| `fieldlink` | FieldLink Reports | Radio | `FLK` |
| `skywatch` | SkyWatch Airspace | Crosshair | `SKY` |
| `geointel` | GeoIntel Recon | Compass | `GEO` |
| `mediroute` | MediRoute Logistics | HeartPulse | `MED` |

---

## 2. Visual Design System

### 2.1 Design Philosophy

SENTINEL uses a **custom neumorphic editorial design** — not a generic dashboard template. The aesthetic philosophy:

- **Neumorphic surfaces**: Cards appear "raised" from the background using dual-directional soft box-shadows (light from top-left, dark from bottom-right). Inputs and recessed panels use inset shadows.
- **Military C4ISR instrument aesthetic**: Monospace typography for data, status badges, timestamps, and coordinates. Clean grid lines and radar-inspired chrome.
- **Asymmetric editorial layout**: The dashboard uses a 3-column grid at the top (2:1 ratio), not a boring even grid.
- **Premium dark mode by default**: The system follows OS preference (`system` mode) but defaults toward the deep obsidian dark theme.
- **No placeholders**: Every data element is real, driven by IndexedDB-seeded fixtures.

---

### 2.2 Dual-Theme Engine

The app ships two complete themes, toggled from the header via a 3-button segmented control (Auto / Light / Dark):

#### Dark Theme — "Deep Obsidian C4ISR Command Center"

This is the primary visual mode. The background is near-black with a blue tint.

| Token | Value | Purpose |
|---|---|---|
| `--surface` | `#0A0E17` | Page background (deep obsidian) |
| `--surface-raised` | `#111827` | Card surfaces — slightly raised |
| `--surface-elevated` | `#162235` | Elevated panels, dropdowns |
| `--surface-inset` | `#060910` | Recessed inputs, inset containers |
| `--surface-card` | `#111827` | Card background |
| `--text-primary` | `#F1F5F9` | Main readable text (near-white) |
| `--text-secondary` | `#94A3B8` | Labels, subtitles, meta |
| `--text-muted` | `#64748B` | Timestamps, monospace metadata |
| `--accent` | `#38BDF8` | Sky blue — primary interactive color |
| `--healthy` | `#10B981` | Green status indicator |
| `--warning` | `#F59E0B` | Amber warning |
| `--critical` | `#EF4444` | Red alert / critical priority |
| `--informational` | `#60A5FA` | Blue informational |
| `--radar-beam` | `#00F2FE` | Bright cyan radar sweep beam |
| `--radar-glow` | `rgba(0,242,254,0.55)` | Radar bloom glow |

Shadow recipe (dark mode cards):
- **Raised**: `0 4px 20px -2px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)`
- **Inset**: `inset 0 2px 6px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)`

#### Light Theme — "Crisp Aerospace Titanium"

| Token | Value | Purpose |
|---|---|---|
| `--surface` | `#F8FAFC` | Page background (cool off-white) |
| `--surface-raised` | `#FFFFFF` | Card surfaces |
| `--surface-inset` | `#F1F5F9` | Recessed inputs |
| `--text-primary` | `#0F172A` | Near-black text |
| `--accent` | `#0284C7` | Deep sky blue |
| `--radar-beam` | `#0284C7` | Radar beam (blue in light) |

Shadow recipe (light mode cards):
- **Raised**: `0 4px 14px -2px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.05)`
- **Inset**: `inset 0 2px 4px rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.04)`

---

### 2.3 Typography System

| Role | Family | Weight | Size |
|---|---|---|---|
| Body / UI | `Inter` (Google Fonts) | 400-700 | 14px base |
| Headings | `Inter` | 800 | 1.1rem-1.4rem |
| Monospace data | `JetBrains Mono` | 600-800 | 0.68rem-0.84rem |

Monospace (`--font-mono`) is used exclusively for:
- IDs and reference codes (e.g., `REF: INC-001`)
- Coordinates (lat/lng)
- UTC timestamps
- Badge codes (`COP`, `FLK`, `SKY`, `GEO`, `MED`)
- Status labels (`COMMAND LINK SYNCHRONIZED`)
- Radar technical readouts

Heading letter-spacing: `-0.02em` (slightly compressed, magazine editorial).

---

### 2.4 Geometry & Spacing

| Token | Value |
|---|---|
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `14px` |
| `--radius-xl` | `20px` |
| `--radius-pill` | `9999px` |
| `--header-height` | `64px` |
| `--sidebar-width` | `260px` |

Cards (`neu-card`): `--radius-lg` corners, `--shadow-raised`, `--surface-raised` background.
Small cards (`neu-card-sm`): same pattern with compact padding.
Inset panels (`neu-inset`): `--shadow-inset`, `--surface-inset` background.

---

### 2.5 Status Badge System

Badges (`badge-neu`) are pill-shaped label chips used throughout the UI for quick categorical status signals:

| Class | Color | Meaning |
|---|---|---|
| `badge-neu-ok` | Green `--healthy` | Nominal / verified / safe |
| `badge-neu-warn` | Amber `--warning` | Warning / pending |
| `badge-neu-crit` | Red `--critical` | Critical / breach |
| `badge-neu-info` | Blue `--informational` | Informational / active |
| `badge-neu-neutral` | Muted grey | Neutral / synced / default |

Badges appear in: module labels, incident priority chips, step phase indicators, status chips in sidebar and header.

---

### 2.6 Button System

All buttons use the `btn-neu` class family with variants:

| Class | Style | Use |
|---|---|---|
| `btn-neu` | Raised neumorphic surface | Default action |
| `btn-neu-sm` | Compact, pill-radius | Header / sidebar actions |
| `btn-neu-primary` | Accent-colored border + glow | Primary CTA |
| `btn-neu-critical` | Red border | Destructive / offline mode |

All buttons have hover lift animation and focus ring for accessibility.

---

## 3. Application Shell Layout

```
+-----------------------------------------------------------------+
|  HEADER  [SENTINEL v2.6 badge] [Module Title] ... [Controls]   |  height: 64px, sticky, z-index: 30
+--------------+--------------------------------------------------+
|              |                                                  |
|   SIDEBAR    |            MAIN CONTENT AREA                    |
|  width:260px |          (active module view)                   |
|              |                                                  |
|  [Logo]      |  padding: 24px, flex-col, max-width: 1440px     |
|  [Nav items] |                                                  |
|  [Health]    |                                                  |
+--------------+--------------------------------------------------+
```

---

## 4. Header — CommandHeader.tsx

**Visual description**: A sticky horizontal bar spanning the full viewport width. Background is `--surface-raised`. Bottom border separates it from content. Box shadow adds subtle depth.

### Left side (branding + context):
1. **SENTINEL v2.6 badge** — pill-shaped, monospace font, sky-blue accent border, green pulsing LED dot (8px circle with glow), glowing box-shadow. Always visible regardless of active module.
2. **Module tag** — monospace muted text showing current context (e.g., `/ AIR DEFENSE & RADAR`).
3. **Module title** — large `h1` (1.35rem, weight 800) in primary text color.
4. **Module subtitle** — small grey description paragraph (0.78rem).

### Right side (controls):
1. **Theme segmented control** — 3 toggle buttons (Auto / Light / Dark) in an inset pill container. Active button gets raised shadow + accent color.
2. **Live UTC clock** — inset pill, monospace, clock icon in accent color, updates every second.
3. **"Go Offline" / "Offline Mode" button** — turns red (critical) when offline is active, shows WifiOff icon.
4. **Sync button** — primary-accented when pending records exist, shows count in parentheses.
5. **Reset Scenario button** — warning-colored reset icon.

---

## 5. Sidebar — Sidebar.tsx

**Visual description**: Fixed left column, `260px` wide. Background matches `--surface-raised`. Right-side shadow (`--shadow-sidebar`). Contains three vertical zones.

### Zone 1 — Brand masthead:
- **Custom technical emblem** (38x38px): inset square tile with a 3-layer polygon SVG icon (resembling stacked data layers). Accent-colored icon.
- **"SENTINEL"** — 1.25rem, weight 800, near-black/near-white.
- **"v2.6"** — tiny monospace accent-colored version tag.
- **"Operations Platform"** — small secondary label.
- **"TACTICAL SITUATIONAL ENGINE"** — neutral badge chip.

### Zone 2 — Navigation:
Section label: `OPERATIONAL MODULES` in uppercase monospace muted text.

Five nav buttons, each showing:
- **Icon** (Lucide icon, accent-colored when active, secondary when inactive)
- **Label** (e.g., `FieldLink Reports`)
- **Description** (tiny muted text, e.g., `Offline ground outbox`)
- **Badge chip** (red for unacknowledged alerts on SkyWatch, amber for pending sync on FieldLink)

**Active state**: left border `3px solid var(--accent)`, inset background, accent icon color, bold font weight.

### Zone 3 — System health footer:
Inset card showing:
- `TELEMETRY BUS` monospace label + Wifi/WifiOff icon
- LED dot (green/red) + status string (`Command Link Active` / `Offline Simulated`)
- `IndexedDB Storage Ready` with Database icon

---

## 6. Dashboard Module — Dashboard.tsx

The default landing screen. Shows a 5-section vertical layout inside a max-width `1440px` centered container.

### Section 1 — Situation Indicators (3-column grid, 2:1 split)

**Left panel (spans 2 cols) — "TELEMETRY NETWORK & READINESS STATE"**:
- Monospace accent label at top.
- LED dot + large status heading (`COMMAND LINK SYNCHRONIZED` or `OFFLINE AIR-GAP BUFFER`).
- Status badge chip (amber in offline, green in live).
- Descriptive paragraph explaining current mode.
- Bottom stats bar: telemetry counts separated by dots (e.g., `8 Airspace Tracks . 5 Ground Incidents . 4 Evacuation Records . 6 Road Segments`).

**Right column (1 col) — 3 stacked metric cards**:
Each card (`neu-card-sm`) has a colored left accent border:
1. **Airspace Heuristics** — unacknowledged alert count, `BREACH` / `CLEAR` badge.
2. **Evacuation & Casualties** — critical casualty + blocked hazard count.
3. **Ground Outbox Sync** — pending incident reports count, `OUTBOX` / `SYNCED` badge.
All three are clickable and navigate to their respective modules.

### Section 2 — Critical Incident Spotlight

A full-width card with red `4px` left border. Contains:
- `CRITICAL INCIDENT SPOTLIGHT` badge + incident ID + source module badge.
- Clock icon + logged timestamp.
- Large incident title (weight 800).
- Incident notes paragraph.
- Location display with MapPin icon: name + lat/lng coordinates.
- `Inspect in FieldLink` primary action button.

Only renders if a `critical` priority incident exists.

### Section 3 — Cross-Domain Mission Sequence

A full-width card showing a **5-step operational demonstration rail** for hackathon judges. Explains how a single ground event propagates through all 4 modules.

Header row: monospace "CROSS-DOMAIN MISSION SEQUENCE" label + title + step counter badge + `Next Step` button.

Below: **5 equal-width cards** (auto-fill grid, min 210px):
- Phase number (`PHASE 01`-`05`) in monospace.
- Status badge: `VERIFIED` (completed, green), `ACTIVE NOW` (current, blue), or domain tag (`GROUND`, `LOGISTICS`, etc.) (future, neutral).
- Step title.
- Step description (0.72rem grey text).

The active step has inset background + blue left border. Completed steps have green left border. Clicking any step navigates to that module.

### Section 4 — Common Operational Picture (COP) — Full-Width Radar Map

A full-width card (`100%`, `680px` height) containing the `TacticalMap` component (see Section 8).

Header: `Common Operational Picture (COP)` with Layers icon + badge chips showing live counts.

Below the map: if the user clicked a map entity, an **entity inspection card** slides in showing type, ID, name/callsign, notes, and a `Open in Dedicated Module` button.

### Section 5 — Operational Activity Feed

A full-width card below the radar map. Shows a **chronological multi-source event log** combining all airspace alerts and ground incidents sorted by newest first.

Each entry is an inset card (`neu-inset`) with:
- Source module badge (color-coded by priority: red=critical, amber=high, blue=info).
- Monospace UTC timestamp.
- Event title (bold).
- Notes paragraph.

Cards flow in a `repeat(auto-fill, minmax(320px, 1fr))` responsive grid.

---

## 7. Module Screens

### 7.1 FieldLink — Ground Reports (FieldLinkModule.tsx)

**Purpose**: Offline-first incident intake and outbox management.

**Key UI elements**:
- Incident report form (title, location, priority, notes) that writes to IndexedDB.
- Incident list showing all reports with sync status badges (`pending`, `synced`, `failed`).
- Outbox queue with individual record retry controls.
- Offline mode indicator banner.

**Data flow**: User submits form -> writes to `dbService` IndexedDB -> appears with `pending` status -> on sync trigger, batch uploads -> status changes to `synced`.

---

### 7.2 SkyWatch — Airspace Security (SkyWatchModule.tsx)

**Purpose**: Real-time airspace surveillance, geofence rule evaluation, and alert acknowledgment.

**Key UI elements**:
- Table of `TelemetryTrack` records: callsign, type (drone/helicopter/aircraft), altitude, speed, coordinates, status.
- Airspace alert list with rule name, severity badge, and explanation text.
- Restricted zone cards showing no-fly zone names and radii.
- Acknowledge button on each unacknowledged alert.

**Data flow**: Tracks come from seeded IndexedDB -> rule engine checks altitude/zone intersection -> alerts generated with explanations -> operator acknowledges.

---

### 7.3 GeoIntel — Reconnaissance (GeoIntelModule.tsx)

**Purpose**: Multi-spectral satellite change detection and analyst candidate review.

**Key UI elements**:
- `GeoIntelObservation` list: each observation has a location, type (road/bridge/structure), change score, confidence level.
- Analyst review panel: accept or reject candidates.
- Change visualization with difference score bar.

**Data flow**: Observations seeded from IndexedDB -> scored by change detection algorithm -> analyst can review and mark as confirmed/dismissed.

---

### 7.4 MediRoute — Casualty & Evacuation Logistics (MediRouteModule.tsx)

**Purpose**: START triage scoring and Dijkstra hazard-aware evacuation routing.

**Key UI elements**:
- Casualty list with triage category badges (`immediate`, `delayed`, `minimal`, `expectant`).
- Evacuation node map (hospital/aid station facilities).
- Road hazard edge list (blocked segments).
- `Calculate Route` button that runs the Dijkstra algorithm and renders an `activeRoute` on the TacticalMap.

**Data flow**: `CasualtyRecord[]` + `EvacuationNode[]` + `RoadHazardEdge[]` -> Dijkstra algorithm finds shortest path avoiding blocked segments -> route rendered as glowing green path on map.

---

## 8. TacticalMap Component (TacticalMap.tsx)

The most visually complex component. It is a **full SVG-rendered military PPI (Plan Position Indicator) radar scope** with custom projection, interactive controls, and animated sweep beam.

### 8.1 Visual Structure

The radar map is rendered inside a `div` container with:
- Background: `--map-canvas` color (near-black in dark mode)
- Border-radius: `--radius-lg`
- Full-width, configurable height (default `680px`)

**The SVG** has a `1000x680` viewBox and contains all tactical layers.

### 8.2 PPI Radar Scope

**The radar scope is a circular CRT-style instrument** centered on the SVG:
- **CRT bezel outer ring** — dark border with subtle highlight
- **360 degree azimuth compass dial** — tick marks every 10 degrees (long) and 5 degrees (short), degree labels every 30 degrees in monospace
- **4 concentric range rings** — subtle cyan/blue lines at regular intervals
- **Grid crosshairs** — horizontal and vertical center lines
- **Rotating sweep beam** — triangular wedge shape, animated 360 degree rotation, gradient fade from bright cyan to transparent
- **Phosphor persistence** — 4 semi-transparent historical sweep wedges trailing the current beam position, decaying in opacity (simulating CRT phosphor afterglow)

**Controls** (overlay buttons in the bottom-right of the map):
- Zoom In / Zoom Out — increments zoom state between `0.4x` and `4.5x`
- Reset — resets zoom and pan to default
- Fullscreen — toggles fullscreen presentation
- Radar mode toggle (PPI / FLIR / TOPO) — changes the visual color palette of the scope

**Mouse interactions**:
- **Wheel scroll**: zooms in/out centered on cursor
- **Click-drag**: pans the map
- **Entity click**: emits `onSelectEntity` callback with entity data

### 8.3 Entity Layer Rendering

All entities are projected from geographic coordinates (`lat`, `lng`) to SVG coordinates using a linear projection function.

| Layer | Shape | Color |
|---|---|---|
| `RestrictedAirspaceZone` | Circle + dashed border | Red/amber with fill opacity |
| `TelemetryTrack` (aircraft) | Triangle symbol | Cyan `--accent` |
| `TelemetryTrack` (drone) | Diamond symbol | Amber `--warning` |
| `IncidentReport` | Circle with pulse ring | Critical red |
| `EvacuationNode` (hospital) | Cross icon | Green `--healthy` |
| `RoadHazardEdge` | Line segment | Red if blocked, grey if open |
| Active route | Highlighted line segments | Glowing green |

Each entity renders a **FDB (Flight Data Block)** style label on hover: a small data block showing callsign/ID, type, and key metric.

### 8.4 Layer Toggle Panel

A floating layer control panel (top-left overlay) with checkboxes for:
- Incidents
- Airspace
- Zones
- Routes
- Grid
- Range Rings
- Terrain

### 8.5 Coordinate Readout

Bottom-left overlay shows live mouse coordinates in military format:
- Latitude (e.g., `34.0600 N`)
- Longitude (e.g., `118.2450 W`)
- Elevation (e.g., `84m MSL`)

---

## 9. Data Architecture

### 9.1 Core Data Types (from shared/types.ts)

| Type | Description |
|---|---|
| `IncidentReport` | Ground field report: title, location (lat/lng/name), priority, notes, syncStatus |
| `TelemetryTrack` | Airspace track: callsign, type, altitude, speed, heading, lat/lng |
| `AirspaceAlert` | Rule violation alert: ruleName, severity, explanation, acknowledged |
| `RestrictedAirspaceZone` | No-fly zone: name, center lat/lng, radius |
| `GeoIntelObservation` | Satellite observation: location, changeScore, type, confidence |
| `CasualtyRecord` | Casualty: triageCategory (immediate/delayed/minimal/expectant), status |
| `RoadHazardEdge` | Road segment: from/to nodes, blocked boolean, distance |
| `EvacuationNode` | Facility: name, type (hospital/aid), lat/lng, capacity |
| `DashboardSummary` | Aggregate stats: incident count, alert count, active tracks |
| `CalculatedRoute` | Dijkstra result: ordered list of node IDs and total distance |

### 9.2 Services

| Service | File | Role |
|---|---|---|
| `api` | `src/services/api/apiClient.ts` | All data reads/writes. Switches between IndexedDB and simulated network. |
| `dbService` | `src/services/storage/indexedDb.ts` | IndexedDB CRUD operations, seeding, and baseline reset. |
| `themeService` | `src/services/theme/themeService.ts` | Manages `data-theme` attribute on html element, subscriber pattern. |

### 9.3 State Flow

```
App.tsx (root)
  +-- refreshAllData() -> calls all 8 api methods in parallel
  +-- Passes data as props to Dashboard, FieldLink, SkyWatch, GeoIntel, MediRoute
  +-- dbService.seedDefaultFixturesIfEmpty() on boot
  +-- window.online/offline events -> auto refreshes
  +-- handleResetDemo() -> calls dbService.resetToDeterministicBaseline() -> refreshAllData()
```

All state lives in `App.tsx` as React `useState`. No external state library (no Redux, no Zustand).

---

## 10. Algorithms

Located in `src/algorithms/`:

| Algorithm | File | Description |
|---|---|---|
| Dijkstra routing | `dijkstra.ts` | Shortest path on `RoadHazardEdge` graph. Blocked edges have infinite cost. Produces `CalculatedRoute`. |
| START triage | `triage.ts` | Assigns `triageCategory` based on respiration rate, pulse, and consciousness. |
| Airspace rule engine | `airspaceRules.ts` | Evaluates `TelemetryTrack` against zone boundaries and generates `AirspaceAlert` with explanation. |
| Change detection | `changeDetection.ts` | Scores `GeoIntelObservation` by spectral difference magnitude. |

---

## 11. Build & Development

| Command | Purpose |
|---|---|
| `npm run dev -- --host` | Dev server (Vite), exposes on local network |
| `npm test` | Runs 9 Vitest unit tests covering algorithms and API contracts |
| `npm run build` | Production bundle |

**Path aliases**: `@shared/*` maps to `../shared/*` (workspace root `shared/` directory).

**Tech stack**: React 18, TypeScript, Vite, Lucide-React icons, IndexedDB (native), Vitest, CSS custom properties (no Tailwind, no CSS-in-JS library beyond inline styles).

---

## 12. Git Branch Strategy

- `main` — production-stable integration branch
- `feature/person-1-frontend` — Person 1's frontend work
- Future branches for Person 2 (backend API) and Person 3 (infra/testing) merge into `main`

---

## 13. Quick Visual Cheatsheet

### Dark Mode Visual Hierarchy
```
Background:     #0A0E17  (near-black, deep navy)
Cards:          #111827  (raised, slightly lighter)
Inset areas:    #060910  (darker than bg, recessed)
Primary text:   #F1F5F9  (near-white)
Labels/meta:    #94A3B8  (cool grey)
Timestamps:     #64748B  (muted)
Accent:         #38BDF8  (sky blue -- hover, active, badges)
Healthy:        #10B981  (green -- online, nominal)
Warning:        #F59E0B  (amber -- pending, caution)
Critical:       #EF4444  (red -- alerts, offline, blocked)
Radar:          #00F2FE  (bright cyan -- sweep beam, glow)
```

### Light Mode Visual Hierarchy
```
Background:     #F8FAFC  (cool off-white)
Cards:          #FFFFFF  (pure white raised)
Inset areas:    #F1F5F9  (slightly grey recessed)
Primary text:   #0F172A  (near-black)
Accent:         #0284C7  (deeper sky blue)
Radar:          #0284C7  (blue scope)
```

---

## 14. Interaction Patterns

| Interaction | Behavior |
|---|---|
| Click sidebar nav item | Switches active module, closes mobile menu |
| Click metric card (right column) | Navigates to that module |
| Click mission step | Sets active step + navigates to module |
| Click "Next Step" | Advances demo step sequentially |
| Click map entity | Shows entity inspection card below map |
| Click "Open in Dedicated Module" | Navigates to owning module |
| Mouse wheel on radar map | Zooms in/out (0.4x to 4.5x) |
| Click-drag on radar map | Pans the map view |
| Toggle offline button | Simulates radio blackout, writes queue locally |
| Click Sync button | Uploads pending outbox queue |
| Click Reset Scenario | Confirms + reseeds IndexedDB with baseline data |
| Theme toggle (Auto/Light/Dark) | Applies `data-theme` to html, CSS variables switch |

---

*This document was generated to serve as a persistent, machine-readable specification of the SENTINEL v2.6 application. Update this file whenever significant visual or architectural changes are made.*
