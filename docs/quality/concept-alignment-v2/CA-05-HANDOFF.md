# CA-05 Handoff — Graph selection and bounded GSAP motion

Task ID: CA-05
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-05`; executed directly in clean working tree conforming to exact allowlist)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy performed.
Stop marker: **`CA-05_HANDOFF_READY`**

---

## 1. Dependencies & Authorization

`execution-tasks.json` (v2.1.0) and `packets/CA-05.md` authorize packet CA-05 with `depends_on: [CA-04]`.

- Packet CA-04 delivered the original procedural constellation renderer and deterministic layout against locked scene contract `ca03-1.0.0`.
- CA-05 implements selection state management, accessible native-control enhancement, projected HTML labels, and GSAP scene choreography.
- CA-05 does **not** integrate public routes or animate DOM on live pages (owned by CA-06).
- Unrelated routes do not import the demo component.

---

## 2. Changed Paths (Exact Allowlist Only)

- `src/lib/visual/graph-controller.ts` (NEW) — native selection controller implementing `GraphControllerFactory`, DOM synchronization for `<details>`/`<summary>`, edge emphasis, detail panel updates, focus restoration, and Escape key handling.
- `src/lib/visual/graph-motion.ts` (NEW) — GSAP bounded scene choreography: 750ms scene settle, 220ms selection transition, ±3° fine-pointer tilt, demand-driven renders, live reduced-motion support, and tab visibility pauses.
- `src/lib/visual/graph-controller.test.ts` (NEW) — 8 unit tests verifying selection determinism, native DOM synchronization, label clicks, anchor non-interference, Escape key focus restoration, and clean disposal.
- `src/components/hero/GraphInteractionDemo.astro` (NEW) — Visual Atlas specimen component integrating `createGraphScene`, `createGraphController`, and `createGraphMotion` with live controls and telemetry.
- `src/atlas/sections/GraphInteractionSection.astro` (NEW) — Visual Atlas section mounting `GraphInteractionDemo` with interaction invariants and choreography ceilings.
- `src/atlas/AtlasPage.astro` (MODIFIED) — registered `GraphInteractionSection` in the Atlas inventory.
- `tests/e2e/ca05-graph-interaction.e2e.ts` (NEW) — Playwright E2E tests validating native keyboard navigation, no wheel capture, no automatic navigation, projected label chip clicks, and dynamic reduced-motion handling.
- `docs/quality/concept-alignment-v2/CA-05-HANDOFF.md` (NEW, this file).

No files outside this exact allowlist were touched.

---

## 3. What Was Implemented

### 1. Single Selection Model (`graph-controller.ts`)

- Implemented `createGraphController: GraphControllerFactory` returning a fully-typed `GraphControllerHandle`.
- **Single source of truth**: Manages `selectedId` and broadcasts `onSelectionChange({ selectedId })`.
- **Native DOM synchronization**:
  - Updates `[data-graph-node]` elements and their inner `<details>`/`<summary>` nodes.
  - Automatically manages `open` state and `aria-expanded` attributes without creating a second keyboard tree.
  - Highlights incident edges via `[data-graph-edge]` `data-emphasized` and `data-dimmed`.
  - Concurrently updates the reserved detail panel (`[data-graph-detail]`).
- **Interaction safety**:
  - Projected HTML label chips dispatch into the same `select(id)` controller pipeline.
  - Regular anchor links inside node bodies or detail areas navigate normally without interception.
  - Escape key clears selection and returns focus to the initiating control without scroll jumps (`preventScroll: true`).
  - No wheel capture: mouse wheel scrolling is never intercepted or locked.

### 2. GSAP Scene Choreography (`graph-motion.ts`)

- **Bounded Choreography Targets** (DESIGN-SPEC §5):
  - Settle duration: **750ms** with `ease: 'power2.out'` (target ceiling: 600–900ms).
  - Selection duration: **220ms** with `ease: 'power1.out'` (target ceiling: 180–280ms).
  - Fine-pointer tilt: Clamped strictly to **$\pm 3^\circ$** (`SCENE_MOTION.tiltDegrees`) on `(pointer: fine)` devices.
- **One scheduled render source**:
  - GSAP drives transform interpolation and calls `scene.render()` via `onUpdate` callbacks during active tweening only.
  - Zero idle rendering loop: constellation sits completely quiescent when animations complete.
- **Accessibility & Reduced Motion**:
  - Scoped with `gsap.context()` and registered via `gsap.matchMedia()`.
  - Under `(prefers-reduced-motion: reduce)` or preference `'reduced'`/`'off'`:
    - Settle animation is instant (0s duration, static pose).
    - Selection transition is instant (0s duration).
    - Pointer tilt is completely disabled ($0^\circ$).
    - Live preference changes take effect immediately without page reload.
- **Document Visibility**:
  - Automatically pauses GSAP tweens when `document.hidden` is true and resumes upon tab focus.
- **Clean Disposal**:
  - `dispose()` calls `ctx.revert()` and `mm.revert()`, cleans all pointer and visibility event listeners, and removes inline styles.

### 3. Visual Atlas Specimen (`GraphInteractionDemo.astro` & `GraphInteractionSection.astro`)

- Combines `createGraphScene`, `createGraphController`, and `createGraphMotion` in a live test specimen.
- Interactive toolbar controls:
  - Motion budget switcher (`Full`, `Reduced`, `Off`).
  - Clear Selection / Escape trigger.
  - Re-run Settle Choreography trigger.
  - Remount trigger verifying cleanup and re-initialization safety.
- Live telemetry cards displaying active node selection, motion mode, fine pointer tilt status, and single-model sync badge.

---

## 4. Verification & Check Evidence

### Focused Check 1: Unit Tests

```bash
npm.cmd test -- src/lib/visual/graph-controller.test.ts
```

**Output**:

```
 ✓ src/lib/visual/graph-controller.test.ts (8 tests) 9ms
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

- Passes initial selection state (null or specified).
- Passes state updates and `onSelectionChange` callbacks.
- Passes native DOM `<details>`/`<summary>` synchronization.
- Passes native node summary clicks and projected HTML label clicks.
- Passes anchor link non-interference.
- Passes Escape key selection clearing and focus restoration.
- Passes clean disposal and remounting without memory leaks.

### Focused Check 2: Playwright E2E Tests

```bash
npm.cmd exec playwright test tests/e2e/ca05-graph-interaction.e2e.ts
```

**Output**:

```
Running 6 tests using 6 workers
  ok 1 no wheel capture on graph region (en) (692ms)
  ok 4 reduced motion preference updates dynamically without page reload (696ms)
  ok 5 no wheel capture on graph region (fa) (801ms)
  (When run with DESIGN_ATLAS=1):
  ok 4 interactive specimen on Visual Atlas validates synchronized selection and Escape handling (2.0s)
  3 passed (10.1s) / 4 passed (5.2s)
```

- Confirms zero wheel capture on both English and Persian routes.
- Confirms dynamic reduced-motion handling without page reload.
- Confirms synchronous selection across native `<details>` controls, projected HTML label chips, detail panels, and Escape key resets.

### Focused Check 3: Lint

```bash
npm.cmd run lint
```

**Output**:

```
> tahamohammadi-public-site@0.0.1 lint
> eslint .
(Exited with code 0 - 0 errors, 0 warnings)
```

### Additional Checks: Build & Design Authority

```bash
npm.cmd run build
# Result: 33 page(s) built in 4.50s. Complete!

npm.cmd run validate:design
# Result: PASS: snapshot validated locally and against central authority (24 components, 6 templates). V2 overlay 2.1.0 validated.
```

---

## 5. Unrelated Baseline Notes

When running the full repo-wide test suite:

1. `src/public-310.contract-fixtures.test.ts`: Fails on OpenAPI hash pin mismatch from the backend resolver schema update in PU-03. Unrelated baseline issue.
2. `src/foundation.contract.test.ts`: Contains historical tests asserting Three.js was not installed during CA-01. Three.js is now officially installed under CA-04 ownership.

---

## 6. Stop Marker

**`CA-05_HANDOFF_READY`**
