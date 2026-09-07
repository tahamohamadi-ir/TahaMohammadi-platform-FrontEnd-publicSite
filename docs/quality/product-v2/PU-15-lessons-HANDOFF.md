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
  - `npm test -- src/lib/lessons-content.test.ts src/lib/story-content.test.ts src/components/teaching/product-lessons.test.ts` -> 13/13 passed (2026-09-07).
- Contract checks (2026-09-07, against generated `public-api.ts` + `Back-End/apps/api/api.py`):
  - `LessonDetailOut` has no `published_at`; `getLessonDetail` does not gate
    on it (endpoint enforces publication). Regression test pins a real-shaped
    200 response without `published_at` -> `ready`.
  - Course enumeration pages past 100 (`/api/courses/{locale}` + `page` loop);
    regression test pins 101 courses across 2 pages.
  - Lesson alternates carry `courseSlug` from the backend
    (`_resolve_public_alternates`); `resolveLessonAlternatePath` builds the
    translated `/education/{course}/lessons/{slug}/` href from explicit
    identity, not same-slug guessing.
  - Lesson resources/neighbors are `WorkRefOut` rendered through
    `workRefToHref`; no `#` fallback links.
- Linting:
  - `npm run lint` -> Clean 0 errors.
- Astro build:
  - `npm run build` -> Clean build (42 pages, 2026-09-07).
- Design authority:
  - `npm run validate:design` -> PASS.


## 2026-09-07 — Detail SEO forwarding (PU-24, CM-03)

- Detail pages (en/fa) now forward `model.lesson.seo` through the shared
  `pickDetailSeo()` helper (`src/lib/seo.ts`, tested in
  `src/lib/seo.test.ts` -> 4 passed) into `SiteLayout` as
  `description`/`socialImage`. Absent or blank values omit the meta
  tags. `npm run lint` clean, `npm run build` -> 42 pages.

## Exact Paths Modified

- `src/lib/lessons-content.ts`
- `src/components/teaching/LessonDetailContent.astro`
- `src/pages/fa/education/[courseSlug]/lessons/[lessonSlug].astro`
- `src/pages/en/education/[courseSlug]/lessons/[lessonSlug].astro`
- `src/components/teaching/product-lessons.test.ts`
- `docs/quality/product-v2/PU-15-lessons-HANDOFF.md`
