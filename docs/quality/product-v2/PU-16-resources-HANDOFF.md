# PU-16-resources Handoff

Status: **PU-16-resources_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented canonical resources page family from backend projections with full body, real media download links, and CMS story integration:
  - Created `src/lib/resources-content.ts`:
    - Defined types: `ResourceListOut`, `ResourceDetailOut`, `ResourcesIndexModel`, `ResourceDetailModel`.
    - Implemented loaders: `listResources`, `fetchResourcesIndex`, `getResource`, `fetchResourceDetail`, `listResourceSlugs`, `resolveResourceAlternateAvailability`, `formatFileSize`.
  - Created `src/styles/product-resources.css`:
    - Responsive resources grid cards, file metadata list (type, language, mime format, size in MB/KB, license, access state), direct download buttons.
  - Created `src/components/resources/CollectionPage.astro`:
    - Resources index collection view with downloadable item cards.
  - Created `src/components/resources/DetailPage.astro`:
    - Resource detail layout with metadata, download action button, CMS `StoryDocument` integration, fallback description, and related work items.
  - Created localized routes:
    - `src/pages/en/resources/index.astro`
    - `src/pages/en/resources/[slug].astro`
    - `src/pages/fa/resources/index.astro`
    - `src/pages/fa/resources/[slug].astro`
  - Test suites:
    - Added `src/lib/resources-content.test.ts`:
      - Resources collection page list test.
      - CMS story document rendering test on resource detail.
      - Fallback description and download file link test when story is absent.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/lib/resources-content.test.ts`
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build.
- Design authority:
  - `npm run validate:design` -> PASS.


## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) now forward `model.resource.seo` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts` -> 4 passed) into `SiteLayout` as
  `description`/`socialImage`. Absent or blank values omit the meta
  tags. `npm run lint` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/lib/resources-content.ts`
- `src/components/resources/CollectionPage.astro`
- `src/components/resources/DetailPage.astro`
- `src/styles/product-resources.css`
- `src/pages/fa/resources/index.astro`
- `src/pages/fa/resources/[slug].astro`
- `src/pages/en/resources/index.astro`
- `src/pages/en/resources/[slug].astro`
- `src/lib/resources-content.test.ts`
- `docs/quality/product-v2/PU-16-resources-HANDOFF.md`
