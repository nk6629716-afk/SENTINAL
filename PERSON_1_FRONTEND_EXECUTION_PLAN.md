# Person 1 Execution Plan --- Frontend & Product Experience

**Use with Gemini in Antigravity.** You own the user-facing application
and the integration of the four modules into one cohesive product.
Follow this plan in the existing repository; inspect before changing
anything.

# SENTINEL --- Shared Project Contract

## Mission

Build **SENTINEL: Integrated Situational Awareness & Emergency Response
Platform**, a polished, functional browser-based hackathon prototype
that clearly demonstrates all four supplied problem statements:

1.  **Offline Tactical Communication & Battlefield Awareness** ---
    FieldLink.
2.  **Counter-Drone Monitoring & Airspace Security** --- SkyWatch.
3.  **Geospatial Intelligence & Reconnaissance Analysis** --- GeoIntel.
4.  **Emergency Medical Triage & Evacuation Logistics** --- MediRoute.

Use synthetic/demo data and clearly label simulations. Do not represent
simulated detections as real hostile activity, and do not represent the
simplified triage logic as clinically validated. Do not claim a browser
app provides real radio/device-to-device communications unless a real
transport has been implemented.

## Official scoring guide to design toward

The supplied *Falling Sun 2026 --- Scoring & Selection* guide gives 100
points in four independent components: - Trials: 25 (up to 20 points
from four of five skill trials, plus one tool trial worth up to 5). -
Invited judges: 25; the presentation slot is exactly 3:00. - Project
ratings: 25. - Community vote: 25.

For Web & App RAY, the five 5-point project-rating criteria are: 1.
UI/UX and usability. 2. Frontend. 3. Backend. 4. Idea and
problem-solving. 5. Replayability and polish (repeat-use value,
completeness, and overall polish).

These plans prioritize demonstrable functionality against those
criteria. They cannot guarantee a score. Trial eligibility is decided by
the organizers; simply installing or naming a tool does not qualify. The
team should verify current rules and attempt only trials it can
genuinely demonstrate.

## Product-wide acceptance requirements

-   One unified dashboard with navigation to all four modules.
-   Shared incident feed/map where relevant; shared data must not
    contradict between modules.
-   Responsive desktop and mobile layouts.
-   Working forms, controls, filters, loading states, empty states, and
    error states. No dead buttons or fake success messages.
-   Persistent records after refresh, using the agreed storage/backend
    approach.
-   Deterministic, resettable demo scenarios so a judge can replay the
    same workflow.
-   Visible simulation labels, timestamps, status, and explanations for
    algorithmic results.
-   Basic automated tests for critical algorithms/API behavior and a
    manual end-to-end demo checklist.
-   Keep scope feasible: finish one end-to-end workflow for each of the
    four problem statements before optional features.
-   Never hardcode secrets or commit credentials. Validate input and
    show safe, understandable errors.

## Role and ownership

**Primary owner:** UI, navigation, layout, accessibility, responsive
behavior, visual system, frontend API integration, visible offline
state, and demo usability.

Suggested ownership: - `src/app/` - `src/components/` -
`src/dashboard/` - `src/modules/*/components/` - `src/styles/` -
`src/pwa/` for user-facing PWA/offline indicators - Frontend tests for
interactions and accessibility

Do not independently invent backend endpoints or change shared data
contracts without agreement. Coordinate the contracts with Person 2 and
algorithm outputs with Person 3. Avoid editing their owned files unless
they ask or the team explicitly agrees.

## First actions in Antigravity

1.  Inspect the repository, package scripts, framework, existing
    components, and current Git status before editing.
2.  Summarize the current architecture and identify what already works.
    Do not replace a functioning project or rewrite configuration just
    to match a preferred stack.
3.  Create a short implementation checklist and identify missing
    dependencies before installing anything.
4.  If the repository is empty, propose React + TypeScript + Vite and
    the team's agreed styling/map/chart libraries; wait for
    project-level agreement if another stack is already established.
5.  Keep changes small, runnable, and committed in logical units. Run
    the relevant checks after each meaningful milestone.

## Required interface and user journeys

### A. Unified command dashboard

Build a coherent home screen with: - SENTINEL title and a clear
"simulated data" label. - Global online/offline status and pending-sync
count. - Summary cards for open incidents, active simulated tracks,
pending geospatial reviews, and patients awaiting action. - Shared
incident/event feed with category, priority, timestamp, status, and
source module. - Map or map-like spatial view with a legend and distinct
symbols for incidents, simulated tracks, aid points, and blocked
roads. - Clear navigation to FieldLink, SkyWatch, GeoIntel, and
MediRoute. - Helpful empty/loading/error states; avoid dashboard numbers
that do not derive from actual application state.

### B. FieldLink UI

-   Incident/report form with type, priority, notes, location (choose
    from demo locations or map selection), and submit validation.
-   Incident feed with filters and readable timestamps.
-   Offline banner/status, pending queue count, last sync, and per-item
    sync status.
-   While offline, show "Saved locally; awaiting sync" rather than
    falsely claiming a server save.
-   When connectivity returns, reflect actual queue/sync outcomes from
    the shared implementation.
-   Keep reports visible after refresh.

### C. SkyWatch UI

-   Live-simulated track list and map with ID, location, speed, heading,
    last update, and status.
-   Start/pause/reset simulation controls that actually affect the
    simulation.
-   Alert list showing severity, timestamp, associated track, and
    plain-language reason for the anomaly.
-   Acknowledge/dismiss workflow with status persistence where
    supported.
-   Persistent "SIMULATION" labeling; do not visually imply that actual
    airspace sensors are connected.

### D. GeoIntel UI

-   Before/after sample imagery comparison, with side-by-side or swipe
    view.
-   Run-analysis action with progress/disabled state and visible result.
-   Highlight candidate changes and allow opening each candidate to
    inspect score, location, and limitations.
-   Analyst review status and notes.
-   Generate/export a concise report if feasible; ensure the report
    reflects the current result and does not invent findings.

### E. MediRoute UI

-   Casualty intake form with validation and clear field labels.
-   Triage category with the rule/reason displayed beside the result.
-   Patient queue with status updates and filters.
-   Map of fictional aid points, casualty points, hazards/blocked edges,
    and route.
-   Recalculate route action with a visible route result and
    explanation.
-   Clearly state this is a demo aid and not clinically validated
    medical advice.

## Visual and usability standards

-   Establish consistent typography, spacing, color tokens, icons, card
    styles, form states, and alert severity semantics.
-   Use color plus text/icon, not color alone, to communicate severity.
-   Keep text contrast high and controls keyboard accessible; add
    labels, focus states, and sensible tab order.
-   Make important actions obvious; do not hide core workflows in
    decorative menus.
-   Design responsive layouts for narrow mobile screens and desktop.
-   Avoid clutter, excessive animation, fake charts, placeholder lorem
    ipsum, and controls with no outcome.
-   Every screen should explain what the user can do and what happened
    after an action.

## API integration contract

Coordinate and document a shared TypeScript contract with Person 2.
Suggested initial endpoints (adjust together, do not assume they already
exist): - `GET /api/dashboard` - `GET /api/incidents` -
`POST /api/incidents` - `GET /api/telemetry` - `GET /api/alerts` -
`GET /api/geointel/observations` - `POST /api/geointel/observations` -
`GET /api/patients` - `POST /api/patients` - `PATCH /api/patients/:id` -
`POST /api/sync` - Optional live updates through agreed
WebSocket/Socket.IO events.

Use a typed API client, central error handling, loading states, and
realistic mock responses while the backend is under development. Keep
mock mode clearly identifiable and switchable. Never silently swallow
API errors.

## Offline/PWA interface

-   Show browser connectivity and app data-sync status as separate
    concepts.
-   Cache the app shell only if service-worker setup is reliable and
    tested.
-   Keep user-created offline records visible; coordinate actual queue
    storage with Person 3 and server reconciliation with Person 2.
-   Do not claim the app works fully offline until tested with network
    disabled and a hard refresh.
-   Include a clear sync retry action and meaningful failure state.

## Milestones

1.  **M1 --- Shell:** app runs, navigation works, shared design tokens
    and responsive shell.
2.  **M2 --- Module skeletons:** all four modules have real page
    structure and primary workflows, even if initially backed by mocks.
3.  **M3 --- Interactions:** forms, filters, simulation controls,
    review/status actions, validation, and errors work.
4.  **M4 --- Integration:** replace mock paths with agreed API client,
    shared state refresh, live updates if ready.
5.  **M5 --- Polish and rehearsal:** responsive/accessibility pass,
    remove dead controls, add resettable demo entry points, test judge
    workflow.

## Your test checklist

-   Each module is reachable in no more than one or two clear navigation
    actions.
-   Forms reject invalid input and show actionable messages.
-   Loading, empty, offline, sync-pending, success, and failure states
    are distinct.
-   Refresh does not erase records that should be persistent.
-   Simulation controls alter visible behavior.
-   A blocked road is visible and the displayed route updates after
    recalculation.
-   Before/after imagery and analysis output are visibly linked.
-   The layout remains usable on a narrow viewport.
-   No critical console errors, broken links, or dead buttons.

## Definition of done

Frontend is done only when a judge can independently discover and
complete one end-to-end scenario in each of the four modules, understand
that data is simulated, and see clear results without needing developer
tools. Report exactly what is implemented, what is mocked, and what
remains incomplete.

## Final response required from Antigravity

At the end of each work session, report: 1. Files changed. 2. Features
completed and problem statements covered. 3. Commands/tests run and
their actual results. 4. Any API/contract assumptions or conflicts to
resolve with Person 2 or Person 3. 5. Known bugs and the next smallest
useful step.
