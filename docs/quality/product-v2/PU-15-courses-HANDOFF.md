# PU-15-courses Handoff

Status: **PU-15-courses_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented complete F07 Teaching & Courses Index & Detail with CMS Story and CA-14 Visual Alignment:
  - Created `src/styles/pf06-alignment.css`:
    - Featured learning paths, path process shells, course progression indicators.
    - Full light and dark theme variables support.
  - Created `src/styles/product-teaching.css`:
    - Clean course listings, learning paths, meta lists, outcomes and prerequisites prose styling.
  - Enhanced `src/components/teaching/TeachingDetailContent.astro`:
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `model.record.story` is present with valid blocks.
    - Preserved fallback to `model.record.body` when story document is absent.
  - Test suites:
    - Added `src/components/teaching/product-family.test.ts`:
      - CMS story document rendering test on course.
      - Fallback body HTML test when story is absent.
      - Teaching page ready view test.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/components/teaching/product-family.test.ts`
  - `npm test -- src/components/teaching/public-220.behavior.test.ts`
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build.
- Design authority:
  - `npm run validate:design` -> PASS.


## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) forward `model.record.seo (course/talk union)` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts`) into `SiteLayout` as
  `description`/`socialImage`. `npm run lint` clean,
  `npm run format:check` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/components/teaching/TeachingDetailContent.astro`
- `src/styles/pf06-alignment.css`
- `src/styles/product-teaching.css`
- `src/components/teaching/product-family.test.ts`
- `docs/quality/product-v2/PU-15-courses-HANDOFF.md`
