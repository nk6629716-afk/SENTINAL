# SENTINEL — GeoIntel Functional Rebuild Execution Plan

**Owner:** Person 1 — Frontend / Product Experience  
**Agent:** Gemini 3.8 in Antigravity  
**Module:** GeoIntel Recon — Geospatial Intelligence & Reconnaissance Analysis

## CRITICAL DESIGN LOCK — DO NOT CHANGE THE EXISTING UI THEME

**The GeoIntel section's UI/UX design theme, layout language, colors, typography, sidebar, header, spacing, borders, shadows, component styling, navigation, and light/dark behavior MUST remain exactly consistent with the existing SENTINEL application as it looks before this task.** The existing neumorphic theme and current app-wide visual system are locked. Do not redesign, restyle, modernize, simplify, or reinterpret the theme. Do not introduce a new layout or a separate visual identity for GeoIntel. Reuse the existing shared components and styles. Only rebuild the GeoIntel section's functionality, information architecture where essential for comprehension, and content presentation inside the established design system. Any new component must visually match the current application.

## Goal

The current GeoIntel section is confusing and does not clearly demonstrate its purpose. Rebuild the section so a judge or first-time user can immediately understand and complete this workflow:

**Choose a before/after image pair → run image comparison → see detected candidate changes → inspect a candidate → add analyst notes → mark it reviewed → generate a report.**

GeoIntel is an **image-based change-detection and analyst-review tool** for two images of the same geographic area taken at different times. It is not merely a map page, a satellite-image gallery, or a decorative mockup.

Implement a real, working, deterministic workflow using the project's existing stack and APIs. Inspect the repository first and adapt to what exists; do not blindly overwrite it.

## 1. Inspect before changing anything

1. Inspect the current GeoIntel route, components, styles, data types, API client, server endpoints, and related Person 2 / Person 3 integration points.
2. Run the current app and inspect the existing GeoIntel experience.
3. Identify which parts are functional, mocked, broken, or missing.
4. Find existing sample imagery and image-analysis logic before creating replacements.
5. Check existing API contracts and shared data models. Reuse them when possible.
6. Before editing, list the files you plan to change and any API/model gaps you found.
7. Do not change unrelated modules or global styles.

## 2. The exact user-facing workflow

The GeoIntel page must make the following sequence obvious and functional.

### Step A — Select an image comparison

Provide a clearly named comparison selector with at least one bundled, reproducible sample pair. Each pair must have:
- A human-readable comparison name.
- A `BEFORE` image and an `AFTER` image.
- Image IDs or filenames.
- Capture labels/timestamps if actually known; otherwise use neutral labels such as “Sample A” and “Sample B” rather than inventing real-world dates.
- A clear disclosure that the sample imagery and scenario are synthetic/demo data when applicable.

If the project has no usable image pair, create a small, deterministic local demo pair specifically for this workflow and document that it is synthetic. Do not fetch random imagery at runtime. Do not rely on an external service or internet connection for the basic demo to work.

### Step B — View the images clearly

Display the before and after images next to each other on desktop, with consistent dimensions and an obvious label above each image. On small screens, stack them vertically or provide a usable comparison switcher.

Requirements:
- Preserve aspect ratio; do not stretch imagery to fit.
- Show a useful loading state while images load.
- Show a clear error if an image is missing or cannot be decoded.
- If dimensions differ and the algorithm requires matching dimensions, explain the issue and either normalize both images through an explicit, tested preprocessing step or disable analysis with a clear actionable message.
- Provide a simple opacity overlay or swipe comparison only if it can be implemented reliably; it is optional and must not replace the side-by-side view.

### Step C — Run change detection

Add a prominent, clearly named **Run comparison** button. It must execute the real local comparison algorithm or the existing API-backed analysis—not just change the screen or show fabricated results.

Provide an understandable threshold control only if supported by the algorithm. Explain briefly that a lower threshold detects more small pixel differences and can increase false positives; a higher threshold ignores smaller differences.

Show progress/loading feedback while processing. Prevent duplicate submissions while a run is in progress. On failure, display a useful error and allow retry. A failed request must never be displayed as a successful analysis.

### Step D — Display results and candidate regions

After analysis, show a concise results summary based on the actual returned computation:
- Analysis status.
- Number of candidate regions found.
- Comparison pair used.
- Threshold/settings used.
- Algorithm name/version if available.
- Processing time only if measured.

Overlay visible outlines or bounding boxes for detected candidate regions on the AFTER image or on a dedicated result image. The overlays must correspond to actual algorithm output. Candidate regions must be selectable.

When there are no differences above threshold, show a clear “No significant pixel differences detected at this threshold” state—not an empty or broken page.

When analysis has not been run, show a helpful initial state explaining what to do next.

### Step E — Inspect one candidate

Selecting a candidate must visibly highlight it and populate a details panel with real result fields where available:
- Candidate ID.
- Bounding box / pixel coordinates.
- Normalized image coordinates or geographic coordinates only if a valid transformation/source exists.
- Difference score or changed-pixel measure, with a plain-language explanation.
- Threshold and algorithm used.
- Review status.

Never invent geographic coordinates. If the inputs are ordinary sample images without georeferencing, label the position as **image pixel coordinates**, not latitude/longitude. Do not imply that a pixel box is a verified geographic location.

Keep the selected candidate synchronized between the result image and candidate list. Clicking a row selects/highlights the same region; clicking a region selects its row/details.

### Step F — Review and save

Provide working analyst review controls:
- Add or edit an analyst note.
- Set a supported review status, such as `Unreviewed`, `Reviewed`, or `Dismissed`.
- Save changes with visible success/error feedback.
- Preserve review data using the existing API/persistence layer when available.

If the backend endpoint is not available, first inspect the shared API contracts and coordinate with the existing integration rather than silently creating an incompatible schema. A clearly labelled local-only fallback may be used only if necessary, and the UI must state that it has not been saved to the server. Do not claim server persistence when it did not happen.

### Step G — Generate a report

Add a working **Generate report** action that creates a concise report from the actual comparison and review state. Include:
- Report title and generation time.
- Comparison pair/image IDs.
- Analysis method and settings.
- Number of candidate regions.
- Candidate details and review statuses.
- Analyst notes.
- Limitations and demo/synthetic-data disclosure.

Use an existing report/export pattern if the project has one. Otherwise generate a client-side downloadable text, Markdown, or JSON report using browser-supported APIs and current state. Do not add a dependency unless necessary. The report action must produce a real output, not a toast claiming success without creating anything.

## 3. Image-difference algorithm and interpretation

Inspect the current Person 3 algorithm before implementing a second version. Prefer calling the existing tested algorithm through the current module interface.

If no working algorithm exists, implement a small deterministic pixel-difference fallback in the existing frontend logic layer, or coordinate with the shared algorithm owner. Keep UI components separate from computation.

Minimum algorithm behavior:
1. Decode both images.
2. Check/normalize dimensions in a documented and tested way.
3. Compare corresponding pixels using a defined difference metric, such as per-pixel RGB distance.
4. Apply a configurable or documented threshold.
5. Group adjacent changed pixels into candidate regions using a simple, deterministic connected-component or grid-based grouping method.
6. Filter tiny regions only through a documented minimum-area setting.
7. Return stable candidate IDs/order and bounding boxes for identical inputs and settings.
8. Return clear validation errors for invalid image inputs.

Do not pretend this basic pixel-difference method understands objects, military assets, or threat intent. It identifies visual differences only. Lighting, shadows, compression, seasonal change, misalignment, and rescaling may cause false positives. State this in the UI and report.

Do not implement an elaborate computer-vision framework unless the existing project already has one and it is appropriate. A small correct, tested, explainable algorithm is better than a visually impressive fake.

## 4. Required states and edge cases

Implement and verify all of these:

- Initial state before a pair is selected.
- Sample pair selected but analysis not run.
- Analysis running.
- Successful analysis with candidate regions.
- Successful analysis with zero candidate regions.
- Invalid or undecodable image.
- Dimension mismatch, if unsupported.
- Analysis/API failure with retry.
- Candidate selected.
- Note edited but not yet saved.
- Review save success and failure.
- No candidates available for review.
- Report generated successfully and report-generation failure.
- Refresh/re-entry behavior consistent with the project's persistence model.

Never show a false success state. Disable controls only when necessary and explain why.

## 5. UI comprehension requirements

Without changing the existing design theme, make the page understandable to a first-time judge in under ten seconds.

Use clear, direct labels in the existing component style:
- `GeoIntel Recon`
- `Compare Images`
- `BEFORE`
- `AFTER`
- `Run comparison`
- `Candidate changes`
- `Candidate details`
- `Analyst notes`
- `Review status`
- `Generate report`

Include one short explanation near the top: “Compare two images of the same area to highlight visual differences for analyst review.”

Do not bury the main workflow under technical metadata. Keep the primary action obvious. Present technical details in a secondary details area. Avoid unexplained acronyms, tiny low-contrast text, decorative metrics, and empty panels that look broken.

## 6. Strict design preservation rules

This is mandatory:

- **Keep the existing SENTINEL UI/UX theme and layout styling exactly as it is before this task.**
- Reuse the existing app shell, sidebar, page header, colors, typography, spacing scale, shadows, borders, controls, cards, and theme tokens.
- Preserve current light/dark theme behavior and ensure any new GeoIntel elements work in both modes.
- Do not change global CSS, shared theme tokens, navigation layout, or other modules for this task.
- Do not introduce a new visual design system or a different style just for GeoIntel.
- Do not replace existing shared components with a new component library.
- You may rearrange GeoIntel's internal content only as needed to make the image-comparison workflow clear, but all components must look like they belong to the current app.
- If a needed component does not exist, create it using existing design tokens and component conventions.

## 7. Integration requirements

- Reuse existing shared types, API clients, and endpoints.
- Keep analysis logic outside presentation components.
- Keep selected pair, analysis result, selected candidate, notes, and review status in a coherent state model.
- Avoid duplicating state already managed by the server or shared stores.
- Handle asynchronous requests and component unmounting safely.
- Avoid race conditions when changing image pairs or running analyses repeatedly.
- Ensure the candidate list, overlay, details panel, and report all derive from the same analysis result.
- Do not break dashboard summaries, unified activity feed, navigation, or other modules.
- Do not invent an API route or data schema without checking the existing server and shared types first.

## 8. Tests and acceptance criteria

Add or update tests in the project's existing test framework. At minimum verify:

1. Two identical images produce zero changed pixels/candidates under the default settings.
2. A known changed rectangle is detected and its bounding box overlaps the expected area.
3. Threshold changes affect detection in the expected direction.
4. Invalid image input is handled without crashing.
5. Dimension mismatch follows the documented behavior.
6. Candidate selection updates the displayed details.
7. Review notes/status save and reload according to the actual persistence layer.
8. Report output includes the current comparison and review data.
9. Empty-result and error states render correctly.
10. The existing app build and other module routes still work.

Run the actual tests, typecheck, lint, and build scripts available in the repository. Do not claim a test passed unless it was run.

## 9. Definition of done

- A first-time user can understand what GeoIntel does without explanation.
- The complete compare → detect → inspect → review → report workflow works.
- Detected regions and scores come from real computation/API results, not hardcoded examples.
- At least one bundled reproducible sample pair works without internet access.
- Candidate selection and overlays remain synchronized.
- Review notes/status and report generation work and communicate persistence honestly.
- False-positive limitations and synthetic/demo data are disclosed.
- Empty, loading, error, and zero-change states are polished and understandable.
- The existing SENTINEL theme/layout is preserved exactly; no global redesign or unrelated module changes occur.
- Existing app routes and workflows still work.
- Validation results and any limitations are reported honestly.

## 10. Final report

When finished, summarize:
1. Files changed and why.
2. The actual comparison algorithm used and where it lives.
3. How to run the full GeoIntel workflow from start to finish.
4. Where review notes/status are persisted.
5. How report export works.
6. Tests and build commands run, with real results.
7. Any remaining gaps or limitations.

## Start now

Inspect the existing GeoIntel implementation, shared APIs, and Person 3 algorithm first. Then rebuild GeoIntel into a clear, functional image-change analysis and review tool, integrating with the existing project. **Preserve the current SENTINEL UI/UX design theme and layout exactly as it is before this task. Do not restyle anything.** Implement and verify the complete workflow; do not stop at a plan or static mockup.
