# PU-14-statements Handoff

Status: **PU-14-statements_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented unambiguous canonical detail routes and components for research statements:
  - Created `src/components/research/ResearchStatementDetailContent.astro`:
    - Clean layout rendering statement title, optional PDF download link, related work records.
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `statement.story` is present with valid content.
    - Fallback to body paragraphs when story document is absent.
  - Created canonical localized statement detail pages:
    - `src/pages/en/research/statements/[slug].astro`
    - `src/pages/fa/research/statements/[slug].astro`
  - Enhanced `src/lib/research-content.ts`:
    - Added `ResearchStatementDetailModel`.
    - Added `fetchResearchStatementDetail`, `listResearchStatementSlugs`, and `resolveResearchStatementAlternateAvailability`.
  - Test suites:
    - Added `src/components/research/product-statements.test.ts`:
      - CMS story document rendering test on research statement.
      - Fallback paragraphs test when story is absent.
      - PDF download link presence test.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/components/research/product-statements.test.ts`
  - `npm test -- src/components/research/product-family.test.ts`
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build.
- Design authority:
  - `npm run validate:design` -> PASS.

## Exact Paths Modified

- `src/lib/research-content.ts`
- `src/components/research/ResearchStatementDetailContent.astro`
- `src/pages/fa/research/statements/[slug].astro`
- `src/pages/en/research/statements/[slug].astro`
- `src/components/research/product-statements.test.ts`
- `docs/quality/product-v2/PU-14-statements-HANDOFF.md`
