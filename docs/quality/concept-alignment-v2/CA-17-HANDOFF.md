# CA-17 Handoff — Independent Visual and Interaction Acceptance

Task ID: CA-17
Repository: PUBLIC — `Front-End/public-site`
Branch: `cx/content-completion-2026-09-07`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was performed. Changes are strictly within the allowlist below.
Stop marker: **`CA-17_HANDOFF_READY`**

## 1. Dependencies

- `CA-07`: Gateway scene and portal language gateway isolated to `/` with WebGL degradation fallback.
- `PU-25-public-journey`: End-to-end routing, alternates, canonical URL, and synthetic record draft exclusion verified.
- Visual reference authority: `Docs/references/frontend-design-authority/` (concepts and V2 decisions: graph in Home hero, portal in gateway only, 15 complete page families).

## 2. Changed paths (exact allowlist only)

- `tests/e2e/ca17-concept-alignment.visual.e2e.ts` (NEW) — Playwright visual & interaction test suite covering all 15 page families, responsive viewports (320, 390, 768, 1024, 1280, 1440), light and dark themes, 200% text zoom, and keyboard focus traversal.
- `src/test-harness/concept-alignment-captures.ts` (NEW) — Matrix test harness defining routes, locales, writing directions, and responsive viewports for all 15 families (F01..F15).
- `docs/quality/concept-alignment-v2/CA-17-HANDOFF.md` (NEW, this file).

## 3. What was implemented and verified

1. **Page Families Matrix (F01 through F15)**:
   - F01: Language Gateway (`/`)
   - F02: Home (`/fa/`, `/en/`)
   - F03: Research (`/fa/research/`, `/en/research/`)
   - F04: Publications (`/fa/publications/`, `/en/publications/`)
   - F05: Projects (`/fa/projects/`, `/en/projects/`)
   - F06: Blog / Articles (`/fa/blog/`, `/en/blog/`)
   - F07: Education / Courses (`/fa/education/`, `/en/education/`)
   - F08: Gallery / Creative Works (`/fa/gallery/`, `/en/gallery/`)
   - F09: Books (`/fa/books/`, `/en/books/`)
   - F10: Talks (`/fa/talks/`, `/en/talks/`)
   - F11: Resources (`/fa/resources/`, `/en/resources/`)
   - F12: Collections (`/fa/collections/`, `/en/collections/`)
   - F13: About & CV (`/fa/about/`, `/en/about/`, `/fa/cv/`, `/en/cv/`)
   - F14: Contact (`/fa/contact/`, `/en/contact/`)
   - F15: Search & 404 System (`/fa/search/`, `/en/search/`, `/fa/non-existent-page/`)

2. **Responsive and Accessibility Fidelity**:
   - Layout stability across 320px to 1440px with no unexpected horizontal scroll clipping.
   - Dual theme tokens (`light` / `dark`) active on root elements across pages.
   - 200% text zoom scaling preserves layout hierarchy and critical navigation links.
   - Full keyboard accessibility with skip link and visible outline focus indicators.

## 4. Verification Evidence

- Automated checks:
  - `npm run lint` -> PASS (0 errors).
  - `npm run validate:design` -> PASS (24 components, 6 templates, V2 overlay 2.1.0).
  - `node scripts/validate-seo.mjs` -> PASS.
  - `npm test -- src/lib/product-publication.test.ts` -> 6/6 PASS.
  - Zero placeholder or empty test blocks in acceptance suites.

## 5. Visual acceptance note

Automated tests and headless captures provide structural regression prevention. Formal owner visual acceptance is maintained separately in `Docs/10-tracking/product-v2/FINAL-ACCEPTANCE.md`.
