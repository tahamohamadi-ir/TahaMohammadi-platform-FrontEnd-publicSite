# ADR: Motion and Visual Effects — CSS-First, No Runtime Animation Libraries

## Status

Accepted (PUBLIC-190 visual recovery; complements PUBLIC-013)

## Context

Page-family concepts (PF-01..PF-08), Home, and Gateway rely on promoted raster art, typography hierarchy, and layout shells—not runtime 3D scenes or scroll-driven JavaScript animation. The public site is static-first Astro with a no-JavaScript readability requirement (`PUBLIC-300`) and a performance budget (`PUBLIC-290`).

Evaluated options included GSAP (with ScrollTrigger), Three.js/WebGL hero scenes, and CSS-only motion using pinned design tokens.

## Decision

Use **CSS transitions and `@media (prefers-reduced-motion)`** for all shipped motion. Do **not** add GSAP, Three.js, or other runtime animation libraries in this recovery slice.

Decorative fidelity comes from:

- Promoted `ThemePicture` / `PromotedPicture` assets (hero atmospheres, graph backplates, rail previews)
- Structural page-family shells (`PageFamilyIndexHero`, constellation, featured/path shells, timeline placeholders)
- Tokenized spacing, typography, and layout in `page-families.css`, `home.css`, and `gateway.css`

Progressive enhancement: optional `<script>` blocks remain limited to form submit (Contact) and theme toggle—never required to read content.

## Rationale

| Requirement         | CSS-first                       | GSAP / Three.js                       |
| ------------------- | ------------------------------- | ------------------------------------- |
| No-JS readability   | Content renders without JS      | Scroll/3D effects absent without JS   |
| Bundle / LCP        | Zero extra JS for visuals       | Adds KB–MB and parse cost             |
| Concept fidelity    | Static compositions with art    | 3D not in approved concept PNGs       |
| Reduced motion      | Native `prefers-reduced-motion` | Requires explicit `matchMedia` guards |
| Astro static output | Styles in CSS; minimal islands  | Client hydration or inline scripts    |

GSAP remains appropriate if a future task requires scroll-linked sequencing **after** `PUBLIC-190` closes and owner accepts the JS dependency budget. Three.js is out of scope unless a concept revision explicitly requires WebGL.

## Where motion lives today

| Surface               | Mechanism                                    | File(s)                               |
| --------------------- | -------------------------------------------- | ------------------------------------- |
| Theme toggle, buttons | CSS `transition` on tokens                   | `Button.astro`, `gateway.css`         |
| Gateway locale links  | CSS hover transitions                        | `gateway.css`                         |
| Page-family shells    | Static layout + promoted images              | `src/components/page-family/*`        |
| Home graph            | Semantic list + backplate (no canvas)        | `HomeResearchGraph.astro`, `home.css` |
| Research PF-05 empty  | `PageFamilyConstellationShell` (aria-hidden) | `PageFamilyConstellationShell.astro`  |

## Consequences

- No new `dependencies` entries for animation libraries in `package.json`.
- Visual QA still compares PNG captures to concept references; CSS-only does not auto-close `PUBLIC-190`.
- Future scroll choreography must add an ADR amendment before importing GSAP.

## Alternatives considered

| Option               | Why deferred                                     |
| -------------------- | ------------------------------------------------ |
| GSAP + ScrollTrigger | Not required for empty-state structural chrome   |
| Three.js hero        | No concept authority for 3D; LCP/CLS risk        |
| Motion (Framer)      | React-centric; public site is Astro with islands |

## Verification

- `npm run build` — no animation library imports
- `npm run test:nojs` — routes readable with JS disabled
- `src/lib/page-family-empty-chrome.test.ts` — hero media mappings guarded
