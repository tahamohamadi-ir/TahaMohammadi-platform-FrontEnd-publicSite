# Hero v2 — Stage 4 delivery report (frontend connection)

> **UPDATE 2026-09-16 — lifecycle superseded (content preserved).** The stage-scope status lines
> below ("no commit, no push, no deploy") describe the state at the time of writing and no longer
> describe the release: Hero v2 was committed, pushed, staged, owner-signed-off and promoted to
> production as `taha-web-prod:prod-457b7fe7`. Authoritative final record:
> `D:/Project/tahamohammadi-platform/Docs/10-tracking/HERO-V2-PRODUCTION-FINAL-CLOSEOUT-2026-09-16.md`.

Status: **implemented + locally verified. No commit, no push, no deploy.**
Owner decisions locked 2026-09-15: (1) Home ships the approved four authored Stage 3 states as a
scroll-driven image sequence on **both** desktop and mobile; (2) the image hero **replaces** the
interactive WebGL graph on Home — About keeps the real interactive graph.

---

## 1. Exact files changed

**Frontend (`Front-End/public-site/`)**

| File                                                   | Change                                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/media/authority-checksums.ts`                 | 16 hero-v2 SHA-256 authority hashes + `RUNTIME_ASSET_IDS` extended                                                                                               |
| `src/lib/media/transform-recipes.ts`                   | two slots (`home.hero.sequence.desktop/mobile`), widths 800/1600 and 400/800, `sizes` per device                                                                 |
| `src/lib/media/promoted-media-registry.ts`             | slot union, `2026-09-15` decision date, 16 promoted records with intrinsic sizes, approval metadata and per-frame loading policy                                 |
| `src/lib/media/promoted-media.ts`                      | 16 static master imports + `SOURCE_IMPORTS` entries                                                                                                              |
| `src/lib/visual/hero-sequence.ts`                      | **new** controller: pure progress→opacity mapping, mount, theme, travel measurement, reduced motion                                                              |
| `src/lib/visual/hero-sequence.test.ts`                 | **new** unit tests (9)                                                                                                                                           |
| `src/components/hero/HeroSequence.astro`               | **new** component: 2 themes × 4 states as `<picture>` with real `<source media>` device art, eager frame 01 only for the default theme, decorative `aria-hidden` |
| `src/styles/hero-sequence.css`                         | **new** frame stack, reserved aspect ratios per device, no-JS/reduced-motion behaviour                                                                           |
| `src/components/home/HomeHero.astro`                   | hero visual column now renders `HeroSequence`; docblock and `data-hero-visual` marker updated                                                                    |
| `src/components/home/HomeContent.astro`                | drops the `graph` prop/loader wiring; passes `showSequence`                                                                                                      |
| `src/pages/en/index.astro`, `src/pages/fa/index.astro` | `loadHeroGraph` removed from Home                                                                                                                                |
| `src/lib/media/promoted-media.test.ts`                 | stub dimensions extended with the 16 hero-v2 masters                                                                                                             |
| `src/components/hero/hero-contract.test.ts`            | Home contract rewritten (sequence instead of graph) + About-retains-graph assertion                                                                              |
| `src/components/home/wp40-home.behavior.test.ts`       | rewritten for the sequence contract (states, sources, theme, no scene runtime)                                                                                   |
| `tests/e2e/ca06-home-scene.e2e.ts`                     | rewritten: sequence + no scene + **scrub advances** + reduced motion                                                                                             |
| `tests/e2e/ca03-hero-semantic.e2e.ts`                  | hero carries the sequence; node-selection test self-skips                                                                                                        |
| `tests/e2e/wp40-home.e2e.ts`                           | shared helper now asserts the sequence contract                                                                                                                  |
| `tests/e2e/ca05-graph-interaction.e2e.ts`              | two Home-graph cases retire honestly (documented skip) — the interaction contract lives on About (`ru-about.e2e.ts`)                                             |
| `tests/e2e/hero-v2-stage4.visual.e2e.ts`               | **new** visual-evidence spec (16 states + reduced motion)                                                                                                        |
| `scripts/qa-stage4-capture.mjs`                        | **new** capture runner for an already-built `dist/` (sweep, pinning probe, metrics)                                                                              |
| `src/assets/media/hero-v2/*.png`                       | **new** 16 promoted masters (8 desktop 1600×1400, 8 mobile 800×800)                                                                                              |

**Project root**

| File                         | Change                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `HERO_PRODUCTION_PLAN_v2.md` | §0 decision update (2026-09-15) + §7 pointer; historical intent preserved, nothing silently erased |

## 2. Exact assets created

- 16 alpha masters promoted into the governed pipeline: `hero-v2-desktop-{dark,light}-01..04`, `hero-v2-mobile-{dark,light}-01..04`.
- 64 build derivatives (AVIF + WebP × 2 widths × 16) emitted to `dist/_astro/`.
- 17 QA screenshots in `docs/quality/hero-v2-stage4/` (+ `stage4-qa-summary.json`).
- QA-only (outside the repo, not shipped): a local Home-composition fixture server.

## 3. Asset dimensions

- Desktop composition: **1600×1400** (8 files). Mobile composition: **800×800** (8 files).
- Runtime widths: desktop 800/1600, mobile 400/800.

## 4. AVIF/WebP byte sizes (measured, alpha-aware)

Encoder choice was a **measured sweep**, not a guess (alpha-weighted RMSE + max error on opaque
pixels only — scoring the RGB under transparent pixels is meaningless and produced a false 10×
error on my first pass):

| source                   | q50                   | q58                   | q66 (chosen)              |
| ------------------------ | --------------------- | --------------------- | ------------------------- |
| desktop dark 01 (1600px) | 13KB rmse 1.00 max 43 | 15KB rmse 1.00 max 24 | **17KB rmse 0.95 max 24** |
| desktop light 02         | 13KB rmse 1.00 max 32 | 15KB rmse 0.99 max 22 | **17KB rmse 0.94 max 26** |
| mobile dark 01 (800px)   | 9KB rmse 1.08 max 20  | 10KB rmse 1.09 max 22 | **11KB rmse 1.02 max 13** |

q50/q58 leave 43/255 outlier pixels and worse alpha edges on the thin relation curves for a 2KB
saving; the whole four-frame set is ~13% of the 900KB budget, so AVIF sits at **q66** and WebP
(the fallback engine) at **q74** (≈ rmse 1.4 at matched size).

Delivered payload, measured in the browser: the QA sweep loaded **8 AVIF files, 106KB** (desktop)
and **8 AVIF, 89KB** (mobile) — both themes, because the sweep switches themes; per **active**
theme that is 4 files ≈ **53KB desktop / 45KB mobile**, against the card's 900KB/500KB targets.

## 5. Active-theme request count

4 hero-v2 AVIF requests per active theme/device (device-specific set only — the mobile set is
never a crop of the desktop one). On a dark-resolved page there is **one extra** light frame: the
SSR default's frame 01 is eager so the default theme never waits for JS. Measured cost 17KB; kept
deliberately and listed as a trade-off in §13.

## 6. Desktop/mobile source logic

Real `<source media="(min-width: 768px)">` selection per authored composition, formats
AVIF → WebP, explicit `sizes`, `object-fit: contain` with reserved `aspect-ratio` per breakpoint.
Verified in-browser: mobile `currentSrc` = `hero-v2-mobile-*`, desktop = `hero-v2-desktop-*`.

## 7. Scroll interpolation logic

`progress = clamp01((scrollY − heroTop) / travel)`; `travel = min(0.7 × innerHeight, scroll that
actually remains after the hero)`, floored at 320px. Opacities: linear crossfade of the **two
adjacent** authored states only (`0.00/0.33/0.66/1.00` → states 1/2/3/4). No snapping, no easing
theatre, no CSS rotation/scale, no idle loop, no scroll-jacking.

Measured sweep (desktop, travel 630): `0→0.00 90→0.14 180→0.29 270→0.43 360→0.57 450→0.71
540→0.86 630→1.00`; captures land exactly on the keyframes (0.000/0.334/0.666/1.000 with the
corresponding frame at opacity 1.00 and its neighbour at 0.00).

## 8. Reduced-motion behaviour

`prefers-reduced-motion: reduce` → **one representative static authored frame** (state 2,
`REDUCED_MOTION_FRAME_INDEX = 1`, i.e. p = 1/3), no scrub, and **no added scroll room**. Verified
in-browser: progress pinned at `0.3333` before and after a 1800px scroll, exactly **1** frame
visible, 0 running animations.

## 9. Theme-switch behaviour

Both authored sets ship in the DOM; the inactive theme is `hidden` + lazy, so it is not
downloaded (well: `display:none` + lazy means the browser never intersects it — verified by the
request audit). Switching reads the app's own theme state, keeps the current state index, and
decodes the incoming first frame before revealing it (no wrong-theme flash).

## 10. Browser screenshot paths

`Front-End/public-site/docs/quality/hero-v2-stage4/` —
`desktop-{dark,light}-p000|p033|p066|p100.jpg` (8), `mobile-{dark,light}-p000|p033|p066|p100.jpg`
(8), `desktop-reduced-motion.jpg` (1), `stage4-qa-summary.json`.

Review (fresh eyes on the real frames, §14 A–J): visual reads **integrated** (same canvas, card
geometry, accent family); copy/CTAs/header intact and unobstructed at 1440×900 and 430×932;
**no ghosting or duplicated spheres** at the crossfade; mobile is a genuinely composed camera, not
a desktop crop, and reads as the dominant moment; no banding observed. One finding: the **thin
relation curves read faint at delivered size** (see §13).

## 11. Performance measurements

| metric                                      | desktop 1440×900   | mobile 430×932 |
| ------------------------------------------- | ------------------ | -------------- |
| hero requests (active theme)                | 4 AVIF             | 4 AVIF         |
| hero bytes (active theme)                   | ≈53KB              | ≈45KB          |
| LCP                                         | 80ms (local, cold) | 44ms           |
| CLS                                         | 0                  | 0              |
| long tasks during scroll                    | 0                  | 0              |
| running animations (out of viewport / idle) | 0                  | 0              |
| canvas elements on Home                     | 0                  | 0              |

Work stops when the hero leaves the viewport (IntersectionObserver start/stop, one rAF per frame),
so no scroll maths run for the page lifetime.

## 12. Test results

| gate                   | result                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test` (vitest)    | **593/593 passed**, 95 files                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run build`        | **green**, 72 pages (full-content build); 48 pages on the QA fixture build                                                                                                                                                                                                                                                                                                                                               |
| `npx tsc --noEmit`     | 138 errors total — **all pre-existing**; the only one in a touched file is the baseline `widths: [64]` in `promoted-media-registry.ts`, present in `HEAD` (verified by `git show HEAD:…`)                                                                                                                                                                                                                                |
| `npm run lint`         | my files: **0 errors**; repo-wide still fails on 3 pre-existing Graft hook files (`.claude/*.cjs`, `.cursor/*.cjs`)                                                                                                                                                                                                                                                                                                      |
| `npm run format:check` | my files formatted; repo-wide check flags baseline files only                                                                                                                                                                                                                                                                                                                                                            |
| home unit suites       | `wp40-home.behavior`, `product-home`, `hero-contract`, `media-components`, `promoted-media`, `public-260/261.asset-promotion`, `hero-sequence` — all green                                                                                                                                                                                                                                                               |
| Playwright Home specs  | **environmental block**: the E2E harness builds against the settings fixture only, and the live CMS currently publishes no Home modules, so Home renders "unavailable" for _every_ Home spec — including ones untouched by this change (all 18 failures are `element count 0`). Not a Stage 4 regression; it needs a build whose CMS answer carries Home modules (the local composition fixture used here is the proof). |

## 13. Remaining risks

1. **Thin relation curves read faint at delivered size** — Stage 2.7 thinned the strokes to 49% of
   Stage 2.6 and validated at render scale; Home renders the art smaller than that, so the curves
   are borderline. Recommended follow-up: one step of stroke weight/contrast, re-validated on the
   composed page (a previous 38°-anchor experiment failed and must not be repeated).
2. **No pinning in this template** — a sticky stage cannot travel here (the section is a flex/grid
   area; measured), and pinning the whole 1609px section would freeze the progress itself. The
   scrub therefore spans the window where the hero is genuinely on screen (≈0.7 viewport) instead
   of the card's 100–140vh; all four states stay visible, which was the actual requirement.
3. **One eager light frame on dark-resolved pages** (17KB) — the price of an immediately available
   default-theme LCP frame without a head-preload mechanism.
4. **Frames 02–04 load when the hero is in view** rather than strictly on approach — same-viewport
   lazy loading is immediate by specification, so staged loading would need a deliberate JS swap.
5. **Fixture dependency for QA** — the visual spec and the capture runner need a build whose CMS
   answer contains Home modules; the runner exists so this never depends on the live CMS.

## 14. git status

Branch `feat/research-universe-prototype`; changes are unstaged/untracked in
`Front-End/public-site` (see the run log for the exact list). No stage, no commit.

## 15. pushed?

**NO.**

## 16. deployed?

**NO.** No production build was published, and no production data or CMS content was touched; the
only server started for QA is a local fixture and a local preview.
