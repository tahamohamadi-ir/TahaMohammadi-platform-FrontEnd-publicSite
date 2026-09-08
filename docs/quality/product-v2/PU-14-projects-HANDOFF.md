# PU-14-projects Handoff

Status: **PU-14-projects_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented complete F05 Projects Index & Detail with CMS Story and CA-12 Visual Alignment:
  - Created `src/styles/pf04-alignment.css`:
    - Evidence grid shell cards, distinct media roles, available evidence affordances.
    - Full light and dark theme variable support.
  - Created `src/styles/product-projects.css`:
    - Project cards grid layout, detailed case study breakdown section, screenshots and links styling.
  - Enhanced `src/components/projects/ProjectDetailContent.astro`:
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `model.project.story` is present with valid blocks.
    - Preserved fallback to structured case study fields (problem, constraints, technical decisions, trade-offs, outcomes, lessons learned) when story document is absent.
  - Test suites:
    - Added `src/components/projects/product-family.test.ts`:
      - CMS story document rendering test.
      - Fallback case study and methods test.
      - Projects page ready view test.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/components/projects/product-family.test.ts` -> 4/4 passed.
  - `npm test -- src/components/projects/public-210.behavior.test.ts` -> 3/3 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build, Pagefind indexed en and fa pages.
- Design authority:
  - `npm run validate:design` -> PASS.

## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) now forward `model.project.seo` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts` -> 4 passed) into `SiteLayout` as
  `description`/`socialImage`. Absent or blank values omit the meta
  tags. `npm run lint` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/components/projects/ProjectDetailContent.astro`
- `src/styles/pf04-alignment.css`
- `src/styles/product-projects.css`
- `src/components/projects/product-family.test.ts`
- `docs/quality/product-v2/PU-14-projects-HANDOFF.md`
