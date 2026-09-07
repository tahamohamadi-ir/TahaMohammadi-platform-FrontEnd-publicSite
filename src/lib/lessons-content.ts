/**
 * Lessons page family loaders — canonical `/api/v1/lessons/*` (PU-15-lessons / I05).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import { parseJsonResponse, PublicApiError } from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import { type Locale } from './navigation'
import type { components } from '../generated/public-api'
import { workRefToHref } from './hero-graph-content'

export type LessonDetailOut = components['schemas']['LessonDetailOut']
export type LessonResource = components['schemas']['WorkRefOut']
export type LessonNeighbor = components['schemas']['WorkRefOut']

export type LessonDetailModel =
  | { status: 'unavailable' }
  | {
      status: 'ready'
      lesson: LessonDetailOut
    }

export function getLessonUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'Lesson Unavailable',
        message: 'The requested lesson could not be found or is not published.',
      }
    : {
        title: 'درس در دسترس نیست',
        message: 'درس درخواستی یافت نشد یا هنوز منتشر نشده است.',
      }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

export async function getLessonDetail(
  locale: Locale,
  courseSlug: string,
  lessonSlug: string,
): Promise<LessonDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const lesson = await fetchJson<LessonDetailOut>(
      `/api/v1/lessons/${locale}/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lessonSlug)}`,
    )
    // This endpoint enforces publication; LessonDetailOut has no published_at.
    if (
      lesson.locale !== locale ||
      lesson.slug !== lessonSlug ||
      lesson.courseSlug !== courseSlug
    ) {
      throw new PublicApiError('Lesson identity mismatch', 'validation')
    }
    return lesson
  } catch {
    return null
  }
}

export async function fetchLessonDetail(
  locale: Locale,
  courseSlug: string,
  lessonSlug: string,
): Promise<LessonDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }
  const lesson = await getLessonDetail(locale, courseSlug, lessonSlug)
  if (lesson) {
    return { status: 'ready', lesson }
  }
  return { status: 'unavailable' }
}

export async function listCourseLessonParams(
  locale: Locale,
): Promise<Array<{ courseSlug: string; lessonSlug: string }>> {
  if (!canFetchPublicApi()) return []
  try {
    const courses: components['schemas']['CourseListOut'][] = []
    for (let page = 1; ; page += 1) {
      const payload = await fetchJson<
        components['schemas']['PagedCourseListOut']
      >(`/api/courses/${locale}?page_size=100&page=${page}`)
      courses.push(...payload.items)
      if (payload.items.length === 0 || courses.length >= payload.count) break
    }
    const params: Array<{ courseSlug: string; lessonSlug: string }> = []
    for (const course of courses) {
      if (course.locale !== locale) continue
      try {
        const lessonsPayload = await fetchJson<
          components['schemas']['LessonListOut']
        >(`/api/v1/lessons/${locale}?course=${encodeURIComponent(course.slug)}`)
        for (const lesson of lessonsPayload.items || []) {
          if (lesson.locale !== locale || lesson.courseSlug !== course.slug)
            continue
          params.push({
            courseSlug: course.slug,
            lessonSlug: lesson.slug,
          })
        }
      } catch {
        // Ignore errors per course
      }
    }
    return params
  } catch {
    return []
  }
}

export async function resolveLessonAlternateAvailability(
  locale: Locale,
  courseSlug: string,
  lessonSlug: string,
): Promise<boolean> {
  return (
    (await resolveLessonAlternatePath(locale, courseSlug, lessonSlug)) !== null
  )
}

export async function resolveLessonAlternatePath(
  locale: Locale,
  courseSlug: string,
  lessonSlug: string,
): Promise<string | null> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const lesson = await getLessonDetail(locale, courseSlug, lessonSlug)
  const translated = lesson?.alternates?.find(
    (entry) => entry.locale === alternate,
  )
  return translated
    ? (workRefToHref({ ...translated, family: 'lesson' }, alternate) ?? null)
    : null
}
