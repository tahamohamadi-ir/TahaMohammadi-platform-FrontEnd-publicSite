# Research Universe — RU-3M mobile containment evidence

Scope of this card: one responsive defect on About. Desktop behaviour, graph
semantics and the Home presentation had to stay untouched. This document records
what a machine observed, following `RESEARCH-UNIVERSE-RU2-EVIDENCE.md`.

## 1. The card's stated defect does not reproduce as a first load

The card reported `clientWidth = 1951px / clientHeight = 768px` for the About
canvas "at a mobile viewport around 390px". That number is **not** a cold-load
state. A fresh load at `390 × 844` measured `documentElement.scrollWidth` 390,
an in-band stage and a correctly sized canvas:

| Probe (fresh load, 390×844)        | Before this card | After this card    |
| ---------------------------------- | ---------------- | ------------------ |
| `documentElement.scrollWidth`      | 375 (= viewport) | 390 (= viewport)   |
| stage `clientWidth × clientHeight` | 308 × 623        | **340 × 623**      |
| canvas CSS / backing               | 308 × 623        | 340 × 623          |
| chips fully inside the stage       | 3 of 4           | **4 of 4**         |
| node centroid vs stage centre      | —                | 173,314 vs 170,312 |

## 2. What actually reproduces: a viewport change leaves a desktop-sized stage

Measured with the real Chromium at 1024×800, then shrinking the viewport **in
place** (exactly what the capture script does with `page.setViewportSize`):

| Step                               | viewport | stage     | canvas     | docScroll |
| ---------------------------------- | -------- | --------- | ---------- | --------- |
| fresh load at 1024×800             | 1024     | 927 × 638 | 927 × 638  | 1009      |
| shrink to 390×844 (no reload)      | 390      | **927**   | **927**    | **985**   |
| after one synthetic `resize` event | 390      | **1390**  | 1390 × 934 | —         |

So the stage kept its desktop width, the page overflowed horizontally, and the
next resize event _grew_ the canvas again — the reported `1951` is that same loop
at a wider starting layout.

## 3. Root cause

`.ru-about__stage > canvas` was a layout participant. A canvas with no CSS size
takes its _used_ width from its `width` attribute, and the scene writes that
attribute from `stage.clientWidth` (`enhancement.ts` `applySize()` →
`scene-core.ts` `resize()` → `renderer.setSize(w, h, false)`, which deliberately
never touches styles). That attribute therefore became an intrinsic min-content
floor for every ancestor track — the stage grid, `.ru-about`, the page-family
grid, the template flex rows and `body` — so after a wide layout had been measured
the chain could not shrink back, and `applySize()` re-read the inflated
`stage.clientWidth` on the next event. `.ru-labels` and `.ru-leaders` were already
absolutely positioned for the same reason; only the canvas was exposed.

Fix (`src/styles/research-universe.css`), CSS owns the canvas box:

```css
.ru-about__stage > .ru-canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  min-inline-size: 0;
}
```

Verified by injecting exactly this rule at runtime and repeating the same shrink:
`docScroll` 985 → 375, stage 927 → 293, and the canvas followed the stage across
1024 → 390 → 1440 → 360.

## 4. Two further mobile defects fixed in this card

1. **Double page gutter.** `.ru-about` added a 16px inline inset inside a template
   that already supplies 24px, so the stage measured 293–310px against the card's
   320–360px target. At `≤640px` the section no longer re-insets (`padding-inline:
0`); text keeps the template gutter. The stage is now 340px at a 390px
   viewport.
2. **Canonical view pushed a label outside the stage.** At fit padding 1.14 the
   left-hand chip projected to `left = -18px` and was clipped by the stage's
   `overflow: hidden`. `about-scene.ts` now uses more edge room on the mobile
   branch (1.34) because a chip is drawn _above_ its node and can be 9rem wide;
   chips are also capped at 9rem on narrow stages. All four chips now sit inside
   the stage.

## 5. Verification

```bash
# RU surfaces need CMS-gated published contracts, so they build against the real
# published API through the existing PUBLIC_API_BASE_URL seam.
TM_E2E_API_BASE_URL=https://tahamohamadi.ir \
  npx playwright test --config playwright.research.config.ts \
  tests/e2e/ru-about.e2e.ts tests/e2e/ru-home.e2e.ts
```

| Surface                                 | Result            |
| --------------------------------------- | ----------------- |
| About browser suite (`ru-about`)        | **16/16 pass**    |
| Home browser suite (`ru-home`)          | **11/11 pass**    |
| New mobile containment assertions       | 15, 15b, 15c pass |
| Desktop regression (tests 1–14, 16, 17) | unchanged, pass   |

New assertions: stage width inside the 320–360px band, `canvas.clientWidth ≤
stage.clientWidth`, `documentElement.scrollWidth ≤ innerWidth + 2`, every main
node projecting inside the stage, the node centroid within 16% of the stage centre
(not a corner), every chip intersecting the stage with non-empty text, and a
regression guard that shrinks 1024 → 390 and requires the stage _and_ the canvas
backing store to be no wider than the viewport.

Captures (gitignored directory, regenerate with the command above plus
`node scripts/capture-research-universe.mjs`):

```
.evidence/research-universe/about-mobile-dark-fixed.png     # 390×844, dark, mid-scroll on the stage
.evidence/research-universe/about-mobile-light-fixed.png    # 390×844, light
```

## 6. Known remaining issue

At 340px the four projected label chips are tight: three read cleanly and the
centre chip ("Taha Mohammadi") can be partially overlapped by the long
"Story-Driven Dashboard Design Framework" chip. Containment is fixed and every
chip intersects the stage, but chip-vs-chip collision on narrow stages needs a
label-placement pass (staggered offsets) — deliberately left as follow-up rather
than solved by shrinking the graph or dropping labels.
