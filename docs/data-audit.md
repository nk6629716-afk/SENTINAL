# SENTINEL Data Audit (Phase 0)

Comprehensive inventory of every displayed number, metric, label, status indicator, and list across all modules and views, verifying single-source-of-truth compliance.

| Screen / Module | Element / Label | Displayed Value / Text | Real Source (State / Selector / DB) | Status | Decision | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Header** | Clock Readout | `14:32:07 UTC` (mock fallback) | System clock | Mixed / UTC hardcoded | **Fix** | Format in IST (`Asia/Kolkata`, UTC+05:30) ticking each second via `formatIST(new Date(), { seconds: true })`. |
| **Header** | Training Data Notice | `Simulated training data` | Hardcoded label | Intentional badge | **Keep** | Required by transparency guidelines. |
| **Header** | Outbox Pending Badge | `Sync 3` | `pendingSyncCount` | Inconsistent | **Fix** | Bind strictly to `selectPendingOutbox(incidents).length`. |
| **Header** | SSE Stream Status | `RECONNECT` (amber) | `realtimeStatus` | Inconsistent | **Fix** | Ensure status agrees with sidebar health card. Never show `RECONNECT` while sidebar says `Command link active`. |
| **Sidebar** | Brand Masthead | `Sentinel 2.6` / `Operations platform` | Static spec | Static | **Keep** | Brand typography. |
| **Sidebar** | FLK Badge | Badge `2` (vs header `3`) | Local count | Inconsistent | **Fix** | Bind strictly to `selectPendingOutbox(incidents).length`. |
| **Sidebar** | SKY Badge | Missing or `3` | Local count | Inconsistent | **Fix** | Bind strictly to `selectOpenAlerts(alerts).length` with critical red style. |
| **Sidebar** | Telemetry Bus Status | `Command link active` | `isOfflineMode` | State | **Keep** | Aligned with offline mode. |
| **Sidebar** | Storage Status | `IndexedDB storage ready` | DB health check | State | **Keep** | Verified ready. |
| **Dashboard** | Metric: Tracks Monitored | `tracks.length` (8) | `tracks` state | Real state | **Fix** | Tabular numerals, Barlow Semi Condensed. |
| **Dashboard** | Metric: Open Alerts | `activeAlerts.length` (3) | `alerts` state | Real state | **Fix** | Use `selectOpenAlerts(alerts).length`. |
| **Dashboard** | Metric: Alert Latency | `142 ms` | None (hardcoded) | **Hardcoded** | **Remove** | No real telemetry ping measurement exists in frontend state. |
| **Dashboard** | Metric: Prediction Error | `38 m` | None (hardcoded) | **Hardcoded** | **Remove** | No real trajectory error estimator in state. |
| **Dashboard** | Metric: Reports Synced | `incidents...length || 12` | None (`|| 12` fallback) | **Hardcoded** | **Fix** | Bind strictly to `selectSyncedIncidents(incidents).length` with zero hardcoded fallback. |
| **Dashboard** | Threat Queue List | `Track 07`, `Swarm U1`, `Track 11`, `Airliner AC-48` | Hardcoded array in component | **Hardcoded** | **Fix** | Build threat queue from active telemetry tracks (`SENTINEL-OWL-1`, `UNKNOWN-ROTARY-9`, `INTRUDER-HIGH-SPD`), ranked by existing threat score algorithm. |
| **Dashboard** | Mission Sequence Steps | Step 1-5 status text | `missionSteps` array | State | **Keep** | Cross-module progression tracker. Ensure reachable by scrolling on short screens. |
| **Dashboard** | Replay Playhead Time | `14:30:12` | None (hardcoded static div) | **Hardcoded** | **Fix** | Replace with LIVE indicator and real simulation elapsed time. |
| **Dashboard** | Activity Ticker | `Alpha to Command: contact east of bridge...` | None (hardcoded text) | **Hardcoded** | **Fix** | Wire to latest real incident/alert activity event or hide when empty. |
| **FieldLink** | Metric: Nodes Online | `3` | None (hardcoded) | **Hardcoded** | **Remove / Wire** | Replace with active incident count or remove. |
| **FieldLink** | Metric: Queued | `pendingIncidents.length || 4` | None (`|| 4` fallback) | **Hardcoded** | **Fix** | Wire to `selectPendingOutbox(incidents).length` without hardcoded fallback. |
| **FieldLink** | Metric: Median Delivery | `380 ms` | None (hardcoded) | **Hardcoded** | **Remove** | Fake telemetry metric. |
| **FieldLink** | Metric: Average Hops | `2` | None (hardcoded) | **Hardcoded** | **Remove** | Fake mesh network metric. |
| **FieldLink** | Team Messages | Alpha, Command, Bravo message stream | Hardcoded array | **Hardcoded** | **Remove** | Remove entire fake messaging tab and chat inputs. |
| **FieldLink** | Link Quality Percentages | `Alpha 92%`, `Bravo 62%`, `Command 100%` | Hardcoded array | **Hardcoded** | **Remove** | Fake radio link quality sliders. |
| **FieldLink** | Outbox Pending Items | Hardcoded list (`Bridge crossing blocked`, `Hazard H-2 reported`, etc.) | Hardcoded array | **Hardcoded** | **Fix** | Render real outbox items directly from `pendingIncidents` (IndexedDB) with working Retry action. |
| **FieldLink** | Outbox Status Counter | `Outbox, 3 pending` | Hardcoded string template | Inconsistent | **Fix** | Bind strictly to `selectPendingOutbox(incidents).length`. |
| **FieldLink** | Last Sync Timestamp | `Last sync 14:30:44 UTC, 2 sent, 0 conflicts` | Hardcoded text string | **Hardcoded** | **Fix** | Show real last sync time in IST or remove line. |
| **SkyWatch** | Metric: Tracks Monitored | `tracks.length` (8) | `tracks` state | Real state | **Keep** | Use selector, tabular nums. |
| **SkyWatch** | Metric: Open Alerts | `activeAlerts.length` (3) | `alerts` state | Inconsistent | **Fix** | Use `selectOpenAlerts(alerts).length`. |
| **SkyWatch** | Metric: Alert Latency | `142 ms` | None (hardcoded) | **Hardcoded** | **Remove** | Fake metric. |
| **SkyWatch** | Metric: Prediction Error | `38 m` | None (hardcoded) | **Hardcoded** | **Remove** | Fake metric. |
| **SkyWatch** | Threat Queue List | `Track 07`, `Swarm U1 to U4`, `Track 11`, `Airliner AC-48` | Hardcoded array | **Hardcoded** | **Fix** | Build threat queue from active telemetry tracks ranked by real threat score. |
| **SkyWatch** | "Why this score" Breakdown | `37%`, `24%`, `20%`, `13%`, `6%`, numbers `34, 22, 18, 12, 6` | Hardcoded static markup | **Hardcoded** | **Remove** | Show real anomaly score and rule reason text from anomaly detector. |
| **SkyWatch** | Kinematic Estimates | `1 min 40 s`, `62 m`, `38 m` | Hardcoded static text | **Hardcoded** | **Remove** | Remove fake kinematic numbers. |
| **SkyWatch** | Alerts List | Alert details and timestamps | `alerts` state | Real state | **Fix** | Format timestamps in IST. |
| **SkyWatch** | "Scores update every second" | Subtitle label | Hardcoded text | Static | **Remove** | Misleading if score doesn't tick every second. |
| **MediRoute** | Metric: Casualties | `casualties.length > 0 ? casualties.length : 6` | None (`: 6` fallback) | **Hardcoded** | **Fix** | Bind strictly to `selectCasualties(casualties).length`. |
| **MediRoute** | Metric: Immediate | `casualties.filter(...).length || 2` | None (`|| 2` fallback) | **Hardcoded** | **Fix** | Bind strictly to `selectImmediateCasualties(casualties).length`. |
| **MediRoute** | Metric: Blocked Road | `hazards.filter(h => h.blocked).length` | `hazards` state | Real state | **Keep** | Use `selectBlockedHazards(hazards).length`. |
| **MediRoute** | Metric: Reroutes | `3` (hardcoded) | None (hardcoded) | **Hardcoded** | **Fix** | Bind to real reroute calculation counter in route selector. |
| **MediRoute** | Metric: Mean ETA | `18 min` (hardcoded fallback) | Hardcoded string | **Hardcoded** | **Fix** | Bind strictly to `selectActiveRouteEta(activeRoute)`. |
| **MediRoute** | Priority Queue | `mockCasualties` (`CAS-03`, `CAS-06`, `CAS-05`, `CAS-01`) | Hardcoded array | **Hardcoded** | **Fix** | Render only real casualties from state. |
| **MediRoute** | Casualty Trend Badges | `Worsening`, `Stable`, `Improving` with mini SVGs | Fake assigned trends | **Hardcoded** | **Remove** | Model schema does not support trend history; remove fake trend chips and sparklines. |
| **MediRoute** | Casualty Subtitles | `Re-scored to immediate at 14:31`, `Immediate since 14:12` | Hardcoded static text | **Hardcoded** | **Remove** | Replace with real triage reason text from START engine. |
| **MediRoute** | Route Calculation Text | `Recalculated 14:31:48 after hazard report` | Hardcoded text | **Hardcoded** | **Remove** | Remove fake timestamp. |
| **MediRoute** | Hospital Bed Bars | `3 of 4 used`, `1 of 6 used` | Hardcoded progress bars | **Hardcoded** | **Remove** | No bed capacity in data model; remove fake bars. |
| **GeoIntel** | Candidates List & Report | Candidate metrics, differences, coordinates, decisions | Real matrix diff engine | Real state | **Keep** | Fully wired to Person 3 `imageDiff.ts` and sample pairs. Format timestamps in IST. |
| **All Modules** | All Timestamps | Various ISO strings / hardcoded UTC strings | Date strings | UTC / Mock | **Fix** | Convert every displayed timestamp to IST (`Asia/Kolkata`, UTC+05:30) via `src/utils/time.ts`. |
