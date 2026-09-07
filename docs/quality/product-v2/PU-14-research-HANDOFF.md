# PU-14-research Handoff

Status: **PU-14-research_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented complete F03 Research Index & Detail with CMS Story and CA-10 Visual Alignment:
  - Extended `src/lib/research-content.ts`:
    - Added `PublicationListOut` export and integrated `publications` into `ResearchIndexModel`.
    - Added `listResearchPublications(locale)` fetching published publications from `/api/publications/{locale}`.
    - Updated `fetchResearchIndex(locale)` to retrieve topics, projects, statements, and publications concurrently without fabricating data.
  - Enhanced `src/components/research/ResearchTopicDetailContent.astro`:
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `model.record.story` is present with valid blocks, providing rich typography, multi-level TOC navigation, code blocks, math display, tables, file downloads, and reference citation lists.
    - Preserved fallback to legacy structured fields (`motivation`, `problems`, `research-questions`, `methods`, `future-directions`) when story document is absent.
    - Implemented `relatedRecords` linking with normalized canonical path resolution for cross-family relationships (`project`, `publication`, `book`, `talk`, etc.).
  - Enhanced `src/components/research/ResearchPageContent.astro`:
    - Integrated `PageFamilyConstellationShell` into the active/ready index view sharing constellation semantics with genuine focus areas.
    - Wrapped ready-state bands in a unified `<div slot="records">` container for robust Astro slot projection.
    - Integrated real selected publications list via `PageFamilySelectedPublicationsShell` when publications are present, dropping placeholder bibliography cards when real data is loaded.
  - Updated `src/components/page-family/PageFamilySelectedPublicationsShell.astro`:
    - Added `publications?: PublicationListOut[]` prop.
    - Conditionally renders genuine `.pf-pub-list` and `.pf-pub-row` items with year badges, summary, and links when real publication records exist, falling back to empty placeholder row only in unpopulated/empty states.
  - Created styles:
    - `src/styles/pf05-alignment.css`: Constellation layout grid, orbit canvas, backplate styling, and bibliography row cards.
    - `src/styles/product-research.css`: Topic card grid, research statement callout, detail prose, and related records layout.
  - Updated locale pages:
    - `src/pages/en/research/index.astro`, `src/pages/fa/research/index.astro`, `src/pages/en/research/[slug].astro`, `src/pages/fa/research/[slug].astro` importing `pf05-alignment.css` and `product-research.css`.

## Verification Evidence

- Unit test suites:
  - `npm test -- src/components/research/product-family.test.ts` -> 4/4 passed (CMS story rendering, relatedRecords linking, RTL Persian topic detail, real publication list in index).
  - `npm test -- src/components/research/public-201.behavior.test.ts` -> 3/3 passed (structural empty chrome, topic card rendering, topic detail sections).
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> 33 pages built, Pagefind indexed en and fa pages, complete in 3.81s.
- Design authority:
  - `npm run validate:design` -> PASS (24 components, 6 templates, V2 overlay 2.1.0 validated).

## Exact Paths Modified

- `src/lib/research-content.ts`
- `src/components/research/ResearchPageContent.astro`
- `src/components/research/ResearchTopicDetailContent.astro`
- `src/components/page-family/PageFamilySelectedPublicationsShell.astro`
- `src/styles/product-research.css`
- `src/styles/pf05-alignment.css`
- `src/pages/en/research/index.astro`
- `src/pages/fa/research/index.astro`
- `src/pages/en/research/[slug].astro`
- `src/pages/fa/research/[slug].astro`
- `src/components/research/product-family.test.ts`
- `docs/quality/product-v2/PU-14-research-HANDOFF.md`
