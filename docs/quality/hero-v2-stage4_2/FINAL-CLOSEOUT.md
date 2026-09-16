# Hero v2 — FINAL CLOSEOUT (Stage 4.3)

> **UPDATE 2026-09-16 — lifecycle superseded (content preserved).** The stage-scope status lines
> below ("no commit, no push, no deploy") describe the state at the time of writing and no longer
> describe the release: Hero v2 was committed, pushed, staged, owner-signed-off and promoted to
> production as `taha-web-prod:prod-457b7fe7`. Authoritative final record:
> `D:/Project/tahamohammadi-platform/Docs/10-tracking/HERO-V2-PRODUCTION-FINAL-CLOSEOUT-2026-09-16.md`.

**Status: ACCEPTED.** Stage 4.2 is the final Home hero look. No art direction was reopened, no Blender
was run, no `.blend` source was modified, no render or sweep was produced in this task.

## Winning parameters (locked)

| parameter            | value                                 |
| -------------------- | ------------------------------------- |
| relation tube radius | `0.00481` (×1.30 of the stage-3 lock) |
| dark stroke gain     | `1.24`                                |
| light stroke gain    | `0.16`                                |

Derived source: `Design-Assets/hero-v2/source/hero-v2-stage4_2.blend` (956,416 B), built by the approved
stage-3 builder with only those two knobs overridden. Frozen stages verified byte-identical
(`stage3 7ba69d2e…`, `stage2_7 78d74e51…`, `stage2_6 d5d7ae75…`) before and after every run.

## Final asset authority

- 16 promoted masters: `Front-End/public-site/src/assets/media/hero-v2/`
  (`hero-v2-{desktop,mobile}-{dark,light}-01..04.png`; 1600×1400 desktop, 800×800 mobile)
- Hashes: `src/lib/media/authority-checksums.ts` — **16 masters, 16 hashes, 0 mismatched** (re-verified
  after the promotion and again after formatting)
- Derivatives are produced from those masters at build time (AVIF q66); **no build artifact is source
  authority** — `src/` never imports from `dist/`

## Frontend architecture

- `src/components/hero/HeroSequence.astro` — the only Home hero. Resolves assets through the governed
  registry (`getPromotedMedia`, `HeroSequenceAssetId`), never raw paths.
- `src/lib/visual/hero-sequence.ts` — pure controller: scroll progress, four authored states, windowed
  crossfade, `travel = min(0.7 × height, remaining scroll)`.
- `src/styles/hero-sequence.css` — outer shell + sticky viewport; frames are `pointer-events: none`.
- Mounted by `HomeHero.astro` / `HomeContent.astro` on `/en/` and `/fa/`.
- **Home = static authored image sequence. No canvas, no WebGL, no Three.js on Home** (audited: every
  `canvas` in the codebase belongs to About's `ResearchUniverse`, the gateway portal, or the Atlas demo).
- **About = the interactive graph, unchanged**: `ResearchUniverse.astro` + the shared
  `lib/hero-graph-content` data layer. No Hero v2 change touches it.
- **Reduced motion**: one static representative frame (state 2), no scroll travel, no animation.
- **Art direction**: per-device composites (desktop 800/1600, mobile 400/800 via real `<source media>`),
  never a CSS crop of the desktop art.

## Dead-code audit (card §4) — nothing removed, deliberately

- `HeroGraph.astro`: **no production caller**, but not deletable under the stated rule — it is still
  rendered by `src/lib/hero-graph-resolve.test.ts:305`, and it is the only render-level consumer of
  `GraphNodeList.astro`, `selectHomeUniverse` (home-preset) and `hero-graph.css`. Reported, not removed.
- `GraphInteractionDemo.astro`: live — mounted by `src/atlas/sections/GraphInteractionSection.astro`.
- Shared engine (`hero-graph-content`, `research-universe/*`), About graph and CMS graph data: untouched.
- No orphan import of the old Home HeroGraph remains; no reference to sweep/candidate assets or to
  temporary Blender outputs exists anywhere in the frontend.

## Tests actually run

| check                                                                                     | result                                              |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| targeted vitest: `hero-sequence`, `promoted-media`, `hero-contract`, `wp40-home.behavior` | **51 passed / 4 files**                             |
| `promoted-media.test.ts` re-run after the formatting fix                                  | 17 passed                                           |
| `npm run build`                                                                           | Complete — 42 pages                                 |
| eslint on the 25 changed source/script/test files                                         | **0 errors**                                        |
| prettier --check on those files                                                           | clean (one drift in `authority-checksums.ts` fixed) |
| Playwright Home/graph contract specs (fixture-backed)                                     | **22 passed, 2 failed, 6 skipped**                  |

The two Playwright failures are the pre-existing witnesses §6 excludes (`wp40-home.e2e.ts:152` 200 %
zoom and `:204` 768 reflow evidence) — both time out inside `settleLazyMedia` on the taller pinned shell,
neither asserts a contract violation. The six skips are conditional cases inside the four specs selected.

## Deferred environment-dependent QA

> Deferred environment-dependent QA:
> final midpoint matrix and motion recapture require a Home content fixture
> or a CMS environment publishing Home modules.

This is **not** a blocker for accepting the visual assets. The Stage 4.2 look itself is verified at the
delivered browser box (511×447 desktop / 348×348 mobile, AVIF q66, on the real card colours) plus the
first-paint theme check; only the motion recapture against a _normally built_ Home remains deferred.

## Staging

**commit = NO · push = NO · deploy = NO.** _(stage-scope status of 2026-09-15 — **superseded 2026-09-16**: the commit was pushed, the release staged, owner-signed-off and promoted; see the final record or the banner above)_ Nothing is staged (`git diff --cached` is empty) and the last
commit is still the owner's `dcd5d2d`. Two repositories are involved:

- `Front-End/public-site` — the Hero v2 implementation, tests and QA evidence (list in the final answer).
- `D:\Project\tahamohammadi-platform` — `Design-Assets/hero-v2/**` (currently untracked, ~140 MB: renders
  85 MB + validation 42 MB are regenerable evidence) and `HERO_PRODUCTION_PLAN_v2.md` (19.6 KB). The
  promoted masters are already inside the frontend repo, so the art-side commit should carry scripts +
  the approved `.blend` sources + the reports; the render/validation image bulk is optional.
