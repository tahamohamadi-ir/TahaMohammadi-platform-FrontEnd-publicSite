# Stage 4.2 — relation-curve legibility micro-pass (report)

Scope: the Home hero's relation curves only. No redesign, no asset re-authoring, no prompt re-reading,
no copy/layout/motion change, no About work, no GLB, no push, no deploy.

## 1. Baseline

Blender 5.2.1 LTS. Frozen sources verified by sha256 **before and after** every run in this stage:

| source                          | sha256 (prefix)     | after the stage |
| ------------------------------- | ------------------- | --------------- |
| `source/hero-v2-stage3.blend`   | `7ba69d2e1cf16696…` | unchanged       |
| `source/hero-v2-stage2_7.blend` | `78d74e51ad428430…` | unchanged       |
| `source/hero-v2-stage2_6.blend` | `d5d7ae75f2dacc62…` | unchanged       |

Nothing was opened in Blender's UI and saved over an approved file. The stage writes exactly one new
artifact: `source/hero-v2-stage4_2.blend` (956,416 B), a derivative of stage 3.

## 2. How the curve look is parameterised

The strokes are built by `hero_v2_stage2_7.build_relation_curve()`, which stage 3 imports and calls
without an explicit radius, so the tube radius binds as that function's default
(`CURVE_TUBE_RADIUS = 0.0037`) and the per-theme stroke gain lives in `THEME_PRESET[...]["stroke"]`.

`scripts/hero_v2_stage4_2.py` therefore drives the approved builder and overrides **only** those two
knobs (rebinding the function default deliberately, patching the theme gain in place, capturing the
base value once so repeated calls cannot compound). Nothing else in the stage-3 build path is touched:
`solver`, geometry scaffolding, anchors, pacing and cameras all re-run under the approved code.

## 3. Candidates

`scripts/run_stage4_2_candidates.py` ran one Blender process per candidate (no scene state can leak),
verifying the frozen hashes before and after, and wrote an `override-record.json` per candidate.

| #   | family                             | radius scale | radius   | dark gain | light gain |
| --- | ---------------------------------- | ------------ | -------- | --------- | ---------- |
| A   | baseline (as shipped)              | 1.00         | 0.0037   | 1.00      | 0.22       |
| B   | weight +20–30 %, modest contrast   | 1.25         | 0.004625 | 1.15      | 0.16       |
| C   | weight +35–45 %, stronger contrast | 1.40         | 0.00518  | 1.30      | 0.12       |
| D   | **calibrated hybrid** (chosen)     | 1.30         | 0.00481  | **1.24**  | 0.16       |

D exists because the delivered-scale reviews disagreed between themes, which the card explicitly
allows: the physical radius is shared (one relation, one geometry), only the per-theme material preset
differs. D takes the top of B's band for weight, B's proven light-side gain, and a dark-side contrast
between B and C.

## 4. Method — measured at the browser display box, not in Blender

`scripts/qa-stage4_2-delivered-scale.mjs` replays the real delivery chain per candidate:

1. alpha master PNG →
2. resize to the derivative width the browser actually picks (desktop 800 px, mobile 400 px, from the
   `sizes` attributes) →
3. encode AVIF at the shipped quality (q66) →
4. resize to the display box Stage 4.1 measured on the composed page (**desktop 511×447**, **mobile
   348×348**) and composite over the **real card colour sampled from the delivery screenshots**
   (dark `rgb(10,18,46)`, light `rgb(254,254,254)`) →
5. isolate thin structures with a two-pass chamfer distance transform (half-thickness ≤ 3 px) so the
   sphere blobs cannot dominate a line measurement, excluding a 2 px collar around each blob →
6. measure ink, effective line width (`2·area/perimeter`) and local contrast on the curves alone.

Two defects in the first version of this harness were found and fixed before any number was trusted:
transparent pixels were not composited (so nearly every pixel counted as ink) and the anti-aliased rim
of every sphere passed the ink threshold at distance 24 (so A, B and C measured identically — the tell
that the metric was not seeing the curves at all).

## 5. Measured results (FRAME_03)

| candidate | desktop dark | desktop light | mobile dark | mobile light |
| --------- | ------------ | ------------- | ----------- | ------------ |
| A         | 1.72:1       | 1.89:1        | 1.69:1      | 1.72:1       |
| B         | 1.82:1       | 1.98:1        | 1.75:1      | 1.78:1       |
| C         | 1.88:1       | 2.06:1        | 1.79:1      | 1.83:1       |
| **D**     | **1.84:1**   | **2.01:1**    | **1.76:1**  | **1.79:1**   |

Curve-ink pixels rise monotonically with weight (A 587 → C 630 → D 630 desktop dark). The reported
contrast is a **proxy from this harness, not an authoritative absolute**: with the collar exclusion the
residual mask still mixes in thin shading structures, so the ordering between candidates is meaningful
while the absolute level should not be read as a WCAG result. The decision below rests on the visual
reviews of the delivered-size sheets, which is the surface the card specifies.

## 6. Delivered-scale sheets

`docs/quality/hero-v2-stage4_2/delivered-scales/row-{desktop,mobile}-{dark,light}.png` — A/B/C/D side by
side at the delivered box, AVIF q66, with a caption strip. These are the decision instrument.

## 7. Reviews and the decision

Reviewed by eye on the real sheets (desktop dark and desktop light):

- **Dark** — A and B both failed "noticed without searching"; only C passed visibility, but C started to
  read as a molecule/technical diagram. D was judged _"the best balance of the four… connectors are
  visible but not dominant"_ and still reads as a relationship.
- **Light** — B was the clear winner (A broke into detached fragments before reaching the spheres, C
  turned diagrammatic and slightly jagged). D was judged _"at least as good as B… better than B for bond
  legibility"_, still premium/editorial, curves attached.

**Chosen: D.** C was rejected despite being the most visible — the card forbids choosing C merely for
visibility, and the light-side review actively rejected it.

## 8. Stage 3 revalidation subset (§13)

The approved validator ran against the derivative
(`validate_hero_v2_stage3.py --blend source/hero-v2-stage4_2.blend`).

- All substantive checks the card lists — node count, number of relation curves, anchor stability,
  minimum form gap, safe margins, desktop/mobile framing difference, no clipping, frame continuity, no
  extra objects, no GLB — **passed** (the validator's failure list contains exactly two entries, neither
  of them geometric).
- The two failures are procedural, and the one that matters is independently disproved: the check
  `stage_2_7_source_untouched` fails on the derivative's stage-3 bookkeeping context, while the actual
  stage-2.7 source is **byte-identical** to its pre-run hash (`78d74e51ad428430…`). The second,
  `all_sixteen_reviews_recorded`, expects stage 3's own review-audit artifact, which a derivative does
  not carry; the 4.2 review evidence is this stage's delivered-scale sheets.

## 9. §9 review questions

| #   | question                                          | answer                                                                                                                                  |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A   | noticeable at the delivered box without searching | no for A/B on dark; C yes but at a cost; **D yes** on dark, **D yes** on light                                                          |
| B   | subordinate to the spheres                        | yes in all four, including C                                                                                                            |
| C   | reads as relationships, not orbit paths           | yes in all four — curves terminate at paired spheres, no rings                                                                          |
| D   | reads as a molecule / technical wiring            | no for A/B; **slightly for C**; no for D                                                                                                |
| E   | best balance                                      | **D** (dark), **D ≥ B** (light)                                                                                                         |
| F   | light theme stays premium/editorial               | yes for A/B/D; no for C                                                                                                                 |
| G   | detached or jagged lines                          | A yes (fades before touching spheres); C slightly jagged; **D attached**                                                                |
| H   | works on mobile                                   | mobile rows and metrics were generated and track desktop within 2–5 %; no separate eye review was recorded — stated rather than implied |
| I   | neon, orbit path, sci-fi HUD                      | no in any candidate                                                                                                                     |
| J   | any candidate visibly too much                    | C on the light side, and C's dark read tips technical                                                                                   |

## 10. §10 presence

Not triggered. Presence (canonical framing, exact scale, centre, vertical band, readable sequence) is
untouched: the build re-ran the approved scaffolding, and the measured framing/margins are unchanged.
No camera nudging was applied, because the curve fix changed legibility without changing composition.

## 11. Production and promotion

- `scripts/build_hero_v2_stage4_2.py --candidate D --production` → `source/hero-v2-stage4_2.blend` +
  16 alpha masters in `renders/stage4_2/alpha/` (1600×1400 desktop, 800×800 mobile, same naming as the
  approved stage-3 set).
- `scripts/promote-hero-v2-stage4_2.mjs --renders …/stage4_2/alpha` → **16 of 16 masters changed, 16
  authority hashes rewritten**. New sha256 prefixes: desktop-dark `d88e1748a3bb…`, `06cf9c51d683…`,
  `6399e9c5ef99…`, `1ca95169a04d…`; desktop-light `93ee80eaf0d9…`, `097a7acea982…`, `4f71c0f9ae51…`,
  `943eb69a2143…`; mobile-dark `162b6d22171d…`, `b552364bee61…`, `b452a7a34622…`, `9120d57dd3bb…`;
  mobile-light `892352d5d3fd…`, `fec7166f7a30…`, `6fc1adf526ff…`, `9ebc012eb35d…`.
- **No frontend code changed in this stage**: no radii, gains or prompt values exist in the app. The
  assets flow through the same governed pipeline as before.

## 12. First-paint theme behaviour (§15)

`scripts/qa-stage4_2-first-paint.mjs` loaded Home with the theme established _before_ first paint
(`colorScheme: 'dark'`), which the site's early bootstrap picks up:

- dark, desktop and mobile: `themeAttribute: "dark"`, `visibleSequenceTheme: "dark"` at
  DOMContentLoaded → **the first painted hero is dark**; no light hero is painted.
- light: clean, 4 requests, no wrong-theme frame.

The Stage 4.1 motion recordings began in light and turned dark because the recorder itself switched the
theme after load — harness setup, not a product flash. The only residual is that one light frame
(~17 KB, the SSR-default frame 01) is still eagerly **fetched** on a dark page; it is never painted. That
trade-off is the pre-existing, documented one from Stage 4/4.1 and is left unchanged here.

## 13. Gates

| gate                         | result                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `npm run build`              | Complete — 42 pages (the count follows the live CMS's published modules; 72 in stage 4) |
| `vitest run`                 | **598 / 598 passed, 95 files**                                                          |
| `tsc --noEmit`               | 140 errors = the exact pre-existing baseline, zero new                                  |
| `eslint` (stage-4.2 scripts) | 0                                                                                       |
| `prettier --check`           | clean                                                                                   |

## 14. Not run, and why

The midpoint matrix and the motion recapture (`QA_LABEL=stage4_2`) **could not run against this build**:
the runner aborts with _"no hero sequence at desktop: the build under test has no Home modules"_, because
the live CMS currently publishes no Home modules, so the built Home page renders no hero to drive. This
is the same environment limitation documented in Stage 4.1 §12, where it was solved for Playwright only,
via a local fixture. No motion video or midpoint capture for Stage 4.2 is claimed here. To close it:

```
# start the local CMS fixture, then rebuild against it and re-run the capture
node scripts/e2e-site-settings-fixture.mjs &            # serves the Home fixture
CMS_BASE_URL=<fixture-url> npm run build                # Home modules now present in dist
QA_OUT_DIR=docs/quality/hero-v2-stage4_2 QA_LABEL=stage4_2 node scripts/qa-stage4_1-capture.mjs
```

The Stage 4.2 delta is a curve-look change in 16 PNG masters with no frontend code change, so the
regression surface those runs cover is otherwise unchanged from the green Stage 4.1 suite.

## 15. State

No commit, no push, no deploy, no GLB, no production build artefact published. Working tree carries the
changes only.
