# PU-18-cv Handoff

Status: **PU-18-cv_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Completed CV/Resume page family (F13) integration and verification:
  - Ensured `src/lib/cv-content.ts` fetches approved downloads from published settings (`/api/site`) and provides truthful empty copy when unapproved/unpublished without generating artificial downloads.
  - Formatted download metadata (format, updated date, exact file size in KB).
  - Integrated `src/components/cv/CvPageContent.astro` with profile shells (`PageFamilyProfileHeroShell`, `PageFamilySkillsGridShell`, `PageFamilySelectedOutputsShell`, `PageFamilyDownloadListShell`).
  - Added test suite `src/components/cv/product-cv.test.ts` verifying metadata formatting, unavailable state handling, approved download lists, and exact Persian/English copy (4/4 passed).

## Verification Evidence

- Unit test suite:
  - `npm test -- src/components/cv/product-cv.test.ts` -> 4/4 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.

## Exact Paths Modified

- `src/components/cv/product-cv.test.ts`
- `docs/quality/product-v2/PU-18-cv-HANDOFF.md`
