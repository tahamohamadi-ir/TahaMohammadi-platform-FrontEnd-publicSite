# CA-07 Handoff — Procedural gateway portal

Task ID: CA-07
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-07`; no new branch or
worktree was created — work was done in the current checkout while
preserving unrelated dirty files listed below)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was
performed. Changes are exactly the allowlisted paths below.
Stop marker: **`CA-07_HANDOFF_READY`** (with one explicit related-baseline
deviation recorded in §7 — no fabricated data introduced)

## 1. Dependencies

`execution-tasks.json` (v2.1.0) records CA-07 with `depends_on: [CA-04]`.

- CA-04 was implemented in this same checkout before CA-07: procedural
  Three.js renderer pattern, DPR/buffer ceilings, and demand-driven
  disposal (`CA-04-HANDOFF.md`, `HANDOFF_READY`, uncommitted, same base
  HEAD). Central acceptance of CA-04 is still pending; no CA-04 file was
  touched by this packet — its renderer was used as a pattern reference
  only.
- `three` (^0.173.0) and `@types/three` were already installed under CA-04
  ownership; GSAP pre-exists. No dependency change in this packet.
- Work is independent of Home integration: no CA-03/05/06 hero file was
  touched, and the gateway path imports none of their modules (proven in
  §4 and built-HTML evidence in §5).

No backend, admin, central-queue, or `Front-End/Assets` file was touched.

## 2. Changed paths (exact allowlist only)

- `src/pages/index.astro` (MODIFIED) — inline `.gw__portal` raster block
  replaced with `<GatewayPortal />`; brand mark, H1, role line, footer
  prompt, and both language links byte-identical otherwise.
- `src/components/gateway/GatewayPortal.astro` (NEW) — decorative portal
  shell: orbital SVG, hidden `aria-hidden` canvas, unchanged ThemePicture
  raster fallback, and one progressive `<script>` that lazily `import()`s
  the portal scene/motion after paint, wires resize/`tm-themechange`/
  `pagehide`, and falls back without reload. Never imports the Home graph
  path.
- `src/lib/visual/gateway-scene.ts` (NEW, `ca07-1.0.0`) — procedural arch
  portal factory: extruded arch ring with gold edges, three-step
  threshold, translucent teal interior, halo ring, two tilted orbitals
  with cardinal glow points. Transparent background, CSS-token palette,
  DPR/buffer ceilings, context-loss handling, full disposal. No textures,
  no baked text, no external models.
- `src/lib/visual/gateway-motion.ts` (NEW) — one 750ms GSAP entrance
  (inside the 600–900ms settle budget); reduced motion settles instantly
  with no transforms and updates live; `gsap.context` + `matchMedia`
  scoping with full revert; visibility pause.
- `src/styles/gateway.css` (MODIFIED) — absolute `.gw__portal-canvas`
  overlay (pointer-transparent, no layout shift; slot size stays reserved
  by the existing `aspect-ratio`), `hidden`/fallback concealment only.
- `tests/e2e/wp40-gateway.e2e.ts` (UNMODIFIED) — still asserts the raster
  fallback contract and semantic navigation; left intact.
- `tests/e2e/ca07-gateway-scene.e2e.ts` (NEW) — 12 Playwright tests (see
  §4).
- `docs/quality/concept-alignment-v2/CA-07-HANDOFF.md` (NEW, this file).

## 3. What was implemented

1. **Original 3D arch/threshold**: extruded arch outline with inner opening
   (`ExtrudeGeometry`, 48-curve segments), `EdgesGeometry` gold trim,
   three stepped boxes, halo `RingGeometry`, two tilted elliptical
   `LineLoop` orbitals, four glow spheres, and a calm translucent interior
   plane. Light reads ivory `surface` structure with teal/gold detail;
   dark reads navy `surface` with teal interior and gold edges — all from
   live CSS tokens, no second palette.
2. **Calm illumination**: ambient wash + soft frontal key only; transparent
   scene background integrates with the page canvas.
3. **Direct language navigation**: links are static anchors (`/en/`,
   `/fa/`); the entrance never gates clicks (e2e navigates mid-entrance).
4. **One canvas**: single `canvas[data-gateway-canvas]` per route;
   component guards against double enhancement; static HTML proves one
   portal marker and zero graph regions.
5. **Fallback and no-JS usable**: approved `portal-centered-*` ThemePicture
   stays mounted (wp40 assertions untouched); import rejection, missing
   canvas, scene-construction throw, or `context-lost` set
   `data-gateway-state="fallback"`, re-hide the canvas, and dispose workers
   while brand/heading/links stay usable. JS-disabled pages show brand,
   links, and the noscript raster with zero canvases revealed.
6. **Home separation**: gateway files import only `three`,
   `scene-contract` tokens, and `gsap`. Built `dist/index.html` contains
   zero `graph-scene`/`hero-enhancement`/`data-graph-region` bytes, and
   Home pages contain zero `gateway-scene` bytes.

## 4. Failing-before / passing-after evidence (focused checks)

Failing-before: no `GatewayPortal`, no `gateway-scene`/`gateway-motion`
modules, no `[data-gateway-portal]` marker — the new `ca07` suite failed
6/11 (all four canvas-slot widths, the failure-fallback state, and the
CSS-zoom simulation variant); the 5 regression guards (immediate nav,
keyboard, no-graph-imports, no-JS, reduced motion) passed before and after.

Passing-after (final, post-prettier):

- `npm.cmd exec playwright test tests/e2e/wp40-gateway.e2e.ts
tests/e2e/ca07-gateway-scene.e2e.ts` → **15 passed / 1 failed, 12/12 on
  the new ca07 file** (4 widths × canvas slot, immediate nav, keyboard
  focus with no trap, aborted-chunk fallback, no-Home-imports, no-JS,
  reduced motion, light→dark theme survival with one canvas, 200%-zoom
  proxy). The single failure is the pre-existing wp40 accessible-name
  assertion recorded in §7; the H1 markup is untouched by this packet.
- `npm.cmd run lint` → clean (0 errors, 0 warnings; one interim
  unused-var in the component script was restructured, not suppressed).
- `npm.cmd run build` → green, 33 pages, Pagefind en+fa indexed.
- `npx prettier --check` on all allowlisted source/test paths → clean
  (targeted `--write` only, no repo-wide format run).
- Route-separation proof on built output: `dist/index.html` has
  `data-gateway-portal:1`, `canvas:1`, `graph-ref:0`, `h1:1`, both locale
  hrefs; `dist/{en,fa}/index.html` have zero `gateway-scene` bytes.
- Scene-JS budget on `dist/_astro`: three 124 KiB gzip (shared lazy
  chunk) + gateway-scene 2 + gateway-motion 1 + gsap 26 ≈ **153 KiB gzip**
  per gateway route, inside the 300 KiB ceiling. (The `>500 kB` Vite
  chunk-size warning names the shared lazy three chunk; it is not a
  first-paint payload.)

## 5. Source / schema hashes (baseline record)

- No API, schema, or generated-contract file was read for facts or
  modified: the gateway is content-static (brand + two locale links from
  existing route contracts). `src/generated/public-api.ts` untouched.
- Gateway contract version: `ca07-1.0.0` (new module, no locked-contract
  change; `scene-contract.ts` `ca03-1.0.0` only lends token roles and
  ceiling constants).

## 6. Screenshots / rendered output

No screenshots captured — this packet claims DOM/behavioral acceptance
(ready-state canvas at 320/390/768/1440, fallback, no-JS, reduced motion,
both themes functionally toggled in-e2e), not visual acceptance, which
remains open per ADR-0008 and PUBLIC-190. A passing build or test run is
not claimed as visual or owner acceptance.

## 7. Related baseline deviation (coordinator decision recorded)

`tests/e2e/wp40-gateway.e2e.ts` → **4 passed / 1 failed**, identically
before and after this change (verified on the pre-change build): the
`keeps semantic language selection and a single accessible page name`
case expects H1 accessible name `/Taha\s+Mohammadi/` but the unchanged
brand markup renders two adjacent spans with no whitespace
(`"TahaMohammadi"`). The H1 is outside the CA-07 portal slice (brand stays
intact per packet) and the file was deliberately left unmodified — no
assertion weakened. Coordinator revision of that brand-markup expectation
(or an explicit keep-as-is ruling) is requested; this packet's own
keyboard/no-trap coverage passes around it via `toContainText`.

Checkout-scope note: `src/foundation.contract.test.ts` was not re-run
repo-wide (packet checks are the focused e2e pair plus lint/build); the
CA-07 src paths are new allowlisted files and the suite's CA-01 guard
concerns pre-existing surfaces only.

## 8. Dirty status and boundaries kept

Pre-existing dirty/untracked files were preserved untouched (`AGENTS.md`,
`PROJECT-MANIFEST.md`, CA-01..06 allowlist paths, Atlas sections,
fixtures, central V2 queue). Generated output (`dist/`,
`.e2e-serve-dist/`, `test-results/`) is ignored build/test evidence and
uncommitted. No secrets, publication, deploy, legacy code copy, invented
content/links/routes, Figma implementation, or `Front-End/Assets` use. No
next packet started; PUBLIC-190/PUBLIC-350 acceptance untouched.

## 9. Done-when verification

- [x] Original 3D arch/threshold geometry, no raster on a plane (raster
      kept only as the static fallback, fading on success).
- [x] Calm illumination, transparent background, token-driven light/dark.
- [x] Direct language navigation (mid-entrance click reaches `/en/`).
- [x] One canvas; reserved slot (aspect-ratio) so no layout shift.
- [x] Fallback (`import-rejected`/context-loss/missing canvas) and no-JS
      usable with working links and honest `fallback` state.
- [x] Home graph modules not imported here (source + built-HTML proof).
- [x] Before/after evidence recorded; fixture-vs-published N/A (gateway
      carries no published records).

---

## 10. Stop Marker

**CA-07_HANDOFF_READY**
