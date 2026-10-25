# Person 2 Execution Plan --- Backend, Data & Synchronization

**Use with Gemini in Antigravity.** You own the backend and durable data
layer. Inspect the existing project before editing, coordinate contracts
early, and never report a test as passing unless you actually ran it.

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

**Primary owner:** API design, validation, persistence, server-side
services, real-time event delivery, offline-sync reconciliation, backend
tests, and configuration.

Suggested ownership: - `server/src/routes/` - `server/src/services/` -
`server/src/realtime/` - `server/src/db/` - `server/src/validation/` -
`shared/` for agreed types/contracts - Backend tests and
environment/config documentation

Do not build the frontend independently or duplicate Person 3's pure
algorithms without coordination. Agree which logic runs on the server
and which runs in the browser. For hackathon reliability, keep the
architecture simple.

## First actions

1.  Inspect repository, package scripts, runtime, existing database,
    environment files, and Git status.
2.  Preserve existing working conventions. Do not replace the stack just
    because a template suggests another one.
3.  Propose a short API/data contract and share it with Person 1 and
    Person 3 before implementation.
4.  Use TypeScript if consistent with the existing project. Select the
    simplest storage option that meets persistence and deployment needs;
    document limitations honestly.
5.  Add setup instructions and an `.env.example` with placeholder names
    only. Never commit secrets.

## Required backend capabilities

### A. Shared incident and dashboard data

-   Provide validated create/list/read/update behavior for incident
    reports.
-   Store type, priority, description/notes, demo location,
    created/updated timestamps, source module, status, and sync metadata
    as appropriate.
-   Return dashboard summaries computed from stored records rather than
    hardcoded numbers.
-   Provide filtering and stable ordering for incident history.
-   Use IDs generated safely by the server or a documented shared
    strategy.
-   Avoid duplicate incident creation when a client retries a sync
    request.

### B. FieldLink offline sync

-   Accept batches of locally queued reports with stable
    client-generated IDs or idempotency keys.
-   Validate each item independently and return a result for each item:
    accepted, already received, or rejected with a safe reason.
-   Make repeated sync requests idempotent.
-   Preserve the original creation time while recording server
    receipt/sync time.
-   Do not trust client-supplied server status, role, or permissions.
-   Expose enough status for the UI to distinguish pending, synced, and
    failed records.
-   Document that browser offline queueing is client-side; this API
    handles reconciliation after connectivity returns.

### C. SkyWatch telemetry and alerts

-   Provide an endpoint or event stream for synthetic telemetry and
    alerts.
-   Keep the "simulation" origin explicit in records and API responses.
-   Store track ID, position, speed, heading, timestamp, and any derived
    alert reason needed by the app.
-   Support a deterministic scenario or seed so the demo can be
    replayed.
-   If using Socket.IO or WebSockets, provide a polling/REST fallback
    and handle reconnects.
-   Do not imply that the backend receives real sensor feeds unless such
    integration actually exists.

### D. GeoIntel observations and reports

-   Store candidate changes, image/sample identifiers, coordinates or
    normalized image locations, score/confidence field if the algorithm
    supplies one, explanation, analyst notes, review status, and
    timestamps.
-   Validate all references and numeric ranges.
-   Keep candidate changes distinct from confirmed facts.
-   Provide list/create/update operations sufficient for review workflow
    and report generation.
-   Do not invent analysis output or claim a model ran if it did not.

### E. MediRoute patient and route data

-   Persist fictional demo patient/casualty records and workflow status.
-   Store the rule version/reason that produced the triage category
    where applicable, so results are explainable.
-   Persist route inputs/results or recalculate them through the agreed
    routing service.
-   Allow hazards/blocked road edges to be created or updated and
    returned to the frontend.
-   Treat triage as configurable demonstration logic, not a clinically
    validated system.

## Suggested initial API contract

Finalize this list with the other teammates before implementation: -
`GET /api/health` - `GET /api/dashboard` - `GET /api/incidents` -
`POST /api/incidents` - `PATCH /api/incidents/:id` - `POST /api/sync` -
`GET /api/telemetry` - `GET /api/alerts` - `PATCH /api/alerts/:id` -
`GET /api/geointel/observations` - `POST /api/geointel/observations` -
`PATCH /api/geointel/observations/:id` - `GET /api/patients` -
`POST /api/patients` - `PATCH /api/patients/:id` - `GET /api/hazards` -
`POST /api/hazards` - `POST /api/routes/calculate` (if routing is a
server service) - Optional live event channel with documented event
names and payloads.

For each endpoint, document request/response shapes, validation
failures, status codes, and whether it is simulated. Avoid exposing
implementation-specific database objects directly as public API
responses.

## Data and reliability rules

-   Choose a persistence mechanism appropriate to the deployment; verify
    persistence in the actual environment. If using SQLite/local files,
    check hosting constraints. If using Firebase, it must be genuinely
    integrated and demonstrable before claiming the guide's Firebase
    tool trial.
-   Validate request bodies, enum values, string lengths, coordinate
    ranges, and IDs.
-   Use consistent error responses,
    e.g. `{ "error": { "code": "...", "message": "..." } }`, adapted to
    the existing conventions.
-   Add request size limits and avoid logging sensitive content
    unnecessarily.
-   Handle CORS and environment configuration deliberately.
-   Use timestamps in a consistent ISO format and document the time
    basis.
-   Add health check and useful startup logs without secrets.
-   Use migrations/schema setup or deterministic initialization scripts
    where appropriate.
-   Seed only clearly labelled fictional data. Ensure demo reset is safe
    and deliberate.
-   Do not create security-sensitive features that are not needed for
    the demo.

## Milestones

1.  **M1 --- Contract:** shared types, endpoint list, error format,
    ID/idempotency strategy agreed.
2.  **M2 --- Persistence:** schema/repository layer and deterministic
    seed/reset.
3.  **M3 --- Core APIs:** incidents, dashboard, patients, observations,
    telemetry/alerts, hazards.
4.  **M4 --- Sync/realtime:** idempotent batch sync and optional live
    events with fallback.
5.  **M5 --- Validation/testing:** API tests, persistence/restart test,
    error paths, integration with frontend.
6.  **M6 --- Demo hardening:** clean startup, deployment-compatible
    storage, health check, README instructions.

## Backend test checklist

-   Valid requests succeed and invalid fields return clear 4xx errors.
-   Stored records remain after refresh/restart under the documented
    deployment setup.
-   Repeating a sync batch does not duplicate records.
-   Partial batch failure returns per-item outcomes.
-   Dashboard totals match stored records.
-   Patient status and observation review updates persist.
-   Route calculation uses the current blocked-road/hazard state.
-   Live channel reconnect behavior is safe; REST fallback works if live
    delivery is unavailable.
-   Seed/reset creates repeatable demo data and does not silently erase
    user work.
-   No secrets are exposed in logs or committed files.

## Definition of done

Backend is done only when Person 1 can integrate against documented,
tested contracts; records persist in the intended demo environment; sync
retries are safe; and every module's required workflow has real data
handling behind it rather than hardcoded UI-only results.

## Final response required from Antigravity

At the end of each work session, report: 1. Files changed. 2.
Endpoints/contracts added or changed. 3. Persistence and sync behavior
implemented. 4. Tests/commands actually run and results. 5.
Deployment/environment limitations. 6. Unresolved decisions for Person 1
or Person 3.
