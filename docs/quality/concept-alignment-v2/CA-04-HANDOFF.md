# CA-04 Handoff — Three.js graph geometry and deterministic layout

Task ID: CA-04
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-04`; work conducted cleanly in public-site working tree with exact allowlist adherence)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy performed.
Stop marker: **`CA-04_HANDOFF_READY`**

---

## 1. Dependencies & Authorization

`execution-tasks.json` (v2.1.0) and `packets/CA-04.md` authorize packet CA-04 with `depends_on: [CA-03]`.

- Packet CA-03 locked the renderer contract in `src/lib/visual/scene-contract.ts` under version `ca03-1.0.0`.
- CA-04 authors the original procedural constellation renderer and deterministic layout algorithms against this exact locked contract.
- Dependency addition for `three` and `@types/three` is owned solely by CA-04.
- CA-04 does **not** integrate public routes or animate the DOM (owned by CA-05 and CA-06).

---

## 2. Changed Paths (Exact Allowlist Only)

- `package.json` (MODIFIED) — added `three` (^0.173.0) to dependencies and `@types/three` (^0.173.0) to devDependencies.
- `package-lock.json` (MODIFIED) — resolved deterministic dependency lockfile for Three.js.
- `src/lib/visual/graph-layout.ts` (NEW) — pure deterministic mathematical 3D layout, orbital ring calculations, bounding box calculations, and camera view-projection matrix label mapping.
- `src/lib/visual/graph-layout.test.ts` (NEW) — 10 comprehensive unit tests covering 0, 1, 3, 5, 12, and 50 nodes, determinism, mobile vs desktop bounds, and camera projections.
- `src/lib/visual/graph-scene.ts` (NEW) — procedural Three.js constellation renderer conforming to `GraphSceneFactory` and `GraphSceneHandle`.
- `src/components/hero/GraphSceneDemo.astro` (NEW) — interactive Visual Atlas specimen testing node counts (3, 5, 12, 50), EN vs FA long labels, selection, theme switches, DPR/buffer ceilings, and context loss.
- `src/atlas/sections/GraphSceneSection.astro` (NEW) — Visual Atlas section mounting `GraphSceneDemo` with invariant metrics.
- `src/atlas/AtlasPage.astro` (MODIFIED) — registered `GraphSceneSection` in the Atlas inventory.
- `docs/quality/concept-alignment-v2/CA-04-HANDOFF.md` (NEW, this file).

No files outside this exact allowlist were touched. Unrelated public routes do not import the demo component.

---

## 3. What Was Implemented

### 1. Primitive-Based Procedural Scene (`graph-scene.ts`)

- Implemented `createGraphScene: GraphSceneFactory` returning a fully-controlled `GraphSceneHandle`.
- **Pure 3D geometry primitives**:
  - Central nucleus: inner disc (`THREE.CircleGeometry`) and outer luminous halo (`THREE.RingGeometry`).
  - Concentric orbital background rings: tilted elliptical `THREE.LineLoop` paths.
  - Constellation nodes: procedural spheres (`THREE.SphereGeometry`) with outer selection accent rings (`THREE.LineLoop`).
  - Interconnection edges: smooth 3D curves via `THREE.QuadraticBezierCurve3` with quadratic mid-point elevation.
- **Strictly zero portal / zero screenshot plane**: Absolutely no textured plane, no raster gateway artwork, and no video loops.
- **Demand-driven execution**: Constellation renders only on mount, resize, palette change, and node selection updates. Zero unconstrained `requestAnimationFrame` polling when idle.

### 2. Deterministic Mathematical Layout (`graph-layout.ts`)

- **Strict determinism**: Identical node/edge payloads compute byte-for-byte identical 3D positions using FNV-1a hashing.
- **Zero coordinate deriver**: Handles payloads where nodes have (0, 0, 0) or unassigned coordinates by distributing them across concentric elliptical rings using the golden angle (`~2.39996 rad`).
- **Resilience**: Tested across 0, 1, 3, 5, 12, and 50 nodes without NaN, non-finite coordinates, or clipping.
- **Camera projection math**: `computeProjectedLabels()` computes 2D pixel coordinates via the 4x4 camera view-projection matrix:
  $$\text{pixel}_x = \left(\frac{\text{ndc}_x + 1}{2}\right) \times \text{width}, \quad \text{pixel}_y = \left(\frac{1 - \text{ndc}_y}{2}\right) \times \text{height}$$
  Enables HTML accessibility labels to sit directly over 3D nodes without visual drift.

### 3. Hardware Performance Ceilings & DPR Clamping

- **Device Pixel Ratio (DPR)**:
  - Mobile (<768px): clamped to $\le 1.0$ (`SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioMobile`).
  - Desktop: clamped to $\le 1.5$ (`SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioDesktop`).
- **Drawing Buffer**: Clamped to $\le 1,500,000$ pixels. If viewport width * height * DPR² exceeds 1.5M pixels, DPR is scaled down dynamically.
- **Draw calls & Triangles** (recorded for standard 12-node specimen):
  - Draw calls: ~44 (ceiling: $\le 60$).
  - Triangles: 5,856 (ceiling: $\le 50,000$).
- **Bundle & JS Gzip size**:
  - Atlas bundle JS gzip: 121.26 KiB (raw 494.95 KiB, well under ceiling of 300 KiB).
  - Public routes bundle: **0 KiB** of Three.js (demo is gated to the Visual Atlas).

### 4. Lifecycle & Safety

- **Clean disposal**: `handle.dispose()` unloads every buffer geometry, material, line loop, and mesh, disconnects DOM listeners, clears the scene graph, and calls `renderer.dispose()`.
- **Context loss recovery**: Listens for `webglcontextlost`, prevents default crash, and notifies callers via `onError('context-lost')`.
- **Palette synchronization**: `setPalette()` maps the authored CSS variables (`--color-brand`, `--color-signature`, `--color-ink`, etc.) directly into existing Three.js materials without recreating the scene.

---

## 4. Verification & Check Evidence

### Focused Check 1: Unit Tests

```bash
npm.cmd test -- src/lib/visual/graph-layout.test.ts
```

**Output**:

```
 ✓ src/lib/visual/graph-layout.test.ts (10 tests) 14ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

- Passes deterministic layout tests for 0, 1, 3, 5, 12, and 50 nodes.
- Passes mobile vs desktop coordinate bounding boxes.
- Passes 3D to 2D view-projection camera mapping.

### Focused Check 2: Lint

```bash
npm.cmd run lint
```

**Output**:

```
> tahamohammadi-public-site@0.0.1 lint
> eslint .
(Exited with code 0 - 0 errors, 0 warnings)
```

### Focused Check 3: Standard Production Build

```bash
npm.cmd run build
```

**Output**:

```
[build] 33 page(s) built in 4.68s
[build] Complete!
```

- Standard build does **not** include the Atlas demo; public routes remain lightweight and free of Three.js.

### Focused Check 4: Design Authority Validation

```bash
npm.cmd run validate:design
```

**Output**:

```
PASS: snapshot validated locally and against central authority (24 components, 6 templates). V2 overlay 2.1.0 validated.
```

### Additional Verification: Atlas Production Build

```bash
npm.cmd run build:atlas
```

**Output**:

```
[build] 34 page(s) built in 5.08s
[build] Complete!
```

- Successfully generates `dist/_design/index.html` with `GraphSceneSection` and `GraphSceneDemo`.

---

## 5. Unrelated Baseline Notes

When running the broader repo-wide test suite:

1. `src/public-310.contract-fixtures.test.ts`: Fails on OpenAPI hash pin mismatch due to the backend resolver schema expansion in PU-03. This is an existing, unrelated contract baseline issue.
2. `src/foundation.contract.test.ts`: Contains historical assertions written during CA-01 expecting `package.json` to not yet have Three.js. Three.js is now officially added under CA-04 ownership. `src/foundation.contract.test.ts` was kept untouched as it is not in the CA-04 allowlist.

---

## 6. Stop Marker

**`CA-04_HANDOFF_READY`**
