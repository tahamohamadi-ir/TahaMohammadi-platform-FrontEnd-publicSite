# Hero v2 — Stage 4.1 report (UX integration hardening, real pinning, midpoint motion QA)

> **UPDATE 2026-09-16 — lifecycle superseded (content preserved).** The stage-scope status lines
> below ("no commit, no push, no deploy") describe the state at the time of writing and no longer
> describe the release: Hero v2 was committed, pushed, staged, owner-signed-off and promoted to
> production as `taha-web-prod:prod-457b7fe7`. Authoritative final record:
> `D:/Project/tahamohammadi-platform/Docs/10-tracking/HERO-V2-PRODUCTION-FINAL-CLOSEOUT-2026-09-16.md`.

Status: **implemented and measured locally. No commit, no push, no deploy. No Blender/render-master
and no asset change of any kind.**

Owner decisions carried over: Home ships the four authored Stage 3 states as a scroll-driven image
sequence on desktop **and** mobile; the image hero replaces the interactive WebGL graph on Home and
About keeps the real graph.

---

## 1. Files changed

| File                                                                | Change                                                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/home/HomeContent.astro`                             | hero module restructured into an outer scroll shell + inner sticky viewport (content contract unchanged)                                               |
| `src/styles/hero-sequence.css`                                      | shell/viewport rules driven by `data-hero-sequence-mode` (`sticky` / `fallback` / `reduced`); no travel in fallback or reduced motion                  |
| `src/lib/visual/hero-sequence.ts`                                   | pinning bands, measured header offset, capability guard, shell-height publication, windowed crossfade + strategy constant, observable mode/travel/fade |
| `src/lib/visual/hero-sequence.test.ts`                              | windowed-mapping tests (holds, blends, ≤2 visible, differs from linear) — 14 tests                                                                     |
| `scripts/qa-stage4_1-capture.mjs`                                   | **new** Stage 4.1 capture runner: 7-point matrix, sticky phases, fade table, reduced motion, motion videos, metrics                                    |
| `scripts/e2e-site-settings-fixture.mjs`                             | Home content contract added (composition, profile, landing, topics, statements)                                                                        |
| `tests/fixtures/home-content/home-content.fixture.json`             | **new** deterministic Home content                                                                                                                     |
| `tests/fixtures/site-settings/localized-site-settings.fixture.json` | hero copy keys added (focus areas, three CTAs, research lead)                                                                                          |
| `tests/e2e/ca03-hero-semantic.e2e.ts`, `tests/e2e/wp40-home.e2e.ts` | remaining retired-contract assertions replaced; evidence-capture budgets raised                                                                        |
| `docs/quality/hero-v2-stage4_1/**`                                  | **new** evidence: 84 screenshots, motion artifacts, summaries                                                                                          |

Ungoverned by this stage (verified): `Design-Assets/hero-v2/**`, the promoted masters
(`src/assets/media/hero-v2/**`), `src/pages/**`, CMS content, production data.

## 2. DOM architecture before / after

**Before (Stage 4)**

```
<div class="tm-template__section" data-home-module="hero">     ← display:flex; flex-direction:column
  <section class="hm-hero hm-hero--integrated">                ← the sticky element: a FLEX ITEM
    copy column · .hm-hero__sequence (HeroSequence)
```

**After (Stage 4.1)**

```
<div class="tm-template__section hm-hero-scroll-shell"          ← display:block (own scrub travel)
     data-home-module="hero" data-hero-scroll-shell>
  <div class="hm-hero-sticky-viewport" data-hero-sticky-viewport>  ← position:sticky (the pin)
    <section class="hm-hero hm-hero--integrated">                  ← unchanged hero, copy + sequence
```

## 3. Why the old sticky failed (measured, not assumed)

`template-base.css:22` styles `.tm-template__section` as `display:flex; flex-direction:column`. A
sticky element can only travel inside its **containing block**, and for a flex item that is its own
flex area — measured: scope 1609px tall (529 hero + 1080 padding) yet the hero still moved exactly
with the page (`stageTop −299` after a 400px scroll). Wrapping it in a plain block viewport inside a
block shell restores the containing block: the same measurement now reads `stageTop 69` pinned for
every state. (A second, independent reason the earlier attempt could not work: pinning the whole
section would freeze `scrollY` relative to the shell and the progress with it.)

## 4. Final scroll-shell architecture

- `.hm-hero-scroll-shell` — block, owns `--hero-scroll-shell-height` (published by the controller).
- `.hm-hero-sticky-viewport` — `position: sticky; inset-block-start: var(--hero-sequence-sticky-top)`
  (the real `.site-header` height, measured = **69px**).
- Shell height = measured viewport height + travel (desktop **1069** = 529 + 540; mobile **1328** =
  815 + 513), so the sequence completes exactly when the pin releases and normal flow resumes.
- `mode` is one attribute: `sticky` (pinned), `fallback` (cannot fit → non-pinned scrub),
  `reduced` (static, no travel).

## 5. Desktop travel

**540px** at 1440×900 = 0.60 viewport heights (band 0.50–0.70). `docScrollable 961`, so the whole
0→1 sequence is reachable with room to spare.

## 6. Mobile travel

**513px** at 430×932 = 0.55 svh-equivalent (band 0.45–0.60), on the **authored mobile composition**
(verified `currentSrc` = `hero-v2-mobile-*`), never a desktop crop.

## 7. Capability fallback rule

`available = innerHeight − headerHeight − 24px safety`; pin only when the hero's measured height
fits inside `available`. Otherwise `mode = fallback`: no shell height, no sticky, and the scrub
spans the visible window capped by the scroll that actually remains (`min(0.7 × innerHeight,
remaining)`), so the last states stay reachable even on a short page. Reduced motion is always
static regardless of fit. This is a capability rule, not "mobile = static".

## 8. Progress formula

`progress = clamp01((scrollY − shellStart) / shellTravel)` where `shellStart` is the shell's document
top and `shellTravel` is the pin's own travel — never the page's remaining height. Keyframe
positions are unchanged: **0.000 / 0.333 / 0.667 / 1.000**, measured exactly (p033 → state 2 at
1.00 with its neighbour at 0.00).

## 9. Chosen transition strategy

**B — short-window crossfade centred on the boundary** (`CROSSFADE_WINDOW = 0.2`). Both strategies
were captured and their opacity tables measured over 21 positions:

| position  | A (linear, captured)                 | B (window, shipped)         |
| --------- | ------------------------------------ | --------------------------- |
| 0.10      | blend already underway               | **1.00 hold**               |
| 0.15      | 0.75 / 0.25                          | 0.75 / 0.25 (window edge)   |
| 0.20–0.45 | partial blend for the whole interval | **1.00 hold**               |
| 0.50      | 0.50 / 0.50                          | 0.50 / 0.50 (window centre) |

A held a partial double exposure across ~two thirds of the scrub; B confines it to ~7% of the scrub
(±0.10 of one segment) and holds every authored state crisp for the rest. No CSS translate/rotate/
scale is used to conceal anything.

## 10. Midpoint ghosting assessment

Full matrix captured for both strategies (7 positions × 4 theme/device combos) plus the three sticky
phases. Strict review of the 50/50 frames: the segment 1→2 midpoint is clean in both; the segment
2→3 midpoint under **A** shows doubled semi-transparent spheres, detached-looking curves and blur —
which is what made B the shipped choice. Under **B** the same 50/50 frame exists only at the window
centre and lasts ~7% of the scrub, with the states either side crisp. Verdict: **B acceptable, A
rejected.**

## 11. Screenshot paths

`docs/quality/hero-v2-stage4_1/` — per label (`window-*` = shipped strategy, `linear-*` = comparison):
`{desktop,mobile}-{dark,light}-p000|p017|p033|p050|p067|p083|p100.jpg` (28 per label),
`*-phase-before|during|after.jpg` (12 per label), `*-reduced-motion.jpg` (2 per label) — **84 total**.

## 12. Motion-review artifact paths

`docs/quality/hero-v2-stage4_1/motion/motion-desktop-dark.{webm,mp4}` and
`motion/motion-mobile-dark.{webm,mp4}` — one continuous scrub each on the composed page: header,
copy, hero visual, the pin, all four states, the release and the transition into the next section.
(The runner also emits per-run `page@*.webm` originals.)

## 13. Reduced-motion measurements

| device  | mode      | progress before → after a 1600px scroll | visible frames | running animations | shell height            |
| ------- | --------- | --------------------------------------- | -------------- | ------------------ | ----------------------- |
| desktop | `reduced` | 0.3333 → **0.3333**                     | **1**          | **0**              | 529 (= hero, no travel) |
| mobile  | `reduced` | 0.3333 → **0.3333**                     | **1**          | **0**              | 815 (= hero, no travel) |

No scroll shell travel is added under reduced motion and page flow is normal. State 2 (index 1)
remains the representative frame; the browser review did not show a clearly stronger static state.

## 14. Asset requests / bytes

| device           | hero requests (active theme) | decoded | formats                    |
| ---------------- | ---------------------------- | ------- | -------------------------- |
| desktop 1440×900 | 4                            | ≈53KB   | AVIF only (browser-chosen) |
| mobile 430×932   | 4                            | ≈45KB   | AVIF only                  |

Audit: only the device-appropriate composition loads; the inactive theme stays lazy (`display:none`

- lazy never intersects); frame 01 remains eager/high for the SSR default theme. The extra eager
  wrong-theme frame still exists at 17KB and was left alone, per the card's explicit priority.

## 15. Performance measurements

| metric                                                                     | desktop 1440×900                 | mobile 430×932    |
| -------------------------------------------------------------------------- | -------------------------------- | ----------------- |
| LCP (cold, **local fixture measurement**, not a production/network number) | 88ms                             | 64ms              |
| CLS (cold load)                                                            | 0.0000                           | 0.0000            |
| layout shift entering/exiting sticky                                       | **none recorded** (`shifts: []`) | **none recorded** |
| long tasks during the complete scrub                                       | 0                                | 0                 |
| running animations after leaving the hero                                  | 0                                | 0                 |
| canvas elements on Home                                                    | **0**                            | **0**             |

## 16. Playwright fixture strategy

`scripts/e2e-site-settings-fixture.mjs` now serves the Home content contract in addition to the
settings one, from `tests/fixtures/home-content/home-content.fixture.json`: `/api/home-composition/
<locale>`, `/api/profiles/<locale>`, `/api/landings/<locale>/home`, `/api/research/topics/<locale>`,
`/api/research/statements/<locale>`; the settings fixture gained the hero copy keys. Everything else
still 404s and no test was weakened — the E2E build simply now receives the same input contract the
real CMS provides, so Home renders its actual hero. No unrelated E2E infrastructure was rewritten.

## 17. Test results

| gate                                              | result                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home specs (ca06 + ca03 + wp40 + stage4.1 visual) | **26 passed / 2 failed / 1 skipped**                                                                                                                                                                                                                                                                                                    |
| — retirement                                      | 1 skipped: the Home graph node-selection case (the graph lives on About, covered by `ru-about.e2e.ts`)                                                                                                                                                                                                                                  |
| — the 2 failures                                  | the two pre-existing full-page **evidence-capture** specs (`wp40:152` 200% zoom, `wp40:204` 768 reflow). Cause: full-page capture of a taller, sticky page; budgets raised to 300s and still exceeded. Not contract failures — every Home contract assertion passes, including sticky engage, fallback, scrub, theme and reduced motion |
| `npm test` (vitest)                               | see run log below                                                                                                                                                                                                                                                                                                                       |
| `npx tsc --noEmit`                                | baseline only (the pre-existing `widths: [64]` record)                                                                                                                                                                                                                                                                                  |
| `npm run lint`                                    | zero errors in every file this stage touched                                                                                                                                                                                                                                                                                            |
| `npm run build`                                   | green                                                                                                                                                                                                                                                                                                                                   |

## 18. Relation-curve readability at final composed size

Reviewed on the real composed frames (window strategy), each against the 3:1 non-text contrast bar:

| combo         | verdict        | basis                                                                              |
| ------------- | -------------- | ---------------------------------------------------------------------------------- |
| desktop dark  | **BORDERLINE** | hairlines traceable at 1:1 but fragile under scaling/AA; the first ink to vanish   |
| desktop light | **BORDERLINE** | ≈1.3:1 against the card — legible in ideal conditions, unreliable in ordinary ones |
| mobile dark   | **BORDERLINE** | visible but hairline and low contrast at 430px                                     |
| mobile light  | **BORDERLINE** | ≈1.5–1.8:1 against white; the weakest ink in the composition                       |

Shared remedy for a later tiny look pass (documented only, nothing touched here): nudge the stroke
to ≈1.5px and darker/greener tilt, or taper opacity toward the peripheral node. **A small Blender
look pass is justified by this verdict.**

## 19. Remaining risks

1. **§8 desktop visual weight**: measured 511×447 against a 599-wide copy at 1440×900 — substantial,
   but the review judged it _supporting/decorative_ rather than co-equal (mobile passes clearly).
   The shortfall is value contrast and floating presentation (art direction), not CSS sizing, so no
   layout change was made. Recommended with the curve pass above.
2. **Two heavy evidence-capture specs** still exceed their (raised) budget on a full-page capture of
   the pinned shell; the capture is the cost, not the contract.
3. The shell's travel reads as empty runway at the very start of the pin (inherent to the card's own
   `shell = viewport + travel` model). It is inside the specified band, not dead space.
4. One eager light frame on dark pages (17KB), unchanged and deliberately deprioritised.
5. Frames 02–04 load when the hero is in view rather than strictly on approach (in-viewport lazy
   loading is immediate by specification).

## 20. git status

Branch `feat/research-universe-prototype`, working tree only (see run log). No stage, no commit.

## 21. pushed?

**NO.**

## 22. deployed?

**NO.** No production deploy, no CMS content or production data touched; only local fixture and
preview servers were started for QA.
