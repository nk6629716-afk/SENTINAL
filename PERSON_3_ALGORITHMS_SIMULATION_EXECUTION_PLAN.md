# Person 3 Execution Plan --- Algorithms, Simulations & Module Logic

**Use with Gemini in Antigravity.** You own the deterministic feature
logic and synthetic demo scenarios for all four problem statements. Keep
algorithms explainable and testable, and coordinate data contracts with
Persons 1 and 2.

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

**Primary owner:** pure algorithms, synthetic data generators, module
logic, demo scenarios, and tests. Decide with the team which functions
execute client-side and which are called through the backend. Keep
algorithm code independent of UI components wherever practical.

Suggested ownership: - `src/algorithms/` - `src/simulation/` -
`src/modules/*/logic/` - `src/data/` - `tests/algorithms/` - Module
logic documentation and demo fixtures

Do not create a second data model that conflicts with `shared/`. Agree
on types and stable IDs with Person 2. Give Person 1 simple, documented
functions and outputs that the UI can render.

## First actions

1.  Inspect repository structure and current types before coding.
2.  Write down input/output contracts for each algorithm and agree them
    with teammates.
3.  Implement pure, deterministic functions first; keep randomness
    seeded and make it possible to reset a demo.
4.  Add tests for normal cases, edge cases, and invalid input.
5.  Clearly separate generated synthetic data from any real source data.
    Do not silently fabricate live feeds or imagery.

## Module 1 --- FieldLink offline reports and awareness

Implement and test: - A local report queue abstraction that can be
backed by IndexedDB or the agreed client storage layer. - Stable
client-side IDs/idempotency keys for queued reports. - Queue states such
as `pending`, `syncing`, `synced`, and `failed`. - A sync coordinator
that submits pending items, handles per-item results, and avoids marking
failed items as synced. - Retry behavior that is safe when a request is
repeated or the network drops mid-sync. - A merge/reconciliation
strategy that preserves original timestamps and avoids duplicates. -
Demo fixtures for online report creation, offline report creation,
reconnect, successful sync, partial failure, and retry.

Coordinate actual browser connectivity, persistence, UI states, and
server batch-sync semantics with Persons 1 and 2. Do not claim real
tactical radio communications; this work demonstrates offline-first
browser reporting.

## Module 2 --- SkyWatch synthetic telemetry and anomaly detection

Build a deterministic simulator that emits tracks with: - Track ID,
position, speed, heading, timestamp, and simulation marker. - Plausible
movement in a fictional demo area. - Start, pause, step, and reset
operations where practical. - Seeded scenarios for ordinary movement and
at least two deliberate anomaly examples.

Implement transparent, explainable rules, for example: - Sudden speed
change beyond a configurable threshold. - Route deviation beyond a
configurable distance. - Entry into a fictional configured zone. - Stale
telemetry when updates stop beyond a threshold.

For every alert return: alert ID, track ID, severity, timestamp, rule
name, threshold/configuration, observed value, and a plain-language
reason. Avoid opaque "AI detected threat" claims. Add unit tests for
true-positive scenario examples, normal behavior, threshold boundaries,
missing/stale samples, and reset repeatability. Label every track and
alert as simulated.

Do not implement real-world targeting, interception, weapon guidance, or
claims of verified hostile identification. This is a monitoring and
explainable anomaly demonstration.

## Module 3 --- GeoIntel image comparison and change candidates

Build a reproducible comparison pipeline for bundled, aligned demo
images: - Validate image dimensions and required input. - Use a
straightforward image-difference method, such as per-pixel/channel
difference with configurable threshold, optionally followed by simple
region grouping. - Return candidate regions with bounding boxes or
normalized coordinates, difference score, input image IDs, algorithm
settings, and known limitations. - Allow the analyst workflow to
review/mark candidates; keep algorithm output separate from
analyst-confirmed observations. - Provide at least one fixture with
known differences and one fixture that should yield few/no candidates. -
Handle dimension mismatch or unsupported input explicitly rather than
returning fake success.

Test reproducibility, identical images, known differences, threshold
behavior, and image mismatch. Do not claim semantic recognition, object
identity, or real intelligence conclusions unless separately implemented
and validated. State that alignment, lighting, shadows, compression, and
viewpoint can create false candidates.

## Module 4 --- MediRoute triage rules and hazard-aware routing

Implement a configurable demonstration rule set, not a clinical decision
system: - Define fictional input fields and accepted ranges. - Return
category, rule identifier/version, explanation, and any missing-data
warning. - Keep the rule transparent enough for a judge to inspect. - Do
not label the rules clinically validated or present them as medical
advice.

For routing: - Build a small fictional graph of roads/nodes with aid
points. - Represent blocked roads/hazards explicitly as unavailable
edges or increased cost, according to the agreed model. - Implement
Dijkstra or A\* on that graph. - Return route nodes/edges, total
cost/distance, and a clear "no route found" outcome. - Recalculate from
the current hazard state and make a seeded scenario where blocking a
road changes the selected route. - Test shortest route, blocked shortest
path, alternate route, disconnected graph, invalid origin/destination,
and no-route case.

Keep routing on a fictional demo graph unless the team has a suitable,
licensed, validated real map dataset. Never imply the simplified triage
rules replace qualified clinical judgement.

## Shared demo data and integration

Provide a coherent fictional scenario that connects the modules: 1. A
simulated observation or FieldLink report creates an incident. 2. A
road-blockage report updates the shared hazard state. 3. MediRoute
recalculates a route using the new blockage. 4. GeoIntel contributes a
candidate observation that an analyst can review. 5. SkyWatch produces a
simulated track alert with an explicit explanation.

The cross-module story must be optional and resettable. Keep data
internally consistent; use stable IDs and a single source of truth where
backend persistence is required.

## Suggested file boundaries

-   `src/algorithms/skywatch/*`
-   `src/algorithms/geointel/*`
-   `src/algorithms/mediroute/*`
-   `src/modules/fieldlink/logic/*`
-   `src/simulation/scenarios/*`
-   `src/data/demoFixtures.*`
-   `tests/algorithms/*`

Adapt these to the existing repository rather than creating duplicate
folders. Avoid changing shared types without a team agreement.

## Milestones

1.  **M1 --- Contracts and fixtures:** agree TypeScript types and create
    deterministic demo fixtures.
2.  **M2 --- FieldLink:** local queue states, retry/idempotency
    behavior, sync tests.
3.  **M3 --- SkyWatch:** telemetry simulator, explainable anomaly rules,
    map-ready outputs.
4.  **M4 --- GeoIntel:** image difference function, candidate regions,
    review-state contract.
5.  **M5 --- MediRoute:** configurable demo triage rules and
    hazard-aware graph routing.
6.  **M6 --- Integration:** cross-module scenario, deterministic reset,
    unit tests, integration notes.

## Test checklist

-   All algorithms are deterministic under the same inputs/seed.
-   Thresholds and rule reasons are visible and documented.
-   Invalid inputs and boundary cases have explicit outcomes.
-   Offline sync never silently loses or duplicates a report.
-   Identical images do not produce spurious large change regions under
    default settings.
-   Triage output includes the reason and rule version.
-   Route changes when the relevant edge is blocked and returns a useful
    no-route result when disconnected.
-   Demo reset restores known data and simulation state.
-   No module presents synthetic results as real-world observations.

## Definition of done

Your work is done when all four problem statements have a testable
algorithm/logic path, every result has an understandable explanation,
test fixtures are reproducible, and Persons 1 and 2 can integrate
without guessing the data format.

## Final response required from Antigravity

At the end of each work session, report: 1. Files changed. 2. Algorithms
and scenarios implemented. 3. Tests actually run and results. 4.
Types/contracts needed from or changed with teammates. 5. Known
limitations and edge cases. 6. Next integration step.
