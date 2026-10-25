# SENTINEL Control Audit (Phase 0)

Comprehensive inventory of every button, tab, toggle, slider, input, and link across all modules, headers, sidebars, and replay bars.

| Surface / Area | Element | Handler / Action | Works? | Covered / Blocked? | Decision | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Command Header** | Mobile Menu Hamburger Button | `onToggleMobileMenu` | Yes | No | **Fix** | Enable responsive drawer navigation on screens < 900px. |
| **Command Header** | Theme Mode Switcher (Sun/Auto/Moon) | `handleThemeChange` | Yes | No | **Fix** | Ensure AA 4.5:1 contrast in dark mode, preserve Atkinson body & Barlow numerals. |
| **Command Header** | Air-gap "Go offline" Toggle | `onToggleOffline` | Yes | No | **Fix** | Verified working; ensure status propagates cleanly to all modules and IndexedDB. |
| **Command Header** | "Sync" Batch Action Button | `onTriggerSync` | Yes | No | **Fix** | Wire badge and disabled state to `selectPendingOutbox(incidents)`. Show inline hint. |
| **Command Header** | Realtime Stream Pill (`RECONNECT`) | None (static indicator) | Misleading | No | **Fix** | Synchronize status with sidebar health card. Never show amber `RECONNECT` while sidebar says `Command link active`. |
| **Command Header** | "Reset scenario" Demo Button | `onResetDemo` | Yes | No | **Fix** | Verified working; restores deterministic demo baseline across all modules. |
| **Sidebar** | Expand / Collapse Chevron Button | `onToggleCollapse` | Yes | No | **Fix** | Transition smoothly, notify map container via `ResizeObserver` + rAF to prevent distortion. |
| **Sidebar** | Module Nav: Overview & COP | `onNavigate('dashboard')` | Yes | No | **Keep** | Switches active module. |
| **Sidebar** | Module Nav: FieldLink Reports | `onNavigate('fieldlink')` | Yes | No | **Fix** | Wire badge to `selectPendingOutbox(incidents)` selector. |
| **Sidebar** | Module Nav: SkyWatch Airspace | `onNavigate('skywatch')` | Yes | No | **Fix** | Wire red badge to `selectOpenAlerts(alerts)` selector so badge lights up when alerts exist. |
| **Sidebar** | Module Nav: GeoIntel Recon | `onNavigate('geointel')` | Yes | No | **Keep** | Switches active module. |
| **Sidebar** | Module Nav: MediRoute Logistics | `onNavigate('mediroute')` | Yes | No | **Keep** | Switches active module. |
| **Sidebar** | Footer Health Indicator Tile | Hover tooltip | Yes | No | **Fix** | Ensure telemetry status is strictly consistent with header SSE pill. |
| **TacticalMap** | Mode Switch (Chart / Radar / Thermal) | `setRadarMode` | Yes | **YES (Overlaps)** | **Fix** | Move out of absolute center into unified top-left flex toolbar alongside metrics panel. Always visible and clickable. |
| **TacticalMap** | Layers Panel Checkboxes (7 layers) | `toggleLayer` | Yes | **YES (Overlaps)** | **Fix** | Relocate to bottom-left overlay stack with collapse chevron. Collapsed by default below 1100px width or 700px height. |
| **TacticalMap** | Zoom In Button (`+`) | `setZoom(+1.25)` | Yes | Sometimes covered | **Fix** | Bottom-right overlay, ensure panels in bottom-left never overlap zoom controls. |
| **TacticalMap** | Zoom Out Button (`-`) | `setZoom(-0.8)` | Yes | Sometimes covered | **Fix** | Bottom-right overlay, clamped between 0.4x and 4.5x. |
| **TacticalMap** | Recenter Crosshair Button | `setZoom(1), setPan(0,0)` | Yes | No | **Keep** | Centers map to origin. |
| **TacticalMap** | Fullscreen Toggle Button | `setIsFullscreen` | Yes | No | **Keep** | Toggles viewport-filling fullscreen state. |
| **TacticalMap** | Entity Icons (Tracks, Incidents, Nodes) | `onSelectEntity` | Yes | No | **Fix** | Declutter labels with 8-offset leader placement algorithm. Truncate long labels. |
| **Dashboard** | Top-left Metrics Card | Display only | Yes | **YES (Overlaps)** | **Fix** | Combine with Mode Switch into ONE flex toolbar (`gap: 12px, flex-wrap`) in top-left region. |
| **Dashboard** | Selected Entity HUD Card | "Open in Dedicated Module" / Close | Yes | No | **Keep** | Navigates to corresponding module. |
| **Dashboard** | Mission Sequence Steps 1-5 | `handleNextStep` / step click | Yes | Cut off on short screens | **Fix** | Right intel pane `clamp(320px, 28vw, 440px)` with `overflow-y: auto`, sticky header, ensure all 5 steps are scrollable. |
| **Dashboard** | Right Intel Tabs (Alerts / Reports / Activity) | `setActiveTab` | Yes | No | **Keep** | Filter right panel lists. |
| **Dashboard** | Alert "Acknowledge" Buttons | `handleAcknowledge` | Yes | No | **Keep** | Updates alert status in state and backend. |
| **Dashboard** | Threat Queue List Items | `setSelectedEntity` | Yes | No | **Fix** | Remove hardcoded mock tracks (`Track 07`, `Swarm U1`, `Track 11`, `Airliner AC-48`). Wire to real tracks and real threat scores. |
| **Dashboard** | Replay Play / Pause Button | `setIsPlaying` | No (mock) | No | **Wire** | Wire to real simulation engine (`api.pauseSimulation()` / `api.resumeSimulation()`, `isSimPaused`). |
| **Dashboard** | Replay Speed Pills (1x, 2x, 5x) | `setSimSpeed` | No (mock) | No | **Remove** | Backend simulation does not support variable playback rates. Remove dead controls. |
| **Dashboard** | Replay Timeline Scrubber & "14:30:12" | None (static div) | No (mock) | No | **Fix** | Replace static scrubber with LIVE indicator and real simulation elapsed time. |
| **Dashboard** | Bottom Ticker Text ("Alpha to Command...") | None (static text) | No (mock) | No | **Fix** | Replace with latest real activity feed event or hide when empty. |
| **FieldLink** | Top-left Metrics Card | Display only | Yes | **YES (Overlaps)** | **Fix** | Combine with Mode Switch into top-left flex toolbar. |
| **FieldLink** | New Incident Form (Title input) | Form input | Yes | **YES (Overlaps)** | **Fix** | Move into bottom-left collapsible stack. Collapsed by default below 1100px or 700px height. |
| **FieldLink** | New Incident Form (Priority buttons) | `setPriority` | Yes | No | **Keep** | Selects low / high / critical priority. |
| **FieldLink** | New Incident Form (Location dropdown) | `setSelectedLocationIdx` | Yes | No | **Keep** | Selects target incident coordinates. |
| **FieldLink** | "Save to outbox" Button | `handleSubmit` | Yes | No | **Fix** | Add visible validation hint when Title input is empty. |
| **FieldLink** | Right Tabs (Channel 4 / Outbox / Incidents) | `setActiveTab` | No (Channel 4 is mock) | No | **Fix** | Remove fake "Channel 4" tab. Show Outbox tab and Incidents tab with real records from IndexedDB. |
| **FieldLink** | Team Message Chat Input & "Send" Button | Local state only | No (mock) | No | **Remove** | No real mesh chat backend exists. Remove mock chat input, message list, and Send button. |
| **FieldLink** | Link Quality Sliders ("Drag to drop packets") | Range input (mock) | No (mock) | No | **Remove** | Sliders do not affect networking or packet dropping. Remove dead controls. |
| **FieldLink** | Outbox "Retry" Buttons | `handleRetryItem` | No (was hardcoded) | No | **Wire** | Wire directly to real pending/failed incidents from IndexedDB with working retry sync. |
| **FieldLink** | "Sync outbox" Button | `onTriggerSync` | Yes | No | **Fix** | Wire disabled state to pending count with visible inline hint. |
| **FieldLink** | Last Sync Line ("Last sync 14:30:44 UTC...") | Static text | No (mock) | No | **Fix** | Show real last sync time in IST or remove if not available. |
| **SkyWatch** | Top-left Metrics Card | Display only | Yes | **YES (Overlaps)** | **Fix** | Combine with Mode Switch into top-left flex toolbar. |
| **SkyWatch** | Right Threat Queue Items | `setSelectedTrackId` | Yes | No | **Fix** | Wire to real telemetry tracks. Remove hardcoded `Track 07`, `Swarm U1`, `Track 11`, `Airliner AC-48`. |
| **SkyWatch** | "Why this score" Breakdown Bars & Legend | Static divs | No (mock) | No | **Remove** | Replace hardcoded breakdown with real anomaly score and rule reason text. Remove "Scores update every second" unless true. |
| **SkyWatch** | Alerts "Acknowledge" Buttons | `handleAcknowledge` | Yes | No | **Keep** | Acknowledges active alert. |
| **SkyWatch** | Replay Play / Pause | `handleTogglePlay` | No (local state) | No | **Wire** | Wire to simulation pause/resume endpoint. |
| **GeoIntel** | View Mode Toggle (Swipe / Side by side) | `setViewMode` | Yes | No | **Keep** | Verified functional in GeoIntel rebuild. |
| **GeoIntel** | Sensitivity Slider | `handleSensitivityChange` | Yes | No | **Keep** | Dynamically updates change detection threshold. |
| **GeoIntel** | Minimum Area Slider | `handleMinAreaChange` | Yes | No | **Keep** | Filters small pixel clusters. |
| **GeoIntel** | "Run on new pair" Selection | `handleSelectPair` | Yes | No | **Keep** | Runs algorithmic change detection on selected image pair. |
| **GeoIntel** | Candidate Accept / Reject Buttons | `handleCandidateReview` | Yes | No | **Keep** | Updates candidate review status in state and report. |
| **GeoIntel** | "Generate report" Button | `handleGenerateReport` | Yes | No | **Keep** | Generates intelligence report with confirmed findings. |
| **GeoIntel** | "Export HTML" / "Export JSON" Buttons | Export functions | Yes | No | **Keep** | Downloads structured report files. |
| **MediRoute** | Top-left Metrics Card | Display only | Yes | **YES (Overlaps)** | **Fix** | Combine with Mode Switch into top-left flex toolbar. |
| **MediRoute** | Road Hazards Panel (Block / Unblock buttons) | `handleToggleHazard` | Yes | **YES (Overlaps)** | **Fix** | Move into bottom-left collapsible stack. Wrap long road names cleanly and prevent Block/Unblock clipping. |
| **MediRoute** | Priority Queue Casualty Items | Selection / click | Yes | No | **Fix** | Remove fake fallback casualties (`mockCasualties`) and fake trend chips/sparklines. Show only real casualties. |
| **MediRoute** | Hospital & Aid Station Bed Capacity Bars | Static divs | No (mock) | No | **Remove** | No bed capacity tracking exists in model schema. Remove fake progress bars. |
| **MediRoute** | "Calculate route" Button | `handleRecalculateRoute` | Yes | No | **Keep** | Computes hazard-aware Dijkstra evacuation route. |
| **MediRoute** | "Report hazard" Button | `setIsIntakeModalOpen` | Misleading | No | **Fix** | Was opening casualty intake form instead of hazard reporting. Wire to a real hazard toggle/creation flow or remove. |
| **MediRoute** | Replay Play / Pause | `setIsPlaying` | No (local state) | No | **Wire** | Wire to simulation pause/resume endpoint. Remove 1x/2x/5x speed buttons. |
