# PU-13-story Handoff

Status: **PU-13-story_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented core story document content models and utilities in `src/lib/story-content.ts`:
  - Defined TypeScript interfaces `StoryBlock`, `StorySection`, `StoryDocument`, and `StoryTocItem`.
  - Implemented `parseHeadingLevel(raw)` supporting numeric and string heading values (h1-h6).
  - Implemented `extractTableOfContents(story)` extracting structured TOC items from heading blocks with level support and deterministic ID fallbacks.
  - Implemented `hasStoryContent(story)` checking for non-empty renderable sections and blocks.
  - Implemented `formatFileSize(bytes)` supporting B, KB, and MB sizing representations.
- Created unit tests in `src/lib/story-content.test.ts`:
  - Verified heading level parsing, content detection, structured multi-level TOC generation, edge cases (missing IDs, empty whitespace), and file size formatting (5/5 passed).
- Created and updated `src/styles/story.css`:
  - Semantic typography for story prose and layout grids (1col, 2col, auto-fit grid).
  - Clean styling for all 21 §I03 story block types: headings with anchor links, text, syntax-styled code pre blocks, responsive table wrappers, math display regions, downloadable and unavailable file cards, references citation lists, related record cards, quotes, media figures, accessible accordions/tabs, CTA buttons, gallery grids, responsive video/audio players, timelines, metric counters, before/after comparisons, and snap-scroll sliders.
  - Full `@media print` support: forces all details/accordions open, avoids page breaks inside code/tables, renders link destinations, and ensures high contrast black-and-white printing.
- Implemented `src/components/story/StoryBlock.astro`:
  - Full support for all 21 block types with exact-locale labels (fa/en) and no-JS fallback.
  - Uses `canonicalPath` for safe route generation of related records with fallback to static cards when unrouted.
  - Employs dedicated disabled presentation for restricted or unavailable file attachments (no false download links).
- Created `src/components/story/StoryDocument.astro`:
  - Main container component rendering TOC navigation and section layouts with full no-JS and RTL/LTR direction support.

## Verification Evidence

- Unit test suite:
  - `npm test -- src/lib/story-content.test.ts` -> 6/6 passed (adds PU-13/CM-05 media-shape regression).
  - `npm test -- src/lib/story-content.test.ts src/lib/lessons-content.test.ts` -> 10/10 passed.
  - `npm test -- src/lib/lessons-content.test.ts src/lib/story-content.test.ts src/components/teaching/product-lessons.test.ts` -> 13/13 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> 42 pages built, Pagefind indexed en and fa pages.
- Design authority:
  - `npm run validate:design` -> PASS (24 components, 6 templates, V2 overlay 2.1.0 validated).

## 2026-09-07 — Projected-media shape fix (PU-13/CM-05)

- Backend projection emits single-object `media` for `mediaId` and array
  `media` for `mediaIds` under the same key (`projection.py:310-326`).
- Added `normalizeStoryMedia()` / `firstStoryMedia()` in
  `src/lib/story-content.ts`; `StoryBlock.astro` now uses them for
  figure/video/audio (`firstStoryMedia`) and gallery/slider
  (`normalizeStoryMedia`), so a single-object gallery no longer renders
  empty and an array-shaped figure no longer loses its first image.
- Regression test in `src/lib/story-content.test.ts` covers object, array,
  and absent shapes.

## Exact Paths Modified

- `src/lib/story-content.ts`
- `src/lib/story-content.test.ts`
- `src/styles/story.css`
- `src/components/story/StoryBlock.astro`
- `src/components/story/StoryDocument.astro`
- `docs/quality/product-v2/PU-13-story-HANDOFF.md`

## 2026-09-07 — CTA URL omission guard

- A `cta` block without a non-blank `settings.url` previously rendered a
  fabricated `href="#"`. `StoryBlock.astro` now omits that CTA instead of
  presenting a false navigation target.
- `story-projection.test.ts` first reproduced the rendered `href="#"`, then
  verifies that an incomplete CTA produces neither a hash link nor its label.
- Verification after the repair: focused story projection suite **4/4**;
  full public suite **87 files / 453 tests**; `npm run lint`,
  `npm run validate:design`, and `npm run build` all passed (42 pages).

This is a regression repair only. It does not change packet status, visual
acceptance, publication acceptance, or the separate staging journey gate.
