# PU-16-series Handoff

Status: **PU-16-series_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented canonical series page family (F12) loader and presentation components:
  - `src/lib/series-content.ts`: Loaders for `/series/{locale}` and `/api/v1/series/{locale}/{slug}` with exact-locale checks, sequential ordering, and truthful unavailable fallback states.
  - `src/styles/product-series.css`: Responsive styles for multi-part reading paths, sequential step counters, light/dark themes, and RTL/LTR layout.
  - `src/components/series/CollectionPage.astro`: Index component listing available series with links to sequential detail paths.
  - `src/components/series/DetailPage.astro`: Long-form detail view with title, summary, story document integration, and numbered list of member articles linking to `/blog/[slug]`.
  - `src/pages/en/blog/series/[slug].astro` and `src/pages/fa/blog/series/[slug].astro`: Dynamic routes pre-rendering published series slugs with honest 404 handling.
  - `src/lib/series-content.test.ts`: Complete unit test suite verifying list and detail views, sequential ordering, story integration, article link resolution, and empty states (5/5 passed).

## Verification Evidence

- Unit test suite:
  - `npm test -- src/lib/series-content.test.ts` -> 5/5 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.

## Exact Paths Modified

- `src/lib/series-content.ts`
- `src/components/series/CollectionPage.astro`
- `src/components/series/DetailPage.astro`
- `src/styles/product-series.css`
- `src/pages/fa/blog/series/[slug].astro`
- `src/pages/en/blog/series/[slug].astro`
- `src/lib/series-content.test.ts`
- `docs/quality/product-v2/PU-16-series-HANDOFF.md`
