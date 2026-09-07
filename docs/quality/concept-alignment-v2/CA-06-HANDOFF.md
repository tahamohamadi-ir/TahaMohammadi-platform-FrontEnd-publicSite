# CA-06 Handoff — Integrate progressive Home hero

Task ID: CA-06
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-06`; no new branch or
worktree was created — work was done in the current checkout while
preserving unrelated dirty files listed below)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Workspace HEAD: `c69e339c8c26788467d29ad346fb7df99b1c2842`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was
performed. Changes are exactly the allowlisted paths below.
Stop marker: **`CA-06_HANDOFF_READY`** (with two explicit related-baseline
deviations recorded in §7 — no fabricated data introduced)

## 1. Dependencies

`execution-tasks.json` (v2.1.0) records CA-06 with
`depends_on: [CA-05, CA-03]`.

- CA-03/CA-04/CA-05 were implemented in this same checkout immediately
  before CA-06: locked contract `ca03-1.0.0`, procedural renderer,
  selection/motion controller, all with local `CA-*-HANDOFF.md`
  (`HANDOFF_READY`, uncommitted, same base HEAD). Central acceptance of
  CA-01..CA-05 is still pending; no CA-03/04/05 file outside the CA-06
  allowlist was touched by this packet.
- Shared CA-03/CA-06 files (`HeroGraph.astro`, `hero-graph.css`) were CA-03
  NEW files (still untracked); CA-06 extends them in place. No other worker
  owns the CA-06 allowlist in this checkout.
- PU-SYNC-graph is still NOT_STARTED: pages call `loadHeroGraph(locale)`
  with no related resolver, so related records stay honest non-links and
  the embedded `data-graph-payload` carries only adapter-verified facts.

No gateway, backend, admin, or central-queue file was touched.

## 2. Changed paths (exact allowlist only)

- `src/components/hero/HeroGraph.astro` (MODIFIED, CA-03 NEW extended) —
  serialized renderer input (`toScenePayload` → `script[data-graph-payload]`,
  `<`-escaped), projected-labels layer (`div.hg-labels[data-graph-labels]`),
  `data-hero-enhancement="idle"` initial state, and one progressive
  `<script>` importing only `hero-enhancement` (dynamic scene/controller/
  motion after paint via `requestIdleCallback` fallback, first eligible
  hero only, no gateway import).
- `src/lib/visual/hero-enhancement.ts` (NEW, `ca06-1.0.0`) — eligibility
  gate (ready + matching contract + scene slot), route gate (exactly one
  graph region, no gateway marker), embedded-payload validation (no fake
  geometry), lazy `import()` of scene/controller/motion, `tm-themechange`
  re-tint, on-demand resize, offscreen/hidden pause, context-loss/import/
  frame-budget fallbacks preserving selection/content, full disposal.
- `src/styles/hero-graph.css` (MODIFIED, CA-03 NEW extended) — absolute
  `.hg-labels`/`.hg-label` overlay (no layout shift), enhancement-state
  rules (fallback hides canvas/labels only), non-ready scene suppression;
  no zero-opacity copy/list/detail rules.
- `src/components/hero/hero-enhancement.test.ts` (NEW) — 10 tests:
  version pin, eligibility, route gate, payload fact preservation, load
  rejection, context loss, duplicate guard, gateway-import hygiene, CLS
  reservation, no-JS readability.
- `tests/e2e/ca06-home-scene.e2e.ts` (NEW) — 9 state-aware Playwright tests:
  one hero/canvas slot with no portal/duplicate (390+1440 × fa/en), text
  visibility, aborted-chunk fallback, resize/theme, JS-disabled, reduced
  motion.
- `docs/quality/concept-alignment-v2/CA-06-HANDOFF.md` (NEW, this file).

No other repository, central queue file, route, template, dependency, or
`Front-End/Assets` file was modified. `package.json`/lockfile untouched
(Three.js owned by CA-04, GSAP pre-existing).

## 3. What was implemented

1. **Eligible routes only**: `isEligibleHeroRegion` (ready + `ca03-1.0.0` +
   scene slot) and `shouldLoadScene` (single region, no
   `[data-gateway-portal]`/`[data-gateway-scene]`/`.gw__portal`) gate every
   load. Empty/error/unavailable keep honest fallbacks without fetching
   Three.js.
2. **Facts preserved**: `HeroGraph` serializes `toScenePayload(graph,
selectedId)`; enhancement validates via `validateScenePayload` and
   renders only that payload. Labels map `id → label` from the payload;
   unresolved related records stay non-links.
3. **Progressive load**: hero `<script>` runs after `DOMContentLoaded`/paint
   via `requestIdleCallback({timeout:1500})`, enhances at most the first
   ready hero, and `import()`s scene/controller/motion lazily. Static Home
   HTML contains zero `gateway-scene` bytes (unit + built-HTML proof).
4. **Text never waits**: enhancement touches only canvas/labels visibility;
   copy, node `<details>`, edges, and detail keep natural flow and full
   opacity in every state (unit CSS guard + e2e opacity probe).
5. **Fallbacks without reload**: import rejection → `fallback/
import-rejected`; `onError(webgl-unavailable|context-lost|
frame-budget-exceeded)` → fallback; canvas re-hidden, orbit + list +
   detail untouched, selection preserved, no success status. `webglcontextlost`
   listener calls `preventDefault` + fallback.
6. **Lifecycle**: `tm-themechange` re-tints via CSS tokens; resize
   re-renders on demand with DPR/buffer ceilings inherited from the scene;
   `IntersectionObserver` + `visibilitychange` stop offscreen/hidden work;
   `pagehide`/dispose tears down scene/motion/controller, listeners, and
   labels and restores the hidden canvas.

## 4. Failing-before / passing-after evidence (focused checks)

Failing-before: `src/lib/visual/hero-enhancement.ts` did not exist —
`hero-enhancement.test.ts` failed at import (`Cannot find module`); the
three route-hygiene/CLS/no-JS assertions failed against the CA-03-only hero
(no `hero-enhancement` script, no `.hg-labels`).

Passing-after (final, post-prettier):

- `npm.cmd test -- src/components/hero/hero-enhancement.test.ts
src/components/hero/hero-contract.test.ts` → **24 passed / 0 failed**
  (10 enhancement + 14 contract; contract suite still green with the new
  payload/labels/enhancement markup).
- Combined visual unit block (`hero-enhancement` + `hero-contract` +
  `graph-layout` + `graph-controller`) → **42 passed / 0 failed**.
- `npm.cmd exec playwright test tests/e2e/ca06-home-scene.e2e.ts` →
  **8 passed / 1 skipped** (skip: resize/theme selection case needs a ready
  graph; this build honestly serves `unavailable` with no backend).
- `npm.cmd run build` → green, 33 pages, Pagefind en+fa indexed.
- `npm.cmd run lint` → clean (0 errors, 0 warnings).
- `npx prettier --check` on all 5 allowlisted source/test paths → clean
  (targeted `--write` only, no repo-wide format run).
- Built-HTML evidence (`dist/{en,fa}/index.html`, static no-JS DOM):
  `h1:1/1`, `integrated:1/1`, `graph_region:1/1`,
  `status:unavailable/unavailable` (honest, no staging backend),
  `portal:0/0`, `gateway-scene:0/0`, `old_slot:0/0`, `research:true/true`,
  `enhancement-idle:1/1`; ready-only slot artifacts (`canvas`, `payload`,
  `labels`) correctly absent in unavailable DOM and covered by
  fixture-driven unit tests instead.

## 5. Source / schema hashes (baseline record)

- `src/generated/public-api.ts` SHA256
  `4f5dcfe557b775097d6a11383499c12cf8483961a12d4eea082399ecde4b59bf`.
  Drift from the CA-03-recorded `4f2f8ffa…` comes from co-checkout
  PU-SYNC-graph uncommitted work (`product-resolver` fixture/types); CA-06
  did not touch the generated file.
- Scene contract version: `ca03-1.0.0` (unchanged, asserted in unit +
  eligibility gate). Enhancement version: `ca06-1.0.0`.
- Published staging graph: **not observed** (no staging backend
  configured); built pages honestly render `unavailable` with identity/CTAs
  intact. Fixture PASS (5-node synthetic) is separate from published-data
  readiness.

## 6. Screenshots / rendered output

No screenshots captured — this packet claims DOM/behavioral acceptance, not
visual acceptance, which remains open per ADR-0008 and PUBLIC-190. The live
build serves the honest `unavailable` state (no published graph), so a
constellation screenshot would show only the fallback; ready-state geometry
is proven by the CA-04 Atlas specimen and fixture-driven unit coverage
(5-node labels, edges, emphasis). Render evidence above uses the static
no-JS DOM plus state-aware Playwright probes at 390/1440 × fa/en. A passing
build or test run is not claimed as visual or owner acceptance.

## 7. Related baseline deviations (coordinator decision recorded)

1. `tests/e2e/wp40-home.e2e.ts` (outside the CA-06 allowlist, not edited)
   still reports the CA-03-recorded 3 failures asserting the removed
   separate 3-node seed list (`[data-graph-state="unavailable-route"]`,
   `.hm-graph__node-label` × 3). Unchanged by CA-06.
2. `npm.cmd run test:nojs` → **21 passed / 2 failed**: both failures are
   `home-en`/`home-fa` expecting the same removed `.hm-graph__node-label`
   × 3 in `public-300-nojs-crawl.e2e.ts` (outside allowlist, not edited).
   All other 21 no-JS routes pass; CA-06's own JS-disabled e2e passes for
   both locales. Coordinator revision of those two legacy assertions is
   requested (same pattern as the CA-03 R1 freeze-text correction).

Checkout-scope guard note: `src/foundation.contract.test.ts` exempts exactly
the CA-02/CA-03 allowlisted src paths plus `src/components/hero/` and
`src/lib/visual/` dirs; all four CA-06 src paths fall inside that exemption
and the suite was not re-run repo-wide here (focused + lint + build +
targeted e2e per packet checks).

## 8. Dirty status and boundaries kept

Pre-existing dirty/untracked files were preserved untouched (`AGENTS.md`,
`PROJECT-MANIFEST.md`, `README.md`, `ROADMAP.md`, `TASK-LIST.md`,
`docs/architecture/*`, CA-01/CA-02/CA-04/CA-05 allowlist paths,
`docs/architecture/ADR-*` untracked, `contracts/design-authority/
v2-overlay.json`, Atlas sections, fixtures). Generated output (`dist/`,
`.e2e-serve-dist/`, `test-results/`) is ignored build/test evidence and
uncommitted. No secrets, publication, deploy, legacy code copy, invented
content/API fields/routes/slugs, or `Front-End/Assets` use. No next packet
started; PUBLIC-190/PUBLIC-350 acceptance untouched.

## 9. Done-when verification

- [x] One integrated Home graph canvas slot; no portal bundle on Home
      (unit import guard + built-HTML `gateway-scene:0` + e2e).
- [x] No duplicate graph (single-region gate + already-enhanced guard +
      e2e `canvas ≤ 1`, `graph_region:1`).
- [x] No text waits for scene (no zero-opacity rules + e2e opacity probe).
- [x] Renderer offscreen/hidden work stopped (IO + visibility pause +
      on-demand resize/theme/selection renders + disposal).
- [x] No-JS and failure variants preserved (semantic list/detail/prompt
      intact on import rejection, context loss, aborted chunks, JS
      disabled; honest empty/error/unavailable states).
- [x] Light/dark FA/EN parity via tokens + logical properties; responsive
      slot 280–360 mobile / 520–620 desktop; `before/after` evidence with
      fixture-vs-published labels.

---

## 10. Stop Marker

**CA-06_HANDOFF_READY**
