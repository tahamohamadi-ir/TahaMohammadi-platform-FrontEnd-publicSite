# PU-15-lessons Handoff

Status: **PU-15-lessons_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented complete lesson pages, parent course context links, lesson resources, and published-only ordered neighbors:
  - Created `src/lib/lessons-content.ts`:
    - Defined types: `LessonNeighbor`, `LessonResource`, `LessonDetailOut`, `LessonDetailModel`.
    - Implemented loaders: `getLessonDetail`, `fetchLessonDetail`, `listCourseLessonParams`, `resolveLessonAlternateAvailability`.
  - Created `src/components/teaching/LessonDetailContent.astro`:
    - Layout rendering lesson position eyebrow, parent course context link, lesson summary.
    - Integrated CMS `StoryDocument` rendering (`src/components/story/StoryDocument.astro`) when `lesson.story` is present with valid content.
    - Rendered lesson external/internal resources card list.
    - Ordered previous/next lesson pagination navigation with stable localized links.
  - Created canonical nested lesson routes:
    - `src/pages/en/education/[courseSlug]/lessons/[lessonSlug].astro`
    - `src/pages/fa/education/[courseSlug]/lessons/[lessonSlug].astro`
  - Test suites:
    - Added `src/components/teaching/product-lessons.test.ts`:
      - CMS story document rendering test on lesson.
      - Fallback summary test when story is absent.
      - Lesson resources and pagination navigation test.
      - Persian RTL localization test.

## Verification Evidence

- Vitest unit tests:
  - `npm test -- src/components/teaching/product-lessons.test.ts`
  - `npm test -- src/components/teaching/product-family.test.ts`
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build.
- Design authority:
  - `npm run validate:design` -> PASS.

## Exact Paths Modified

- `src/lib/lessons-content.ts`
- `src/components/teaching/LessonDetailContent.astro`
- `src/pages/fa/education/[courseSlug]/lessons/[lessonSlug].astro`
- `src/pages/en/education/[courseSlug]/lessons/[lessonSlug].astro`
- `src/components/teaching/product-lessons.test.ts`
- `docs/quality/product-v2/PU-15-lessons-HANDOFF.md`
