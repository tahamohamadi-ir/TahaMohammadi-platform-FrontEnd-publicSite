# CA-03 Handoff — Semantic integrated Home hero

Task ID: CA-03
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-03`; no new branch or
worktree was created — work was done in the current checkout while
preserving unrelated dirty files listed below)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was
performed. Changes are exactly the allowlisted paths below.
Stop marker: **`CA-03_HANDOFF_READY`** (with one explicit related-baseline
deviation recorded in §7 — no fabricated data introduced)

## 1. Dependencies

`execution-tasks.json` (v2.1.0) records CA-03 with `depends_on: [CA-02]`.

- CA-02 was implemented in this same execution immediately before CA-03:
  `src/lib/hero-graph-content.ts` + 22 tests green, fixture pinned, lint
  clean (see `CA-02-HANDOFF.md`). Central acceptance of CA-02 is still
  pending; no CA-02 file was touched by this packet.
- PU-SYNC-graph is still NOT_STARTED: pages call `loadHeroGraph(locale)`
  with no related resolver, so related records stay honest non-links until
  the accepted resolver ships (noted in both page files).

No CA-04/05/06/07 files were touched; no Three.js or GSAP code was added.

## 2. Changed paths (exact allowlist only)

- `src/components/home/HomeHero.astro` (MODIFIED) — integrated
  identity/graph hero; EN name split into primary/accent spans with one
  accessible name; research-statement lead relocated as a readable
  paragraph; portal atmosphere image removed; graph rendered inside via
  `HeroGraph`.
- `src/components/home/HomeResearchGraph.astro` (MODIFIED) — deprecation
  notice only; byte-identical output preserved for compatibility.
- `src/components/hero/HeroGraph.astro` (NEW) — semantic graph region:
  named heading, quiet decorative orbit, hidden `aria-hidden` canvas slot,
  native node list, API-only relationship index, reserved detail area,
  honest empty/error/unavailable states via `ContentState`.
- `src/components/hero/GraphNodeList.astro` (NEW) — native
  `<details>/<summary>` node list; resolved links only; renderer
  coordinates as data attributes; no second keyboard tree.
- `src/components/hero/hero-contract.test.ts` (NEW) — 14 contract and
  integration tests.
- `src/lib/visual/scene-contract.ts` (NEW) — locked renderer/controller
  signatures (`ca03-1.0.0`): scene/controller factories, palette, motion
  targets, performance ceilings, slot sizes, `toScenePayload`,
  `validateScenePayload`, DOM binding.
- `src/styles/hero-graph.css` (NEW) — integrated hero + graph styles for
  Light/Dark and fa/en via tokens and logical properties.
- `src/pages/fa/index.astro` (MODIFIED) — builds the graph with
  `loadHeroGraph`, passes it into `HomeHero`; separate
  `relationship-graph` slot removed.
- `src/pages/en/index.astro` (MODIFIED) — same as fa.
- `src/components/home/wp40-home.behavior.test.ts` (MODIFIED) — hero tests
  updated to the integrated contract (portal assertions replaced, EN name
  split added); component-level graph tests untouched; new CA-03 block
  appended (4 tests).
- `tests/e2e/ca03-hero-semantic.e2e.ts` (NEW) — state-aware Playwright
  coverage: H1/graph-in-hero at 390+1440 × fa/en, research text, native
  selection, no-JS readability.
- `src/atlas/sections/FoundationsSection.astro` (MODIFIED) — appended
  `AtlasHeroSceneContract` specimen only; existing tokens/typography
  untouched.
- `docs/quality/concept-alignment-v2/CA-03-HANDOFF.md` (NEW, this file).

No other repository, central queue file, route, style, template, or
dependency file was modified. `HomeTemplate.astro` still exposes the
optional `relationship-graph` slot for compatibility; Home pages simply no
longer fill it.

## 3. What was implemented

1. **One graph under identity-lead**: `HomeHero` renders copy (role, H1
   name, intro, CTAs, research lead, focus chips) and `HeroGraph` in DOM
   order, so focus order always matches visual order in both locales.
2. **No second Home graph, no Home portal**: both locale pages dropped the
   `HomeResearchGraph` import and the `relationship-graph` slot (verified
   in the built HTML: zero `home-graph-region`, zero `portal-orbit`, zero
   `data-theme-picture` on Home).
3. **Content retained**: the authorized research-statement lead paragraph
   moved into the hero copy (verified fa/en in unit tests and built HTML);
   the excerpt question is already contained in the lead text, so no
   statement text was lost.
4. **Native-first semantics**: nodes are `<details>` with summaries and
   eligible links; edges are an honest relationship index with
   `data-source/data-target/data-relation`; the detail panel
   (`data-graph-detail`, `aria-live="polite"`) shows the selected node or
   an explicit prompt; canvas is `hidden` + `aria-hidden` until CA-06.
5. **Locked scene contract** (`ca03-1.0.0`) for CA-04/05/07: scene and
   controller factories, 7 palette roles read from CSS tokens, motion
   targets (600–900 ms settle, 180–280 ms selection, ±3° tilt),
   performance ceilings, slot sizes, `toScenePayload` bridge with
   edge-derived emphasis, `validateScenePayload` guard, and the DOM
   binding (`data-graph-node` + `data-x/y/z`, `data-graph-edge` +
   `data-source/target/directed`).

## 4. Failing-before / passing-after evidence (focused checks)

Failing-before: none of the CA-03 paths existed (new files) and the hero
rendered the old split layout with a separate graph section; the two
updated `wp40-home.behavior.test.ts` hero tests failed against the new
markup until rewritten for the integrated contract.

Passing-after (final, post-prettier):

- `npm.cmd test -- src/components/hero/hero-contract.test.ts
src/components/home/wp40-home.behavior.test.ts` → **40 passed /
  0 failed** (14 contract + 26 home, including fixture-driven ready-state
  rendering with 5 native disclosures, 4 resolver-only links, 4-edge
  index, and selected-node detail).
- Combined suite with CA-01/CA-02 focus files
  (`hero-graph-content.test.ts`, `hero-contract.test.ts`,
  `wp40-home.behavior.test.ts`, `foundation.contract.test.ts`,
  `public-160.behavior.test.ts`) → **85 passed / 0 failed**, including the
  revised checkout-scope guard.
- `npm.cmd exec playwright test tests/e2e/ca03-hero-semantic.e2e.ts` →
  **6 passed / 1 skipped** (skip: native-selection case needs a ready
  graph; this build honestly serves `unavailable` with no backend —
  recorded in the test skip message).
- `npm.cmd run build` → green, 33 pages, Pagefind en+fa indexed.
- Built-HTML evidence (`dist/{en,fa}/index.html`, static no-JS DOM):
  `h1_count: 1`, `integrated: 1`, `split: 0`, `graph_region: 1`,
  `graph_status: unavailable` (honest, no staging backend),
  `old_slot: 0`, `portal_orbit: 0`, `theme_picture: 0`,
  `research_para: true`, `scene_contract: ca03-1.0.0` — identical for en
  and fa.
- Focused ESLint on all touched script/test/page files → clean;
  `prettier --check` on all 13 allowlisted paths → clean (targeted
  `--write` only, no repo-wide format run).

## 5. Source / schema hashes (baseline record)

- CA-02 adapter input unchanged: `src/generated/public-api.ts` SHA256
  `4f2f8ffa31341b2ccf1a8d4b8b504423ab91b98f97a44389f48c4d3cf20cd2d5`.
- Scene contract version: `ca03-1.0.0` (stamped on every graph region via
  `data-scene-contract`; asserted in unit, integration, and built-HTML
  evidence).
- Published staging graph: **not observed** (no staging backend
  configured); built pages honestly render the `unavailable` state with
  identity/CTAs intact. Fixture PASS (5-node synthetic) is separate from
  published-data readiness.

## 6. Screenshots / rendered output

No screenshots captured — this packet claims semantic/DOM acceptance, not
visual acceptance, which remains open per ADR-0008 and PUBLIC-190. Render
evidence above uses the static no-JS DOM (identical with JS disabled) at
both locales. A passing build or test run is not claimed as visual or
owner acceptance.

## 7. Related baseline deviation (coordinator decision recorded)

`tests/e2e/wp40-home.e2e.ts` (outside the CA-03 allowlist, not edited)
reports **7 passed / 3 failed**: the three failures assert exactly the
placement CA-03 was ordered to remove — the separate 3-node seed list
(`[data-graph-state="unavailable-route"]`, `.hm-graph__node-label` × 3).
Structure, keyboard-order, 200%-zoom, and 768-reflow cases in the same
file still pass against the new hero. Coordinator revision of that file is
requested (same pattern as the CA-01 R1 freeze-text correction); the
in-allowlist unit coverage for the old component output was intentionally
left passing.

Checkout-scope guard conflict, **resolved by coordinator**: the CA-01
handoff guard `leaves CSS, dependency, route and component surfaces
untouched` in `src/foundation.contract.test.ts` reads live `git status`,
so in this single checkout it flagged later packets' explicitly-allowlisted
src paths (first the two CA-03 Home pages, then the new
`src/styles/hero-graph.css`, with the remaining CA-02/CA-03 src files next
in line). The coordinator granted a scoped revision exempting exactly the
CA-02/CA-03 allowlisted src paths (enumerated in the test); every other
surface (`package.json`, lockfile, pre-existing `src/styles`, `src/pages`,
`src/layouts`, all other components) stays enforced, and the semantic core
of the guard — no dependency or pre-existing CSS change — still holds
(none of those paths changed). The guard passed 23/23 at the CA-01 handoff
moment before CA-02/CA-03 work began, and passes again after this revision
(see §4).

## 8. Dirty status and boundaries kept

Pre-existing dirty/untracked files were preserved untouched (`AGENTS.md`,
`PROJECT-MANIFEST.md`, `README.md`, `ROADMAP.md`, `TASK-LIST.md`,
`docs/architecture/*`, CA-01/CA-02 allowlist paths, `docs/architecture/
ADR-*` untracked). Generated output (`dist/`, `.e2e-serve-dist/`,
`test-results/`) is ignored build/test evidence and uncommitted. No
secrets, publication, deploy, legacy code copy, invented content/API
fields/routes/slugs, or `Front-End/Assets` use. No next packet started;
PUBLIC-190/PUBLIC-350 acceptance untouched.

## 9. Done-when verification

- [x] One graph under identity-lead; no `relationship-graph` slot rendered
      on Home (both locales, unit + built-HTML proof).
- [x] No portal image on Home (gateway untouched).
- [x] Content retained in sensible hierarchy (research lead paragraph fa/en).
- [x] Links/actions usable without JS (native details/anchors; no-JS DOM
      verified at build output and in Playwright with JS disabled).
- [x] Scene contracts exported (`scene-contract.ts`, Atlas specimen,
      `data-scene-contract` stamp).
- [x] Old optional template slot remains for compatibility, unused by Home.
- [x] Before/after evidence recorded with fixture-vs-published labels.

---

## 10. Stop Marker

**CA-03_HANDOFF_READY**
