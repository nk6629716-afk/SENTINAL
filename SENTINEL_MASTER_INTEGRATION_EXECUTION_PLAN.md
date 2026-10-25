# SENTINEL --- Master Integration & Execution Plan

**For Gemini in Antigravity IDE**\
**Project:** SENTINEL --- Integrated Situational Awareness & Emergency
Response Platform\
**Purpose:** This is the single source of truth for integrating the
frontend, backend, algorithms, simulations, and all four problem
statements into one functional, polished Web & App hackathon submission.

> **Instruction to Gemini:** Read this entire document before making
> changes. Inspect the existing repository first. Treat this file as the
> master integration specification, coordinate with the three
> member-specific plans, preserve working code, and implement/test the
> actual application---not just a mockup or a plan. Do not claim any
> feature or test is complete unless it has been implemented and
> verified.

------------------------------------------------------------------------

## 1. Product mission and boundaries

Build a browser-based prototype that demonstrates four connected
workflows:

1.  **Offline Tactical Communication & Battlefield Awareness** ---
    FieldLink.
2.  **Counter-Drone Monitoring & Airspace Security** --- SkyWatch.
3.  **Geospatial Intelligence & Reconnaissance Analysis** --- GeoIntel.
4.  **Emergency Medical Triage & Evacuation Logistics** --- MediRoute.

The product must feel like one integrated operations platform, not four
unrelated pages. It must run reliably on a judge's laptop, be
responsive, clearly label simulated data, and make each problem
statement easy to discover and demonstrate.

### Safety, accuracy, and honest simulation

-   Use fictional/synthetic demo scenarios and data unless the team
    explicitly adds an appropriate, authorized dataset.
-   Clearly mark simulated telemetry, alerts, observations, incidents,
    and patient records.
-   Do not claim synthetic tracks are real drone detections or that an
    anomaly proves hostile intent.
-   Do not claim a browser app provides radio or device-to-device
    communication without a real transport implementation.
-   The triage rules are illustrative workflow logic, not clinically
    validated medical guidance. Real care decisions belong to qualified
    professionals using approved protocols.
-   Geospatial image differences are candidate changes, not confirmed
    intelligence. Lighting, alignment, shadows, compression, and
    viewpoints can produce false positives.
-   Do not implement weapon guidance, interception, or targeting
    features. Keep SkyWatch focused on monitoring and explainable
    anomaly alerts.

------------------------------------------------------------------------

## 2. Official scoring guide alignment

The supplied *Falling Sun 2026 --- Scoring & Selection* guide defines a
100-point total: - **Trials --- 25:** up to 20 points from four of five
skill trials, plus one tool-based trial worth up to 5. - **Invited
Judges --- 25:** five judges may award up to 5 each; the presentation
slot is exactly **3:00**. - **Project Ratings --- 25.** - **Community
Vote --- 25:** uses the same category-specific criteria as project
ratings.

The Web & App RAY project-rating criteria are each worth 5 points: 1.
**UI/UX and usability** --- clarity and ease of use. 2. **Frontend** ---
quality and functionality of the user-facing implementation. 3.
**Backend** --- server-side logic, data handling, and relevant
integrations. 4. **Idea and problem-solving** --- how well the idea
addresses its stated problem. 5. **Replayability and polish** ---
repeat-use value, completeness, and overall polish.

These are the official categories as described in the supplied guide.
The plan below translates them into implementation goals; it does not
guarantee a score. The organizers/evaluators decide whether trials
qualify. Installing or naming a tool is not enough---its meaningful use
must be demonstrated. Verify eligibility and current instructions with
organizers.

### Build priorities mapped to the rubric

-   **UI/UX:** intuitive navigation, readable information hierarchy,
    accessibility, responsive design, clear statuses, helpful errors.
-   **Frontend:** working maps/visualizations, functional forms and
    controls, loading/error/empty states, no dead buttons.
-   **Backend:** real API integration, validated inputs, persistent
    data, reliable synchronization, documented behavior.
-   **Idea/problem-solving:** four visible, working problem-specific
    workflows and at least one meaningful cross-module workflow.
-   **Replayability/polish:** deterministic seed/reset, reusable demo
    scenarios, saved history, consistent design, tests, and stable
    startup.

Also prepare the separate trial and presentation components. Potential
skill trials in the guide include Video Editing, 3D Design, Self-Crafted
Art, Music Design, and AI Integration; choose four only if the team can
genuinely demonstrate them. One listed tool trial may be attempted, such
as Cloudflare hosting/platform or Firebase backend, only if actually
integrated and approved. Do not add tools solely for appearances.

------------------------------------------------------------------------

## 3. Team ownership and integration rules

### Person 1 --- Frontend & Product Experience

Owns: - Dashboard, navigation, shared visual system, responsive
layouts. - FieldLink, SkyWatch, GeoIntel, and MediRoute UI. - API client
integration, user-facing loading/error/sync states. - Accessibility,
usability, and presentation flow.

Suggested paths (adapt to current repository): - `src/app/` -
`src/components/` - `src/dashboard/` - `src/modules/*/components/` -
`src/styles/` - `src/pwa/`

### Person 2 --- Backend, Data & Synchronization

Owns: - API endpoints, request validation, persistence, shared data
contracts. - Incident, telemetry/alert, observation, patient, and hazard
records. - Offline batch synchronization and idempotency. - Real-time
updates if useful and reliable; REST/polling fallback. - Backend tests,
environment setup, deployment documentation.

Suggested paths: - `server/src/routes/` - `server/src/services/` -
`server/src/realtime/` - `server/src/db/` - `server/src/validation/` -
`shared/`

### Person 3 --- Algorithms, Simulations & Module Logic

Owns: - Deterministic synthetic scenarios and fixtures. - FieldLink
local queue/sync coordination logic. - SkyWatch telemetry simulation and
explainable anomaly rules. - GeoIntel image-difference analysis and
candidate regions. - MediRoute demo triage rules and hazard-aware
routing. - Unit tests for algorithms.

Suggested paths: - `src/algorithms/` - `src/simulation/` -
`src/modules/*/logic/` - `src/data/` - `tests/algorithms/`

### Shared working rules

1.  Inspect the current repository and Git status before editing.
2.  Agree on shared types, IDs, timestamps, API routes, and error shapes
    before parallel implementation.
3.  Use feature branches and small, logical commits; do not overwrite
    another member's work.
4.  Person 1 may use clearly labelled mock responses until Person 2's
    API is ready.
5.  Person 3 provides pure functions and documented outputs; coordinate
    whether each function runs in the browser or server.
6.  Person 2 owns durable backend persistence and sync reconciliation;
    Person 3 owns local queue behavior/algorithm semantics; Person 1
    owns the visible offline experience.
7.  Keep one source of truth for shared incidents/hazards once backend
    integration is active.
8.  Run tests/build after integration, resolve conflicts explicitly, and
    keep the main branch runnable.

------------------------------------------------------------------------

## 4. Recommended system architecture

Preserve the project's current stack if it already works. If starting
from an empty repository, a reasonable option is: - Frontend: React +
TypeScript + Vite. - Styling: the team's agreed Tailwind CSS or existing
design system. - Mapping: Leaflet or another already-configured map
library. - Charts: Recharts or native lightweight visualizations. -
Offline client storage: IndexedDB, preferably through a maintained
wrapper if approved. - Backend: Node.js + TypeScript + Express or the
existing backend framework. - Optional live events: Socket.IO/WebSocket
only if they can be tested reliably. - Persistence: choose a storage
system compatible with the actual demo deployment; document its
persistence limitations.

Do not migrate an existing working app to this stack without a concrete
reason.

### Logical flow

``` text
                    SENTINEL Dashboard / Frontend
                 /             |                \
           FieldLink         SkyWatch         GeoIntel / MediRoute
                 \             |                /
                    Typed API client / shared types
                                |
                   Backend routes + validation
                                |
                 Services + persistence + sync
                                |
                  Deterministic simulation/logic
                (client-side or server-side by contract)
```

The actual runtime placement of algorithms must be agreed by the team.
This diagram shows responsibilities, not a requirement that every
algorithm runs on the server.

------------------------------------------------------------------------

## 5. Shared data contracts and API plan

Finalize the exact shapes before coding. Use TypeScript types shared
between frontend/backend where the repository supports it. Avoid using
database rows directly as public API contracts.

### Suggested endpoint inventory

-   `GET /api/health`
-   `GET /api/dashboard`
-   `GET /api/incidents`
-   `POST /api/incidents`
-   `PATCH /api/incidents/:id`
-   `POST /api/sync`
-   `GET /api/telemetry`
-   `GET /api/alerts`
-   `PATCH /api/alerts/:id`
-   `GET /api/geointel/observations`
-   `POST /api/geointel/observations`
-   `PATCH /api/geointel/observations/:id`
-   `GET /api/patients`
-   `POST /api/patients`
-   `PATCH /api/patients/:id`
-   `GET /api/hazards`
-   `POST /api/hazards`
-   Optional `POST /api/routes/calculate` if routing is implemented
    server-side.

Optional live events must have documented event names and payload
shapes. Provide REST/polling fallback if live events are unreliable.

### Minimum record concepts

-   **Incident:** stable ID, source module, type, priority, notes,
    fictional/demo location, created/updated timestamps, status,
    simulation marker, client ID/idempotency key where needed.
-   **Telemetry track:** track ID, coordinates, speed, heading,
    timestamp, simulation marker.
-   **Alert:** stable ID, related track/event ID, severity, rule name,
    observed value, configured threshold, explanation, timestamp,
    acknowledgement status, simulation marker.
-   **GeoIntel candidate:** candidate ID, before/after sample IDs,
    normalized coordinates or bounding box, difference score, algorithm
    settings, explanation, review status, analyst notes, timestamps,
    simulation marker.
-   **Patient/casualty demo record:** stable ID, fictional location,
    agreed non-sensitive demo fields, triage category, rule
    version/reason, workflow status, timestamps, simulation marker.
-   **Hazard/road edge:** stable ID, graph edge/location, blocked/active
    status, report source, timestamp, simulation marker.
-   **Sync result:** client ID, server ID if accepted, outcome
    (`accepted`, `already_received`, `rejected`), safe error
    code/message, sync timestamp.

Use consistent ISO timestamps. Validate enum values, IDs, coordinate
ranges, lengths, and numeric inputs. Do not put real sensitive patient
data into the demo.

### Error and duplicate-handling policy

-   Agree a consistent error response format,
    e.g. `{ "error": { "code": "...", "message": "..." } }`.
-   Offline sync must be idempotent. Repeated requests must not create
    duplicates.
-   Batch sync should return per-item outcomes so one invalid item does
    not obscure successful items.
-   Never mark a record as synced before the server confirms
    acceptance/already-received.
-   Preserve original client creation timestamps while recording server
    receipt time.
-   The frontend must display actual outcomes, not generic fake success.

------------------------------------------------------------------------

## 6. Problem statement implementation specifications

## 6.1 FieldLink --- Offline Tactical Communication & Battlefield Awareness

### User problem

When internet access is unavailable, personnel still need to create and
retain incident reports and later synchronize them while preserving
situational awareness.

### Required behavior

-   Create reports with type, priority, timestamp, fictional location,
    and notes.
-   Save reports locally when offline.
-   Show clear online/offline state, queue count, per-record status, and
    last sync.
-   Sync queued reports after reconnect.
-   Handle partial failures and retries.
-   Deduplicate repeated sync submissions.
-   Display shared reports in a feed and on the dashboard/map.
-   Preserve records after refresh and provide deterministic demo
    scenarios.

### Judge demo

1.  Start with the online state visible.
2.  Turn off browser network access.
3.  Create two fictional reports.
4.  Refresh and show the reports remain.
5.  Show pending queue count and pending status.
6.  Restore connectivity and retry sync.
7.  Show server-confirmed sync and no duplicates.

### Acceptance tests

-   Offline create + refresh retains reports.
-   Network loss during sync does not lose unconfirmed items.
-   Retry does not duplicate records.
-   Partial failure displays correct per-item status.
-   UI distinguishes browser connectivity from server sync health.

### Limitation

This demonstrates offline-first browser reporting and later
synchronization, not actual radio or direct device-to-device
communication.

## 6.2 SkyWatch --- Counter-Drone Monitoring & Airspace Security

### User problem

Operators need to inspect simulated airspace tracks and understand which
movements trigger configured anomalies.

### Required behavior

-   Deterministic synthetic tracks with ID, position, speed, heading,
    and timestamp.
-   Start, pause/step if practical, and reset controls.
-   Map tracks and track history.
-   Explainable configurable anomaly rules, such as:
    -   Sudden speed change above a threshold.
    -   Route deviation above a threshold.
    -   Entry into a fictional configured zone.
    -   Stale telemetry.
-   Alert detail includes rule, severity, timestamp, associated track,
    observed value, threshold, and plain-language reason.
-   Acknowledge an alert and preserve status where supported.
-   Clearly mark all data and alerts as simulated.

### Judge demo

Start the scenario, observe tracks move, trigger a known anomaly, open
the alert, and explain the rule that fired. Reset and replay.

### Acceptance tests

-   Same seed produces repeatable tracks/events.
-   Normal scenario does not trigger every anomaly rule.
-   Designed anomaly fixture triggers the expected rule.
-   Alert explanation matches the actual configured threshold.
-   Pause/reset works.
-   Stale/missing data has explicit behavior.

### Limitation

This is a synthetic monitoring and anomaly demonstration, not real drone
detection, verified hostile identification, interception, or targeting.

## 6.3 GeoIntel --- Geospatial Intelligence & Reconnaissance Analysis

### User problem

Analysts need to compare geographic imagery/observations and turn
differences into inspectable findings and reports.

### Required behavior

-   Bundled before/after demo images or aligned map snapshots.
-   Side-by-side or swipe comparison.
-   Run a deterministic image-difference algorithm with configurable
    threshold.
-   Show candidate regions as bounding boxes or normalized coordinates.
-   Show difference score, input image IDs, algorithm settings, and
    limitations.
-   Let an analyst inspect a candidate, add notes, and mark it reviewed.
-   Keep algorithm candidates separate from analyst-confirmed records.
-   Generate/export a concise report if feasible and ensure it reflects
    actual results.

### Judge demo

Load a known sample pair, run analysis, inspect a highlighted candidate,
mark it reviewed, and display the resulting report.

### Acceptance tests

-   Identical images return no significant candidate under the default
    configuration.
-   A known-difference fixture identifies the expected region within
    documented tolerance.
-   Different dimensions/invalid inputs return a clear error or explicit
    unsupported state.
-   Same inputs/settings produce repeatable output.
-   Review status and notes persist through the agreed data layer.

### Limitation

Pixel differences can be caused by lighting, alignment, shadows,
compression, or viewpoint. Outputs are candidate changes, not confirmed
intelligence or semantic object recognition.

## 6.4 MediRoute --- Emergency Medical Triage & Evacuation Logistics

### User problem

Responders need a consistent way to organize fictional casualty records,
understand the demo priority rules, and plan routes around reported
hazards.

### Required behavior

-   Validated intake form with fictional sample data.
-   Configurable, documented rule-based triage categories.
-   Show category, rule/version, reason, and missing-data warnings.
-   Patient/casualty status workflow: awaiting assessment, assessed,
    assigned, evacuated (adapt names consistently).
-   Fictional road graph with nodes, edges, aid points, casualty points,
    and blocked roads.
-   Dijkstra or A\* routing on the agreed graph.
-   Recalculate routes based on current blocked edges.
-   Show route and outcome; handle no-route cases.
-   Save patient/hazard status through the shared data layer.

### Judge demo

Add a fictional casualty, inspect the transparent rule result, block a
road, recalculate the route, and show the route changes. Reset and
repeat.

### Acceptance tests

-   Known input produces expected demo category and explanation.
-   Missing/out-of-range input is handled clearly.
-   Shortest route is selected when all edges are open.
-   Blocking a relevant edge selects an available alternative.
-   Disconnected graph returns "no route" rather than a fabricated
    route.
-   Patient status and hazard changes persist.

### Limitation

Triage rules are illustrative, not clinically validated or medical
advice. Use fictional data and defer real decisions to qualified
professionals and approved protocols.

------------------------------------------------------------------------

## 7. Cross-module integration scenario

Build one optional, deterministic scenario to prove that SENTINEL is a
coherent platform:

1.  A FieldLink report creates a fictional incident.
2.  A road-blockage report updates shared hazard state.
3.  MediRoute recalculates a route using the updated blockage.
4.  GeoIntel produces a candidate change linked to a reviewable
    observation.
5.  SkyWatch produces a simulated anomaly alert with an explicit
    explanation.
6.  The dashboard shows these events in one timeline/map where
    appropriate.
7.  Reset restores the known baseline so the judges can replay it.

Do not force an artificial causal link between unrelated events. The
value is shared context and coherent workflows, not a claim that one
module verifies another.

------------------------------------------------------------------------

## 8. UI/UX and polish requirements

-   Establish a consistent design system: typography, spacing, color
    tokens, icons, cards, forms, tables, and alert severity.
-   Use readable contrast, visible focus states, keyboard support,
    proper labels, and meaningful empty states.
-   Do not communicate severity by color alone.
-   Make each module's purpose and primary action obvious.
-   Use consistent map legends and labels.
-   Show timestamps and simulation status.
-   Add loading, success, partial failure, offline, sync-pending, and
    no-results states.
-   Ensure mobile and desktop layouts work.
-   No dead buttons, fake charts, fake data updates, hidden errors, or
    placeholder text in final demo.
-   Every button must have a real outcome or be visibly disabled with a
    reason.
-   Add a deterministic reset/replay action for the overall demo.
-   Avoid excessive animation that makes the demo less stable.

------------------------------------------------------------------------

## 9. Recommended implementation sequence

### Phase 0 --- Repository and contract alignment

-   Inspect repository and Git status.
-   Confirm framework, package manager, run/test/build commands.
-   Assign file ownership and branch strategy.
-   Agree shared types, API paths, error format, IDs, timestamps,
    simulation markers, and storage behavior.
-   Write down dependencies between tasks.

**Exit gate:** everyone knows what they own and can build against stable
contracts.

### Phase 1 --- Runnable shell and shared data

-   App starts reliably.
-   Navigation and four module pages exist.
-   Shared types and deterministic fictional seed data exist.
-   Backend health check and basic persistence work.
-   Frontend can use mock API mode while backend work proceeds.

**Exit gate:** all four modules are visible and the app starts from
documented commands.

### Phase 2 --- Minimum end-to-end path for each problem

-   FieldLink: create → local save → sync.
-   SkyWatch: simulate track → trigger explainable alert → acknowledge.
-   GeoIntel: load image pair → analyze → review candidate.
-   MediRoute: intake → transparent rule result → route around blocked
    edge.

**Exit gate:** each path works end-to-end before optional features are
added.

### Phase 3 --- Cross-module integration

-   Shared incident feed and hazard state.
-   API client connected to actual backend.
-   Persistence across refresh/restart according to deployment.
-   Live updates only if reliable; otherwise polling/refresh is
    acceptable.
-   Add cross-module scenario and reset.

**Exit gate:** no contradictory duplicate data sources and no core
workflow relies solely on hardcoded UI state.

### Phase 4 --- Reliability and test coverage

-   Unit tests for algorithms.
-   API tests for validation, persistence, and idempotent sync.
-   Frontend interaction checks for all primary flows.
-   Manual offline/reconnect test.
-   Route/image edge cases.
-   Verify build and startup from a clean setup.

**Exit gate:** critical paths pass and known limitations are documented.

### Phase 5 --- Polish, deploy, rehearse

-   Responsive/accessibility pass.
-   Remove dead controls and placeholders.
-   Ensure sample data and reset are reliable.
-   Deploy to the agreed hosting platform if useful; verify actual URL
    and persistence.
-   If attempting a tool trial, confirm meaningful integration and
    organizer eligibility.
-   Prepare exact 3-minute demo, with the four problem statements all
    represented.

**Exit gate:** team can run the demo from a clean start without
improvising or relying on unverified claims.

------------------------------------------------------------------------

## 10. Testing and release checklist

### Functional coverage

-   [ ] FieldLink offline create, refresh, reconnect, sync, retry,
    dedupe.
-   [ ] SkyWatch track simulation, pause/reset, anomaly explanation,
    alert acknowledgement.
-   [ ] GeoIntel before/after comparison, candidate detection, review,
    persistence.
-   [ ] MediRoute triage explanation, patient status, blocked road,
    alternate route, no-route case.
-   [ ] Shared dashboard and cross-module scenario.
-   [ ] Demo reset restores a known state.

### Engineering quality

-   [ ] No unresolved build/type errors.
-   [ ] API input validation and consistent error responses.
-   [ ] Durable persistence behavior verified in the actual demo
    environment.
-   [ ] Core algorithms have automated tests.
-   [ ] Offline sync is idempotent.
-   [ ] No critical console/server errors.
-   [ ] Responsive desktop/mobile layout.
-   [ ] No secrets in repository or logs.
-   [ ] README has install/run/test/deploy instructions and demo steps.
-   [ ] Known limitations and simulated data are clearly disclosed.

### Scoring and presentation

-   [ ] Each of the five Web & App criteria has visible evidence in the
    app.
-   [ ] Four problem statements are easy to locate and each has a
    working demo path.
-   [ ] Repeatability and polish are visible through deterministic
    scenarios and reset.
-   [ ] Team rehearses exactly 3:00 and verifies organizer instructions
    about questions.
-   [ ] Trials selected only where the team can demonstrate genuine
    work.
-   [ ] Community-facing project description explains the value in plain
    language.

------------------------------------------------------------------------

## 11. Three-minute presentation outline

Adjust to actual implemented functionality; never promise features that
are not working.

-   **0:00--0:25 --- Problem and solution:** explain fragmented offline
    reports, airspace monitoring, geospatial review, and evacuation
    coordination; introduce SENTINEL as one integrated prototype.
-   **0:25--0:55 --- FieldLink:** create an offline report, show it
    queued, reconnect/sync if the live demo environment permits.
-   **0:55--1:20 --- SkyWatch:** show a simulated track and open an
    explainable anomaly alert.
-   **1:20--1:45 --- GeoIntel:** compare the before/after sample and
    inspect a candidate change.
-   **1:45--2:15 --- MediRoute:** show a triage rule explanation and
    route recalculation after a road blockage.
-   **2:15--2:40 --- Integration and engineering:** show shared incident
    context, persistence, deterministic reset, and tests.
-   **2:40--3:00 --- Value and honest scope:** state who benefits, what
    is simulated, what the prototype proves, and the realistic next
    step.

This is a rehearsal outline, not a guarantee of timing. Time the real
build and adjust. Prepare a backup recording/screenshots in case venue
connectivity fails, while keeping the live application available.

------------------------------------------------------------------------

## 12. Instructions for Gemini in Antigravity

Work in small phases. Before each phase: 1. Inspect relevant files and
current Git diff. 2. State the intended change and the acceptance
criteria. 3. Check whether the work conflicts with another member's
ownership or shared contract. 4. Implement the smallest useful slice. 5.
Run the relevant tests, typecheck, and build commands that exist in this
repository. 6. Inspect the diff for accidental changes and broken
functionality. 7. Update README or contract docs when behavior changes.
8. Report actual results, not assumptions.

Do not: - Rewrite the whole project without necessity. - Add
dependencies without explaining their value. - fabricate test output,
successful API responses, deployed URLs, or trial eligibility. - leave
placeholder pages or controls while claiming the project is complete. -
silently replace real API calls with mocks. - treat synthetic data as
live intelligence or medical truth. - prioritize decorative polish over
the four end-to-end workflows. - change shared types/routes without
notifying the other members.

### Required end-of-session report

-   Phase and acceptance criteria addressed.
-   Files changed.
-   Features completed, mapped to the four problem statements.
-   Exact commands run and their real results.
-   Tests passed/failed/not run.
-   Current mock versus real integration status.
-   Known limitations and unresolved decisions.
-   Next smallest safe task.

**Final success condition:** A judge can open the application,
understand the product quickly, demonstrate a working end-to-end path
for each of the four problem statements, inspect explainable results,
see persistent/shared data and offline behavior where claimed, and
replay a coherent scenario. All implementation claims must match what is
actually working.
