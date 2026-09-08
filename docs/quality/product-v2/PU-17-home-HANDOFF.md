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

## 2026-09-08 — Data-backed Home layout correction

- Staging inventory confirmed three published `ResearchTopic` records per
  locale, three published projects, and three published publications. It did
  not contain localized Home copy or selected-record settings.
- `home.css` now uses an auto-fit card grid so the published record count
  determines the desktop composition instead of leaving empty fixed columns.
  Each topic has a bounded card treatment; the Research Fit panel spans the
  available section width. No profile claim or topic was added.
- The local publication rail now has a stable label/citation hierarchy and
  wraps long titles without overflow. Its existing `/[locale]/publications/`
  route remains unchanged.
- `npm.cmd test -- src/components/home/product-home.test.ts` → **7/7**;
  `npm.cmd run lint` and `npm.cmd run build` passed; formatting and
  `git diff --check` were clean.
- `wp40-home.e2e.ts` cannot currently prove populated Home visual acceptance
  in the static test server: the server has no public API settings, so eight
  assertions expecting the Home H1/graph/skip link fail while the two capture
  checks pass. This is recorded as an environment/data gate, not weakened.

The structured Profile education/experience records can support a truthful
Journey, but the current public Home contract does not expose them. No static
timeline was invented; an additive backend contract and populated settings
remain required before that UI can be implemented.

## 2026-09-08 — Journey wired to the new public projection (owner-directed)

- Backend now exposes `GET /api/v1/site/{locale}/journey` (fail-closed 404
  unless the `about` profile is live-published). `getHomeJourneyContent`
  reads it with the shared `read()` helper: 404/exception → `[]`, so the
  section stays honestly hidden without CMS data.
- `HomeJourney.astro` renders `TimelineNode` with `label`/`summary`
  (organization or institution) /`period` — all record fields, no new copy
  in either locale. `HomeJourneyContent.milestones` is now
  `{title, subtitle, period}`.
- Consumer types re-synced a second time (49 paths): pins, generated
  `public-api.ts` (+journey schemas), resolver-chain pins.
- Evidence: `product-home` **8/8** (new milestone render test; the API-404
  test still proves the empty state), contract + resolver + hero-graph
  suites green, `lint` clean.
