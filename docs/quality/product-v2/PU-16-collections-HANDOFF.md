# PU-16-collections Handoff

Status: **PU-16-collections_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented canonical collections page family (F12) loader and presentation components:
  - `src/lib/collections-content.ts`: Loaders for `/api/v1/collections/{locale}` and `/api/v1/collections/{locale}/{slug}` with exact-locale assertions, pagination support, and honest unavailable fallback states.
  - `src/styles/product-collections.css`: Responsive typography, grid layout, curator dossier callouts, light/dark styling, and RTL/LTR adaptations.
  - `src/components/collections/CollectionPage.astro`: Index page component displaying published collections with curator info, dates, and canonical links.
  - `src/components/collections/DetailPage.astro`: Long-form detail view with curator metadata, criteria, cover media, rich story document rendering, and included works with resolved canonical routes.
  - `src/pages/en/collections/index.astro` and `src/pages/fa/collections/index.astro`: Connected to `CollectionPage.astro`.
  - `src/pages/en/collections/[slug].astro` and `src/pages/fa/collections/[slug].astro`: Dynamic detail routes with static path pre-rendering and honest 404 on unavailable records.
  - `src/lib/collections-content.test.ts`: Complete unit test coverage for list, detail, curator criteria, story integration, work references, and empty states (5/5 passed).

## Verification Evidence

- Unit test suite:
  - `npm test -- src/lib/collections-content.test.ts` -> 5/5 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Design validation:
  - `npm run validate:design` -> PASS.

## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) forward `model.collection.seo` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts`) into `SiteLayout` as
  `description`/`socialImage`. `npm run lint` clean,
  `npm run format:check` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/lib/collections-content.ts`
- `src/components/collections/CollectionPage.astro`
- `src/components/collections/DetailPage.astro`
- `src/styles/product-collections.css`
- `src/pages/fa/collections/index.astro`
- `src/pages/fa/collections/[slug].astro`
- `src/pages/en/collections/index.astro`
- `src/pages/en/collections/[slug].astro`
- `src/lib/collections-content.test.ts`
- `docs/quality/product-v2/PU-16-collections-HANDOFF.md`
