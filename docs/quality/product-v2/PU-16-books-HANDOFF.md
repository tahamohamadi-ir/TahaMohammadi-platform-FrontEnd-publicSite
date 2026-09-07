# PU-16-books Handoff

Status: **PU-16-books_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented canonical books page family from backend projections with full body, real file/member links, and CMS story integration:
  - Created `src/lib/books-content.ts`:
    - Defined types: `BookListOut`, `BookDetailOut`, `BooksIndexModel`, `BookDetailModel`.
    - Implemented loaders: `listBooks`, `fetchBooksIndex`, `getBook`, `fetchBookDetail`, `listBookSlugs`, `resolveBookAlternateAvailability`.
  - Created `src/styles/product-books.css`:
    - Responsive book grid, cover image presentation, metadata list (authors, publisher, date, ISBN, access state, license).
  - Created `src/components/books/CollectionPage.astro`:
    - Books index collection view with clean responsive cards.
  - Created `src/components/books/DetailPage.astro`:
    - Book detail layout with cover media, publication metadata, CMS `StoryDocument` integration, fallback description, and related work items.
  - Created localized routes:
    - `src/pages/en/books/index.astro`
    - `src/pages/en/books/[slug].astro`
    - `src/pages/fa/books/index.astro`
    - `src/pages/fa/books/[slug].astro`
  - Test suites:
    - Added `src/lib/books-content.test.ts`:
      - Books collection page list test.
      - CMS story document rendering test on book detail.
      - Fallback description test when story is absent.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/lib/books-content.test.ts`
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build.
- Design authority:
  - `npm run validate:design` -> PASS.

## 2026-09-07 — Detail SEO forwarding (PU-16/PU-24, CM-03 slice: books)

- Added `pickDetailSeo()` in `src/lib/seo.ts`: accepts typed
  `PublicSeoOut` and untyped record maps, returns only non-blank
  `description`/`socialImage` so layouts omit empty meta tags.
- `src/pages/en/books/[slug].astro` and `src/pages/fa/books/[slug].astro`
  now forward `model.book.seo` through `pickDetailSeo` into `SiteLayout`
  (`description`, `socialImage`); `alternateAvailable` wiring unchanged.
- Tests: `src/lib/seo.test.ts` -> **4 passed** (2 `buildPageSeo` + 2
  `pickDetailSeo`). `npm run lint` clean. `npm run build` -> 42 pages.
- Remaining families (talks/resources/lessons/projects/etc.) follow the
  same one-line pattern per detail page; not changed in this slice.

## Exact Paths Modified

- `src/lib/books-content.ts`
- `src/components/books/CollectionPage.astro`
- `src/components/books/DetailPage.astro`
- `src/styles/product-books.css`
- `src/pages/fa/books/index.astro`
- `src/pages/fa/books/[slug].astro`
- `src/pages/en/books/index.astro`
- `src/pages/en/books/[slug].astro`
- `src/lib/books-content.test.ts`
- `docs/quality/product-v2/PU-16-books-HANDOFF.md`
