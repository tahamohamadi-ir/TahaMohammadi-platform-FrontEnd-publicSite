# PU-17-home Handoff

Status: **PU-17-home_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Integrated research-first home layout according to §I04 and Family F02:
  - Extended `src/lib/home-content.ts` with API loaders: `fetchPrimaryProfile`, `fetchHomeComposition`, `fetchHomeLanding`, and async `loadHomeHeroContent(locale)`.
  - Profile identity, professional title, and bio statements dynamically pull from published profile records when available, falling back to honest empty states.
  - Linked featured project slugs only when verified against published project items (`resolveFeaturedProjectHref`), preventing dead or speculative links.
  - Unconfirmed manuscripts in `HomeFeaturedPublications.astro` preserve truthful non-linked representation until officially approved and published.
  - Connected `HomeHero.astro` to await dynamic CMS content and render integrated hero layout.
- Created `src/components/home/product-home.test.ts`:
  - Verified `loadHomeHeroContent` fallback behavior and custom CMS payload overrides.
  - Verified `HomeHero.astro` layout and branding in both EN and FA.
  - Verified `HomeFeaturedProjects.astro` resolving published slugs only.
  - Verified `HomeFeaturedPublications.astro` suppressing unlinked/placeholder hrefs for unpublished manuscripts.
  - Verified `HomeResearchInterests.astro` and `HomeJourney.astro` rendering.
- All 6 tests in `src/components/home/product-home.test.ts` pass.

## Verification Evidence

- Unit test suite:
  - `npm test -- src/components/home/product-home.test.ts` -> 6/6 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.

## Exact Paths Modified

- `src/lib/home-content.ts`
- `src/components/home/HomeHero.astro`
- `src/components/home/product-home.test.ts`
- `docs/quality/product-v2/PU-17-home-HANDOFF.md`
