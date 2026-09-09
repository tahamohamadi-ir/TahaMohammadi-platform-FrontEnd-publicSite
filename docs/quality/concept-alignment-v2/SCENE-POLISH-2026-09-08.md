# Owner-requested scene refinement — 2026-09-08

Owner: PUBLIC. Explicit current request: improve all Three.js/GSAP surfaces, especially the research graph and language gateway. This is a sequential refinement of active CA-04/05/06/07, not a retired packet or acceptance decision. Starting HEAD: dc7609536a406e06bddcd425a6f31f6628abb74e.

Scope: visual renderer and motion modules under `src/lib/visual/`, their regression tests, GatewayPortal, gateway/hero-graph styles, scene browser tests, this handoff and TASK-LIST. Public API, record data, translations and cross-repository interfaces remain unchanged. Existing unrelated dirty files were recorded before editing and are excluded. Current owner request authorizes this refinement in the active checkout; no commit, push or deployment requested.

Plan: first reproduce renderer resource/palette defects; refine architectural arch, threshold and orbital engraving; enrich constellation materials and calibrated rings; correct motion lifecycle and progressive failure handling; run unit/lint/build/design checks and real Chromium scene/navigation/fallback checks in both themes and locales. Retain semantic HTML and demand rendering. No external assets or dependencies.

Acceptance: implementation evidence only; owner visual acceptance and release gates remain open.

## Final implementation scope

- CA-04: graph-scene.ts, GraphSceneDemo.astro, scene-renderers.test.ts. Instanced sphere nodes, batched input edges, faceted nucleus, calibration marks, fitted camera, complete theme updates, reuse geometry within a breakpoint and immediate disposal on breakpoint rebuild. Fifty nodes and 100 input edges retain all instances within the 60 draw/50,000 triangle geometry budgets.
- CA-05/06: graph-motion.ts, graph-controller.ts, hero-enhancement.ts, HeroGraph.astro, hero-enhancement.test.ts, hero-graph.css. Connect real native controls to the controller, preserve exact summary and resolved links in the detail panel, restore reset prompt, fix unbound document.createElement preventing projected labels, keep selected-label emphasis across renders, lift labels above nodes, and retain synchronous WebGL failure as fallback.
- CA-07: gateway-scene.ts, gateway-motion.ts, GatewayPortal.astro, gateway.css, scene-polish.e2e.ts. Beveled three-depth arch, correctly shaped interior opening, stepped threshold, trim and orbital engraving, real bounded geometry tilt, visible Light/Dark structure, framed language links. Fix false ready state and restore the fallback after context loss. Clip decorative overflow at mobile widths.
- Existing PUBLIC contact surface: PageFamilyContactHeroShell.astro. Replace an endless GSAP pulse with a scoped 800ms reveal and preference/page-exit cleanup. This does not redesign the contact page or promote its existing portal artwork.
- Home unavailable state: HomeContent.astro and product-home.test.ts. When localized managed copy cannot be fetched, render the exact approved operational unavailable title/message already tracked in the backend public-copy seed. Preserve an explicitly published empty value. This prevents a blank main region without synthesizing identity, biography, graph or module ordering.
- TASK-LIST.md and this handoff. No content/schema/endpoint/dependency changes.

## Verification

Failing-first evidence: three renderer regressions reproduced (resize allocation, undisposed replaced buffers, stale theme materials), plus missing controller DOM bindings and synchronous WebGL failure incorrectly becoming enhanced. All now pass.

| Check                                                        | Result                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd test -- src/lib/visual src/components/hero`         | 51 tests, 5 files PASS                                                                                                                                                                                                                                            |
| `npm.cmd test -- src/components/home/product-home.test.ts`   | 10 PASS, including failing-first EN/FA unavailable-copy coverage when localized settings are absent                                                                                                                                                               |
| `npm.cmd run lint`                                           | PASS                                                                                                                                                                                                                                                              |
| `npm.cmd run validate:design`                                | PASS; 24 components, six templates, V2.1 overlay                                                                                                                                                                                                                  |
| `npm.cmd run build`                                          | PASS; 42 static pages. Existing large minified chunk advisory remains; measured gzip subtotals below.                                                                                                                                                             |
| `npm.cmd exec playwright test tests/e2e/scene-polish.e2e.ts` | Nine PASS: finite motion, no JS, unavailable WebGL, nonblank language entry, and 320/390/768/1440 motion/theme/context/navigation checks                                                                                                                          |
| Chromium real integrated renderer fixture                    | PASS: native selection, selected projected label, exact summary/link, Escape/reset, pointer selection, Light/Dark, 390px resize, live reduced motion, long Persian native label/detail, visibility events, and context loss retaining selection; zero page errors |
| `git diff --check`                                           | PASS                                                                                                                                                                                                                                                              |

Browser plugin not available; used the repository's installed Playwright/Chromium. Built gateway served at http://127.0.0.1:4173/. Fixture validation used the existing local source server, then stopped that server before the final production build. Screenshots and the repeatable fixture script are outside the repository at `C:/Users/Taha/.codex/visualizations/2026/09/08/01a081a5-b6a6-7660-aad4-ef096b2cf146/`.

Runtime gateway measurement: 27 WebGL draw calls, 8,350 triangles, 544×418 drawing buffer in the 1440px capture. At 390px, document scroll width equals 390px. Gzipped core scene dependencies: graph 162,121 bytes; gateway 160,507 bytes (Three.js, GSAP and scene/motion chunks; excludes route/bootstrap overhead). These are local measurements, not field performance acceptance.

Evidence: gateway-light.png, gateway-dark.png, gateway-mobile-dark.png; graph-selected-light.png, graph-selected-dark.png, graph-mobile-dark.png, graph-mobile-fa-light.png. Inspected rendered geometry, text placement, selection and mobile layouts. Graph screenshots explicitly identify local test data. Compared gateway silhouette and orbital language against the tracked gateway concept; procedural geometry is intentionally simpler than raster lighting. Home keeps the integrated constellation direction from ADR-0008.

## Limits and Git ownership

Published CMS settings/graph content were unavailable in this environment: the actual gateway therefore has empty managed identity/prompt and EN/FA fallback labels, and the real Home graph cannot establish published-data acceptance here. No replacement owner facts were inserted. Populated graph behavior was verified with clearly labeled temporary browser fixtures, not published records. Real 200% browser zoom, screen-reader review, full viewport/locale acceptance matrix, mobile hardware performance and deployed telemetry remain unverified.

Starting dirty files (home content/journey, generated API and resolver fixtures) were not edited by this task. HEAD changed externally during the run to 290833d4a13a39bc28190242f29946a42f17c692; those prior dirty changes disappeared without this task staging or committing them. The scene changes remain uncommitted. No push, merge, deployment, backend/admin mutation or acceptance-gate closure was performed.

## Owner visual direction — replacement gateway revision

The owner rejected the first gateway appearance as neither sufficiently natural nor compelling and required the tracked concepts to govern the next revision. This corrects the record above: passing checks did not constitute visual acceptance.

The current gateway is one grounded architectural threshold: a mineral-finished, beveled stone arch with flush bronze inlays; eight progressively receding, beveled interior steps; a shadow-receiving floor; analytic studio reflections; broad key/rim lighting; threshold light spill; and local teal atmosphere. The reference astrolabe and elliptical orbits are reconstructed as depth-separated geometry behind the threshold, with scale-varied satellite nodes. GSAP moves satellites through a four-second arrival only, then rendering idles. Fine-pointer pose remains bounded; reduced motion settles immediately.

The entry composition bounds portal height against the viewport so the prompt and both real language links remain in the first view on short desktop and mobile screens. The root route uses the existing public-copy seed for operational gateway labels only; it does not invent an unavailable personal identity, claim, or translated content.

Revised local verification: 51 unit tests across five visual/hero files passed; the 10 Home integration tests passed after recording the two failing-first locale cases; lint and authority validation passed; a fresh static build emitted 42 pages. Nine browser checks cover no-JS navigation, renderer failure and context-loss fallback, visible first procedural frame, nonblank language entry, 320/390/768/1440 layouts, theme/reduced-motion changes, and the finite orbital-arrival lifecycle. The built local preview at `http://127.0.0.1:4173/` was manually reloaded and visually inspected. Owner visual acceptance remains open.

The post-review availability correction keeps the canvas visible immediately after its first demand render and suppresses the raster fallback only then. The prior canvas-opacity entrance could briefly leave an empty reserved portal while an import and fallback transition overlapped; the visual entrance now belongs solely to the orbit arrival.

## Deployed-state inspection — 2026-09-09

Regular Playwright/Chromium inspected the language-entry flow on both `https://staging.tahamohamadi.ir/` and `https://tahamohamadi.ir/`. Both live roots returned HTTP 200 and a ready canvas, but served the same earlier root assets (`index.imEsd-_p.css` and `GatewayPortal...DG_Rp9sP.js`) rather than the current local build (`index.B10F9qr5.css` and `GatewayPortal...DUTCCH_4.js`). The four owner-supplied screenshots therefore show the currently deployed earlier gateway, not the locally verified replacement.

On staging, selecting English reached `/en/` with `data-home-state="unavailable"` and an empty `main`. The live content checks found `/api/landings/en/home` available, while `/api/home-composition/en` and `/api/graph/en` returned 404; localized settings existed but had an empty `contentCopy`. Production showed the same missing composition/graph and additionally lacked `/api/v1/site/en`. Under the current published-module contract, those resources cannot be replaced by an invented module order or local profile facts.

Captured deployed-state evidence and machine-readable observations are outside the repository under `live-audit-2026-09-09/`. The final local dark gateway and unavailable Home captures are under `local-final-2026-09-09/`. No remote state was changed.
