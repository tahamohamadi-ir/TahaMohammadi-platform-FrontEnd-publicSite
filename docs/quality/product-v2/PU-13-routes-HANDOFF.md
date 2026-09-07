# PU-13-routes Handoff

Status: **PU-13-routes_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Extended centralized route family mappings in `src/lib/routes.ts`:
  - Added full `RouteFamily` union type supporting all target families: `home`, `blog`, `research`, `research-statements`, `projects`, `publications`, `teaching`, `creative`, `about`, `contact`, `books`, `talks`, `resources`, `collections`, `series`, `lessons`.
  - Implemented `canonicalPath(family, locale, slug, options)` supporting nested course lessons (`options.courseSlug`), series, research statements, and standalone books/talks/resources/collections.
  - Implemented `isReservedSlug(family, slug)` handling reserved prefixes such as `series` in article slugs and `statements` in research topic slugs.
  - Implemented `resolveLegacyMigrationRedirect(legacyPath)` ensuring legacy writing/teaching/creative routes redirect correctly without cycle risks or arbitrary fallbacks.
- Extended SEO route registries:
  - Updated `src/lib/seo-route-registry.ts` and `scripts/seo-route-registry.mjs` with `books`, `talks`, `resources`, and `collections` index paths in `LOCALE_INDEX_ROUTES`.
- Tests:
  - Updated `src/lib/routes.test.ts` adding test coverage for canonical paths for new families (`books`, `talks`, `resources`, `collections`), lesson routes, reserved slug detection, and legacy migration redirection.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/lib/routes.test.ts` -> 7/7 passed.
  - Full vitest suite: 62 test files, 368 tests passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Production build:
  - `npm run build` -> 33 pages built, Pagefind indexed en and fa pages, complete in 4.11s.
- Design authority:
  - `npm run validate:design` -> PASS (24 components, 6 templates, V2 overlay 2.1.0 validated).

## Exact Paths Modified

- `src/lib/routes.ts`
- `src/lib/routes.test.ts`
- `src/lib/seo-route-registry.ts`
- `scripts/seo-route-registry.mjs`
- `docs/quality/product-v2/PU-13-routes-HANDOFF.md`
