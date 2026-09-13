# Research Universe — RU-2 evidence record

Companion to the RU-1 brief. Scope: fix the two confirmed visual defects (central
anchor drawn twice, labels with no leader stems), add real browser coverage, and
record what a machine actually observed.

Follows the repository convention set by `PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md`:
this document is committed, the raw captures stay in the gitignored
`test-results/` / `.tmp-proto/` directories and are referenced by path plus the
command that regenerates them.

## 1. What was verified, and how

| # | Claim | How it was verified | Result |
|---|---|---|---|
| 1 | The central anchor is never drawn twice | `universe.test.ts` — `partitionLayoutNodes` puts the level-0 anchor in exactly one bucket, and the two buckets reconstruct the input | PASS (unit) |
| 2 | Leader stems exist, track the node and hide correctly | `universe.test.ts` — stem geometry + visibility decision mirrored against `leaders.ts` | PASS (unit) |
| 3 | Home: one canvas, scene enhances, semantic content survives | `tests/e2e/ru-home.e2e.ts` | PASS |
| 4 | Home: dark theme renders; light theme renders and switches live | `tests/e2e/ru-home.e2e.ts` | PASS |
| 5 | Home: scroll changes the pose without scaling the scene; reduced motion stays static | `tests/e2e/ru-home.e2e.ts` | PASS |
| 6 | Home: no drawing while idle; context loss degrades to the semantic fallback; leader stems track and hide | `tests/e2e/ru-home.e2e.ts` | PASS |
| 7 | About: scene loads, exactly one canvas, 4 nodes | `tests/e2e/ru-about.e2e.ts` | PASS |
| 8 | About: node/edge selection drives the semantic panels with published facts only | `tests/e2e/ru-about.e2e.ts` | PASS |
| 9 | About: context loss, keyboard path, mobile, reduced motion | `tests/e2e/ru-about.e2e.ts` | PASS |
| 10 | About: drag rotates, zoom clamps, reset restores | `tests/e2e/ru-about.e2e.ts` | **FAIL — see §3** |

### Command

```bash
# The Home hero only exists when the CMS composition contract is reachable, so the
# Research Universe suites build against the real published API.
TM_E2E_API_BASE_URL=https://tahamohamadi.ir \
  npx playwright test --config playwright.research.config.ts \
  tests/e2e/ru-home.e2e.ts tests/e2e/ru-about.e2e.ts --reporter=line
```

Machine-readable results: `.tmp-proto/ru2-pw-all.log` (Home + About, 1.5 min),
`.tmp-proto/ru2-pw-about3.log` (About re-run). Playwright's own HTML report and
traces land in `test-results/` (gitignored).

## 2. Defects found and fixed in this card

1. **Anchor drawn twice (RU-2A).** `tierForKind('person')` routed the identity node
   into the domain tier, so a second sphere was instanced at the origin on top of
   the nucleus. The layout now carries an explicit `role: 'central-anchor' |
   'standard'`, and `partitionLayoutNodes` is the only way the renderer can reach
   the nodes — an anchor cannot be instanced by construction. The anchor keeps its
   semantic record, its edges, its labels, its hit-testing and a dedicated
   selection ring, so nothing semantic was lost.
2. **Labels had no leader stems (RU-2B).** New `leaders.ts` renders one hairline
   per label in the same overlay as the chips, from the node's projected surface to
   the chip, using the existing signature token (champagne on dark, restrained gold
   on light) at low opacity so it can never dominate the relationship curves. The
   chip offset and the stem share one constant (`LABEL_GAP_PX`) through
   `--ru-node-radius` / `--ru-label-gap`, so they cannot drift.
3. **Stem geometry was wrong in the first implementation** — anchoring the chip to
   the node *centre* made the stem shorter as a node grew, so any node larger than
   the gap lost its stem entirely. Caught by the unit test; the chip now anchors
   above the node's surface and the stem is a constant length.
4. **About never repainted after a pose change.** `rotateBy`/`zoomBy` mutate the
   orbit and call `applyOrbit()`, but the scene has no idle loop
   (`rendering.idle: render-on-change`), so nothing was re-rendered until an
   unrelated event (resize, selection) happened. `about-controls.ts` now calls
   `scene.render()` after every pose mutation.

## 3. Open defect (not fixed in this card)

**About canvas interaction is still not observable in the browser.** After fix 4,
the drag test still measures byte-identical label positions, so the pose is not
changing end-to-end. What is ruled out and what is not:

- Ruled out: the scene not existing (it enhances and renders), the label layer not
  updating (positions are published), the controls not being constructed
  (`enhancement.ts` builds them and the action buttons resolve through them).
- Not yet ruled out: whether the pointer events reach the `[data-universe-scene]`
  listener at all (a `pointer-events` / hit-testing issue on the stage), or whether
  `stage.setPointerCapture()` throws before the drag state is armed.
- The nucleus click path shares the same failure (`selectAt` never returns a node
  from a click at the projected identity position), which points at the same
  root cause rather than at two independent bugs.

The About presentation was therefore **not** confirmed interactive end-to-end in
this card. The unit tests for `about-controls` (pure input → pose math) pass, so
the arithmetic is not in question; the browser plumbing is.

## 4. Gate state at the end of this card

| Gate | Result |
|---|---|
| `prettier --check src/lib tests/e2e scripts src/styles` | clean |
| `npm run lint` | exit 0, 0 errors |
| `npx vitest run src/lib/research-universe/universe.test.ts` | 49/49 pass |
| `npx tsc --noEmit` (whole project) | 2 errors, both pre-existing in files this branch does not touch (`cv/product-cv.test.ts`, `hero/hero-enhancement.test.ts`) |
| `npx playwright test` (Home) | passing |
| `npx playwright test` (About) | 8 pass / 5 fail, all traced to §3 |

## 5. Harness notes worth keeping

- The local E2E fixture server (`scripts/e2e-site-settings-fixture.mjs`) now also
  serves the published graph and record-resolver contracts, which is what lets a
  hermetic build render the universe at all. Its filename is now narrower than its
  role.
- The Home hero is gated on `/api/home-composition`, which the hermetic fixture
  does not serve, so the Research Universe suites use `TM_E2E_API_BASE_URL` to
  build against the real published API instead. The default Playwright run is
  unchanged and stays hermetic.
- `playwright.research.config.ts` exists only for these specs and picks a free port
  through the shared safe-port helper.
