# SENTINEL — Neumorphic UI Redesign Execution Plan

**Role:** Person 1 — Frontend & Product Experience  
**IDE:** Antigravity  
**Coding agent:** Gemini 3.8  
**Project:** SENTINEL — Integrated Situational Awareness & Emergency Response Platform

## 1. Objective

Redesign the existing SENTINEL frontend using a polished **neumorphic design system**. The current application runs, but its interface feels generic, simple, and AI-generated.

The new design should feel premium, cohesive, calm, tactile, and purpose-built. Use soft raised surfaces, recessed panels, subtle shadows, rounded geometry, refined typography, consistent spacing, and a clear operational information hierarchy.

This is a redesign of the existing working product, not a new static mockup.

## 2. Non-negotiable requirements

- Inspect the repository before making changes.
- Preserve the current framework, routes, API contracts, state management, data models, and existing working features.
- Keep all four modules functional: FieldLink, SkyWatch, GeoIntel, and MediRoute.
- Do not replace actual API data with hardcoded demo values.
- Do not remove working controls or implement decorative buttons.
- Reuse the current styling system and installed dependencies wherever possible.
- Make desktop, tablet, and mobile layouts responsive.
- Preserve accessibility, keyboard navigation, semantic markup, readable contrast, and visible focus states.
- Clearly label simulated telemetry and scenarios.
- Never present synthetic drone telemetry as actual detections, anomalies as proof of hostile intent, or illustrative triage as clinically validated medical advice.
- Do not claim browser-based offline queueing provides radio or device-to-device communications.

## 3. Visual identity

### Design concept: Soft Tactical Interface

Combine neumorphic surfaces with a professional situational-awareness console.

The interface should have:
- Soft, light grey surfaces with subtle highlights and shadows.
- A warm, neutral canvas instead of a stark white background.
- Raised controls and cards used selectively.
- Recessed panels for inputs, search, filters, and selected work areas.
- Rounded corners with consistent geometry.
- Clear typography and well-spaced content.
- Restrained green, amber, red, and blue accents for meaningful states.
- Consistent navigation and layouts across all four modules.

Avoid:
- Excessive rounded cards everywhere.
- Heavy shadows that make the interface look dated.
- Low-contrast grey text.
- Rainbow gradients, glowing borders, and decorative animations.
- Generic dashboard templates with four identical cards.
- Hiding important status information inside subtle or low-contrast components.
- Using neumorphism for every element when a normal table or flat divider would be clearer.

## 4. Design tokens

Adapt these values to the existing project styling architecture.

### Color palette

- Main canvas: `#E8EBF0`
- Raised surface: `#E8EBF0`
- Recessed surface: `#DDE1E8`
- Primary text: `#202936`
- Secondary text: `#667085`
- Subtle border: `#D2D8E1`
- Primary accent: `#4669A8`
- Healthy/synced: `#397653`
- Warning/pending: `#A86B12`
- Critical/error: `#B93838`
- Informational: `#356B8C`

Use a shared canvas and surface palette to create the neumorphic effect. Status colors must communicate actual states and remain readable.

### Shadows

Use paired shadows sparingly:
- Raised surfaces: a soft light highlight from the upper-left and a muted dark shadow toward the lower-right.
- Recessed surfaces: a subtle inner highlight and inner shadow.
- Hover: slightly increased depth, not a dramatic jump.
- Pressed/active controls: a recessed appearance.

Example CSS direction:

```css
:root {
  --surface: #e8ebf0;
  --surface-inset: #dde1e8;
  --text-primary: #202936;
  --text-secondary: #667085;
  --accent: #4669a8;

  --shadow-raised:
    6px 6px 14px rgba(163, 174, 192, 0.45),
    -6px -6px 14px rgba(255, 255, 255, 0.85);

  --shadow-inset:
    inset 3px 3px 7px rgba(163, 174, 192, 0.35),
    inset -3px -3px 7px rgba(255, 255, 255, 0.8);
}
```

Treat this as a starting point. Adjust shadows after seeing the actual application. Avoid applying strong shadows to every element.

### Typography

- Use a clean modern sans-serif for headings, body text, and controls.
- Use a monospace font for IDs, timestamps, telemetry values, and queue metadata.
- Establish a consistent hierarchy for page titles, section headings, labels, and body copy.
- Avoid tiny text and excessive uppercase labels.
- Use existing fonts when suitable; avoid unreliable external dependencies.

### Shape and spacing

- Use consistent medium corner radii, approximately 12–20px for major panels and 8–12px for controls.
- Use a spacing scale such as 4, 8, 12, 16, 24, 32, and 40px.
- Reserve the strongest shadows for primary panels and important controls.
- Use flatter surfaces for dense data tables and text-heavy content.
- Maintain consistent alignment, padding, and panel spacing.

## 5. Shared application shell

Redesign the shared application shell before individual module pages.

### Header

Create a clean masthead with:
- SENTINEL wordmark.
- Short product descriptor.
- Simulation/demo indicator where applicable.
- User/system actions that already exist in the project.

### Sidebar

Create a consistent navigation sidebar with:
- Dashboard.
- FieldLink.
- SkyWatch.
- GeoIntel.
- MediRoute.

Use a subtle recessed sidebar surface. The active item should have an unmistakable state using an accent, a slightly raised/recessed treatment, and clear text—not shadow alone.

Preserve existing route paths and navigation behavior.

### System status

Add a compact system-status area showing only values supported by current application state:
- API/connectivity status.
- Pending offline queue count.
- Last successful synchronization.
- Active alerts or unresolved incidents if available.

Do not invent counts, timestamps, or healthy states.

### Responsive behavior

On mobile:
- Convert the sidebar to an accessible menu or compact navigation.
- Stack panels by importance.
- Keep the page title, key status, and main action near the top.
- Avoid horizontal overflow.
- Keep buttons and touch targets comfortable to use.
- Maintain readable tables and telemetry lists.

## 6. Dashboard redesign

Create a visually distinctive overview rather than a grid of identical cards.

Suggested structure:

1. Welcome/page header and system status.
2. A prominent current-situation panel.
3. A compact row or grid of meaningful system indicators.
4. Four distinct module summaries with direct navigation actions.
5. Unified activity timeline using actual available events.
6. A simulation/data disclaimer where relevant.

Use raised surfaces for important overview panels and flatter layouts for dense information.

Every number and status must come from existing state or API data. If there is no data, show a designed empty state instead of fabricating activity.

## 7. Module-specific designs

### FieldLink — Offline Reports

Design it as a tactile field-report workspace.

Include:
- Clear online/offline state.
- Pending synchronization count.
- Structured report form with recessed input fields.
- Report list with ID, type, timestamp, summary, and sync status.
- Distinct local/pending, syncing, synced, and failed states.
- Functional retry/sync actions and clear feedback.

Preserve existing local persistence and synchronization behavior. Clearly distinguish a locally saved report from a server-confirmed report.

### SkyWatch — Telemetry and Alerts

Design it as a monitoring workspace.

Include:
- Prominent simulated-telemetry disclosure.
- Existing map/chart/telemetry visualization as the focal point.
- A readable telemetry list with freshness and status.
- An alert panel with severity, triggering rule, evidence, and acknowledgement state.
- Functional start, pause, reset, and acknowledgement controls where available.
- Clear loading, empty, and failure states.

Use accent colors sparingly. Do not rely on colored shadows to convey alert severity. Explain that anomalies are review cues and do not establish hostile intent.

### GeoIntel — Image Comparison

Design it as a visual analysis workbench.

Include:
- Aligned BEFORE and AFTER image panels.
- Clear image metadata where available.
- Selectable candidate-change regions.
- A review panel with evidence, notes, and supported review statuses.
- Clear states for missing images, no differences, and errors.
- A short explanation that image differences may be false positives caused by alignment, lighting, or environmental changes.

Keep image comparison as the main focus. Do not label candidate changes as confirmed threats.

### MediRoute — Triage and Evacuation Routing

Design it as a two-panel decision-support workspace.

Include:
- Explicit illustrative-triage/simulation label.
- Patient or incident list.
- Selected-record details and transparent triage reasoning.
- Triage category and status that remain understandable without color.
- Route visualization showing blocked segments, chosen route, alternatives, or no-route state where supported.
- Functional status updates and route recalculation.

Do not present the triage rules as clinically validated or routes as guaranteed-safe real-world evacuation directions.

## 8. Interaction design

Every interactive element must work.

- Buttons must perform their labelled actions.
- Links must navigate to real destinations.
- Forms must validate and display clear errors.
- Loading, empty, error, offline, pending, disabled, and success states must be designed.
- Never show a successful result when an API request failed.
- Use subtle hover/focus/pressed transitions.
- Provide visible keyboard focus.
- Honor `prefers-reduced-motion`.
- Do not use shadows alone to communicate selection or status.
- Avoid animations that distract from operational information.

Create or improve shared components only where useful. Reuse the current component structure instead of creating duplicate systems.

## 9. Implementation phases

### Phase 0 — Inspect

1. Inspect the repository structure, framework, routes, styling, shared components, API client, and module screens.
2. Run the existing application.
3. Inspect available test, lint, typecheck, and build scripts.
4. Identify working, incomplete, and mocked functionality.
5. List the files you intend to modify before major changes.

### Phase 1 — Design system

1. Add neumorphic design tokens using the existing styling system.
2. Standardize colors, typography, spacing, shadows, borders, buttons, form fields, and status labels.
3. Test shadow strength and text contrast.
4. Ensure the global styling does not break existing functionality.

### Phase 2 — Shared shell

1. Redesign the masthead and navigation.
2. Implement the system-status area using real data.
3. Create consistent page headers and panel styles.
4. Test routing and responsive behavior.

### Phase 3 — Dashboard

1. Implement the new overview layout.
2. Connect all metrics and timeline entries to actual state/API data.
3. Add empty, loading, and error states.
4. Verify all existing dashboard actions.

### Phase 4 — Modules

Redesign in this order unless repository dependencies require otherwise:

1. FieldLink.
2. SkyWatch.
3. GeoIntel.
4. MediRoute.

For each module, preserve its data flow, APIs, and working actions. Improve hierarchy and visual presentation without replacing functional behavior with mockups.

### Phase 5 — Validation

- Test all routes and primary workflows.
- Run actual project build, lint, typecheck, and test commands.
- Check browser console for errors.
- Verify loading, empty, failure, offline, and successful states.
- Check widths around 1440px, 1024px, 768px, and 390px.
- Check contrast, keyboard focus, touch targets, and horizontal overflow.
- Reduce overly strong or inconsistent shadows.
- Fix regressions before declaring the work complete.

## 10. Definition of done

- [ ] Existing application still runs and builds.
- [ ] Dashboard and all four modules share a consistent neumorphic visual identity.
- [ ] The interface feels premium and purposeful, not like a generic AI dashboard.
- [ ] Shadows and rounded surfaces are subtle and consistent.
- [ ] Dense operational information remains readable.
- [ ] Existing routes, APIs, forms, and actions still work.
- [ ] Simulation and safety disclaimers remain visible.
- [ ] Empty, loading, error, offline, pending, and success states are handled.
- [ ] Desktop, tablet, and mobile layouts are usable.
- [ ] No fake data or misleading operational claims were introduced.
- [ ] Actual validation results are reported honestly.

## 11. Final report

At completion, provide:
1. Exact files changed and their purpose.
2. Summary of the new design system.
3. Features and workflows checked.
4. Exact commands run and pass/fail results.
5. Known issues or incomplete work.
6. Short prioritized follow-up list.

Do not claim tests passed unless they were actually run. Do not stop after producing a mockup; implement the redesign in the existing application and verify it.

## Start

Inspect the repository and current running app first. Then implement this redesign in small, verifiable phases. Preserve working functionality and prioritize usability, accessibility, and visual consistency over decorative effects.
