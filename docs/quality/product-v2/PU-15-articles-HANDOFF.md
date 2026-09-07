# PU-15-articles Handoff

Status: **PU-15-articles_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented complete F06 Writing / Articles Index & Detail with CMS Story and CA-13 Visual Alignment:
  - Created `src/styles/pf03-alignment.css`:
    - Theme explore shells, reading progress, article rows, series groupings.
    - Full light and dark theme variables support.
  - Created `src/styles/product-writing.css`:
    - Responsive article cards layout, reading time metadata, topic tags list, article body prose.
  - Enhanced `src/components/writing/WritingDetailContent.astro`:
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `model.article.story` is present with valid blocks.
    - Preserved fallback to `model.article.body` when story document is absent.
  - Test suites:
    - Added `src/components/writing/product-family.test.ts`:
      - CMS story document rendering test.
      - Fallback body HTML test.
      - Writing page ready view test.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/components/writing/product-family.test.ts` -> 4/4 passed.
  - `npm test -- src/components/writing/public-211.behavior.test.ts` -> 4/4 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build, Pagefind indexed en and fa pages.
- Design authority:
  - `npm run validate:design` -> PASS.

## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) forward `model.article.seo` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts`) into `SiteLayout` as
  `description`/`socialImage`. `npm run lint` clean,
  `npm run format:check` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/components/writing/WritingDetailContent.astro`
- `src/styles/pf03-alignment.css`
- `src/styles/product-writing.css`
- `src/components/writing/product-family.test.ts`
- `docs/quality/product-v2/PU-15-articles-HANDOFF.md`
