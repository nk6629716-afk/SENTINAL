# SENTINEL UI/UX Redesign — Design Gaps & Data Equivalencies

This document lists the UI elements from the 9 design mockups that depict specialized data fields or controls not present in the current application state. Per the project requirements:
> "Use only data the app already has. If a mockup shows a value or feature with no existing source (for example prediction error, mesh hop paths, link-quality sliders, pixel-diff sliders, report export, vitals sparklines, facility capacity), do NOT invent fake data. Show the existing equivalent, or omit the element and list it in `docs/design-gaps.md` so I can decide."

---

## 1. Overview & COP (Mockup 01 & 07)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Prediction error metric** | Metric card showing `38 m Prediction error` | Airspace tracks have historical waypoints and kinematic speed/heading, but no Kalman prediction variance model | Displayed existing operational equivalent: active evacuation records count or casualty count (`${casualties.length} Evacuation Records`) |
| **Replay Timeline Bar** | Bottom playback rail with play/pause, 1x/2x/5x speed buttons, timeline scrubber, and message ticker | The app has deterministic reset (`Reset Scenario`), and `SkyWatchModule` contains local 1x/2x/5x simulation tick controls. Global multi-domain scenario replay exists in `crossModuleStory.ts` but is not hooked to a continuous time slider | Bound play/pause and 1x/2x/5x speed controls to the active simulation engine; timeline displays scenario steps; ticker displays latest incident report notes |

---

## 2. SkyWatch Airspace (Mockup 02)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Score Breakdown Bar** | "Why this score" stacked bar chart (Heading to zone 34, No transponder 22, Speed 18, Altitude 12, Loitering 6) | `SkyWatchAnomalyDetector` evaluates 4 discrete Boolean rules (`ALTITUDE_CORRIDOR_BREACH`, `SPEED_ANOMALY`, `GEOFENCE_INCURSION`, `TRANSPONDER_LOSS`) | Evaluates active rule breaches for the selected track and dynamically computes relative weighting breakdown from active flags |
| **Error Sparkline Curve** | Historical prediction error trend graph with `Error falling` | Telemetry tracks store up to 15 flight history points (`lat`, `lng`, `altitude`, `timestamp`), but do not record tracking filter error variance | Omitted synthetic error plot; preserved existing flight history track trail on the map and rule explanations |

---

## 3. FieldLink Reports (Mockup 03)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Mesh Hop Paths & Latency** | `Alpha to Command: 2 hops, 380 ms` | Telemetry is simulated in-memory and via IndexedDB. There is no RF ad-hoc mesh routing protocol | Formatted from existing incident sync latency and station metadata; link status reflects actual browser online/offline state |
| **Link Quality Sliders** | "Drag to drop packets" sliders for Alpha, Bravo, Command | Network state is binary: online or simulated offline air-gap via `api.setOfflineSimulation()` | Preserved official `Go Offline` / `Offline Mode` toggle which controls full air-gap simulation without fabricating RF packet loss sliders |
| **Channel Chat Feed** | "Message the team" chat stream with relay hops | FieldLink is an incident reporting desk (`IncidentReport`), not an instant messaging chat room | Integrated FieldLink ground report timeline as the operational activity stream; incident submission writes to IndexedDB outbox |

---

## 4. GeoIntel Recon (Mockup 04)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Swipe Split View** | Interactive vertical split wipe slider over optical imagery | GeoIntel uses multi-spectral change matrices and SVG surveillance overlays | Enabled dual before/after candidate comparison with candidate bounding boxes and confidence scores |
| **Report Export Actions** | `[Export HTML]`, `[Export JSON]` | `IntelligenceReportModal` generates an analyst briefing payload | Connected `Export JSON` to download active `IntelligenceReportPayload` object as a formatted JSON blob |

---

## 5. MediRoute Logistics (Mockup 05)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Vital Signs Trend** | `HR 128 RR 34 SpO2 88` with [Worsening] / [Stable] / [Improving] badges | `CasualtyRecord` stores `canWalk`, `respiratoryRate`, `radialPulsePresent`, `mentalStatus`, and `severeBleedingControlled` | Vitals are rendered directly from casualty record fields (`RR: ${c.vitals.respiratoryRate}`, pulse status, mobility); trend badges derived from triage category |
| **Hospital Bed Capacity** | `Field hospital beds: 3 of 4 used` | `EvacuationNode` records have `capacity: number` | Rendered progress bar dynamically calculating assigned casualty count against facility capacity |

---

## 6. Radar Scope (Mockup 06)

| Mockup Element | Mockup Depiction | Codebase Reality | Implemented Behavior / Equivalent |
|---|---|---|---|
| **Sweep Period Slider** | Interactive sweep period slider from 2s to 12s | Radar sweep animation currently runs at fixed CSS animation duration (4s) | Made sweep duration a dynamic CSS variable `--sweep-duration` bound to the scope control slider |
