# Research Universe — RU-2C evidence record

Scope of this card: close the About pointer-interaction blocker, then record what a
machine actually observed. Follows the repository convention set by
`PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md`: this document is committed, the raw
captures stay in a gitignored directory and are referenced by path plus the command
that regenerates them.

## 1. Verified results

| Surface                            | Result                                                        | Command                                                                          |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| About browser suite                | **14/14 pass**                                                | see below                                                                        |
| Home browser suite                 | **11/11 pass**                                                | see below                                                                        |
| Accessibility crawl (`public-080`) | **23/23 pass**                                                | `TM_E2E_SKIP_BUILD=1 npx playwright test tests/e2e/public-080-a11y-crawl.e2e.ts` |
| Unit suite                         | **552/552 pass**                                              | `npm test`                                                                       |
| Lint / format / design authority   | pass                                                          | `npm run lint`, `npm run format:check`, `npm run validate:design`                |
| Idle render                        | **0 draw calls** during 1500 ms after the interaction settles | `ru-about.e2e.ts` test 17                                                        |

```bash
# These two suites verify surfaces whose inputs are CMS-gated published contracts
# (the Home hero only exists when /api/home-composition is reachable), so they build
# against the real published API through the existing PUBLIC_API_BASE_URL seam.
TM_E2E_API_BASE_URL=https://tahamohamadi.ir \
  npx playwright test --config playwright.research.config.ts \
  tests/e2e/ru-home.e2e.ts tests/e2e/ru-about.e2e.ts
```

The default `playwright.config.ts` run keeps its hermetic fixture unchanged.

## 2. Why the About interaction looked broken

Two independent causes, and only one of them was a product defect.

**a) The failing specs, not the product.** The About stage sits below the fold. Every
coordinate-based assertion used `page.mouse` against a `boundingBox()` taken without
scrolling, so the pointer events landed outside the viewport and were never delivered
(`document.elementFromPoint()` returned `null`). Proven with a temporary diagnostic
that installed capture-phase listeners, printed the real hit target and the ancestor
chain, and traced a real drag:

```
pointermove@canvas.ru-canvas → pointerdown@canvas.ru-canvas →
pointermove@div.ru-about__stage ×9 → pointerup@div.ru-about__stage
elementFromPoint = canvas.ru-canvas (pointer-events: auto)
```

The drag moved the projected labels by up to 223.8 px and raised draw calls from 36 to
132, so the scene, the projection and the label layer were all working. The layer
inspection also confirmed no CSS layer was intercepting: only `.ru-labels` and
`.ru-leaders` are `pointer-events: none`, which is the intended contract for
presentation overlays.

**b) A real product defect underneath it.** `about-controls.ts` armed a drag — and
called `stage.setPointerCapture()` — on _every_ pointerdown inside the stage,
including pointerdowns on the toolbar buttons that live inside it. Pointer capture
retargets `pointerup` to the stage, so the browser dispatches `click` to the **stage**
instead of the button, and every in-stage control (zoom in, zoom out, focus, reset,
clear) was dead to mouse input while still working from the keyboard. The diagnostic
trace ends with `click@div.ru-about__stage` where the button should have received it.

Fix: a pointerdown on an element that owns its own interaction
(`button, a[href], summary, input, select, textarea, label, [role="button"],
[role="link"], [data-universe-action]`) never starts a scene drag. No blanket
`try/catch`, no globally disabled pointer interaction: native controls keep their
events, and only a bare surface starts a drag.

## 3. Defects found and fixed in this card

1. **Pointer capture swallowed every in-stage control click** (above). Restores
   zoom / focus / reset / clear for mouse and touch users.
2. **Accessibility: two token-level contrast failures** on the universe pages, both
   found by the existing `public-080` crawl once it ran against a real-API build:
   - `.ru-edge__button` text: `--color-ink-secondary` = 4.23:1 on the light chip
     surface (needs 4.5:1) → now `--color-ink`.
   - `.ru-node__kind`: `--color-ink-tertiary` = 3.49:1 at 12px → now
     `--color-ink-secondary`.
3. **The enhancement fought the native disclosure.** `syncNodeDom()` forced
   `details.open = false` whenever nothing was selected, so the panel a keyboard user
   had just opened with Enter was closed again on the next sync. The force-close is
   removed; the closed state now belongs to the native `<details>`.

## 4. Open defect — inherited from the RU branch, not fixed here

Four older specs still fail, all of them about the Home hero's disclosure/selection
behaviour, and all of them predating this card:

| Spec                                     | Assertion                                                            |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `ca03-hero-semantic.e2e.ts:63`           | native node selection toggles without scripts                        |
| `ca05-graph-interaction.e2e.ts` (en, fa) | native node interaction toggles details without automatic navigation |
| `ca06-home-scene.e2e.ts:141`             | resize and theme changes keep one canvas with selection intact       |

They fail with `details[open]` "element(s) not found" after a real keyboard `Enter`
on a focused `<summary>`. What the investigation ruled out: no `preventDefault()` on
summary clicks, no second `<details>` engine mounted (the legacy `hero-enhancement`
module is no longer imported by the Home page), and only one remaining `.open`
assignment (`details.open = true` for the selected node). Cause #3 above was one of
the reasons and is fixed, but the symptom persists, so at least one more cause exists.
Next step is the same technique that closed this card: a live keyboard-trace
diagnostic (focus target → toggle event → selection state) rather than more code
reading.

Also worth recording: these four specs require a `dist` built against the published
API. Against a hermetic local build the hero does not exist at all and 21 specs in
this group fail for that reason alone — which is an environment precondition, not a
regression, and is why the numbers here are quoted with the build they ran against.

## 5. Evidence artefacts

Regenerate with:

```bash
PUBLIC_API_BASE_URL=https://tahamohamadi.ir npm run build
node scripts/capture-research-universe.mjs
```

Captures land in `.evidence/research-universe/` (gitignored) — deliberately **outside**
`test-results/`, because Playwright deletes its `outputDir` at the start of every run
and silently wiped the first set of captures:

| File                             | State                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `about-dark-full.png`            | full page, dark, default pose                                                    |
| `about-dark-default.png`         | stage, dark, default                                                             |
| `about-dark-after-drag.png`      | after a real pointer drag                                                        |
| `about-dark-after-zoom.png`      | after a real wheel zoom                                                          |
| `about-dark-selected-person.png` | centre nucleus selected, resolved through a real click on its projected position |
| `about-dark-selected-domain.png` | a published domain node selected                                                 |
| `about-dark-selected-edge.png`   | a published relationship selected                                                |
| `about-light-selected-node.png`  | light theme, node selected                                                       |
| `about-mobile.png`               | 390 px simplified presentation                                                   |
| `measurements.json`              | the measurable state behind every capture                                        |

`measurements.json` records, for the drag: per-node deltas
(`research-topic-2`: −223.8 / +73.8 px, `identity`: 0 / 0 because the camera looks at
the origin), draw counts (36 → 132 → 228) and the fact that the wheel did not scroll
the page. For the centre click it records `elementFromPoint = canvas.ru-canvas`, the
selected node (`Taha Mohammadi`), and the active panel text (`identity · person ·
identity`, "Open profile record"). For idle: 0 draw calls in 1500 ms with one canvas.

A visual read of the dark desktop capture confirms both RU-2 fixes: exactly one teal
nucleus at the centre with no second sphere on top of it, and thin leader lines
joining every label chip to its node. The outer orbit ring remains low-contrast in
dark mode — unchanged, still open, and not in this card's scope.

## 6. Harness notes worth keeping

- `playwright-web-server.mjs` serves whatever `dist` exists and reuses a running
  server (`reuseExistingServer`), so a run can silently test an older build. Verify
  the log contains a `page(s) built` line, or use `TM_E2E_SKIP_BUILD=1` deliberately.
- An orphaned preview server from a manual capture session held port 4321 and made a
  later run die with "Timed out waiting 300000ms from config.webServer" with no other
  clue. Check with `netstat -ano | grep LISTENING` before blaming the specs.
- The theme control is a cycle, not a two-state switch; a single click from light does
  not reach dark.
- Published `research-topic` nodes classify as level-1 `domain`, which is what
  `data-universe-kind` publishes — assert on that, not on the payload's `type`.
