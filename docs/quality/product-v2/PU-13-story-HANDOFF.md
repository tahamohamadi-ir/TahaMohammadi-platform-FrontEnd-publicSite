# PU-13-story Handoff

Status: **PU-13-story_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented core story document content models and utilities in `src/lib/story-content.ts`:
  - Defined TypeScript interfaces `StoryBlock`, `StorySection`, `StoryDocument`, and `StoryTocItem`.
  - Implemented `extractTableOfContents(story)` extracting structured TOC items from heading blocks with level support and deterministic ID fallbacks.
  - Implemented `hasStoryContent(story)` checking for non-empty renderable sections and blocks.
  - Implemented `formatFileSize(bytes)` supporting B, KB, and MB sizing representations.
- Created unit tests in `src/lib/story-content.test.ts`:
  - Verified content detection, structured multi-level TOC generation, edge cases (missing IDs, empty whitespace), and file size formatting.
- Created `src/styles/story.css`:
  - Semantic typography for story prose and layout grids (1col, 2col, auto-fit grid).
  - Clean styling for all §I03 story blocks: headings with anchor links, text, syntax-styled code pre blocks, responsive table wrappers, math display regions, downloadable file cards, references citation lists, related record cards, quotes, media figures, and accessible accordions.
  - Full `@media print` support: forces all details/accordions open, avoids page breaks inside code/tables, renders link destinations, and ensures high contrast black-and-white printing.
- Created `src/components/story/StoryBlock.astro`:
  - Renders typed blocks with exact-locale labels (fa/en) for files, references, related items, code copy.
  - Supports `heading` (h1-h6 with anchor links), `text` / `paragraph`, `code`, `table`, `math`, `file`, `references`, `related`, `quote`, `figure`/`image`, `accordion`/`tabs` (`<details>/<summary>` native no-JS structure), and `divider`.
- Created `src/components/story/StoryDocument.astro`:
  - Main container component rendering TOC navigation and section layouts with full no-JS and RTL/LTR direction support.

## Verification Evidence

- Unit test suite:
  - `npm test -- src/lib/story-content.test.ts` -> 4/4 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> 33 pages built, Pagefind indexed en and fa pages, complete in 3.56s.
- Design authority:
  - `npm run validate:design` -> PASS (24 components, 6 templates, V2 overlay 2.1.0 validated).

## Exact Paths Modified

- `src/lib/story-content.ts`
- `src/lib/story-content.test.ts`
- `src/styles/story.css`
- `src/components/story/StoryBlock.astro`
- `src/components/story/StoryDocument.astro`
- `docs/quality/product-v2/PU-13-story-HANDOFF.md`
