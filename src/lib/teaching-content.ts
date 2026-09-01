/**
 * Teaching page family loaders — canonical `/api/courses/*` and `/api/talks/*` (PUBLIC-220).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import type { components } from '../generated/public-api'
import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import { primaryNav, type Locale } from './navigation'
import { splitBodyParagraphs } from './research-content'

export type CourseListOut = components['schemas']['CourseListOut']
export type CourseDetailOut = components['schemas']['CourseDetailOut']
export type TalkListOut = components['schemas']['TalkListOut']
export type TalkDetailOut = components['schemas']['TalkDetailOut']

export type TeachingIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; courses: CourseListOut[]; talks: TalkListOut[] }

export type TeachingDetailKind = 'course' | 'talk'

export type TeachingDetailModel =
  | { status: 'unavailable' }
  | {
      status: 'ready'
      kind: TeachingDetailKind
      record: CourseDetailOut | TalkDetailOut
    }

const teachingNavItem = primaryNav.find((item) => item.slug === 'teaching')

export function getTeachingRouteTitle(locale: Locale): string {
  return (
    teachingNavItem?.label[locale] ?? (locale === 'en' ? 'Teaching' : 'تدریس')
  )
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

async function fetchAllPagedItems<T extends { published_at?: string | null }>(
  pathPrefix: string,
): Promise<T[]> {
  const pageSize = 100
  let page = 1
  const collected: T[] = []

  while (true) {
    const query = `?page=${page}&page_size=${pageSize}`
    const payload = await fetchJson<{ count: number; items: T[] }>(
      `${pathPrefix}${query}`,
    )
    collected.push(...filterPublishedOnly(payload.items ?? []))
    if (
      collected.length >= (payload.count ?? 0) ||
      (payload.items?.length ?? 0) < pageSize
    ) {
      break
    }
    page += 1
  }

  return collected
}

export function getTeachingUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getTeachingRouteTitle('en'),
        message: 'Published teaching content is not available yet.',
      }
    : {
        title: getTeachingRouteTitle('fa'),
        message: 'محتوای منتشرشدهٔ تدریس هنوز در دسترس نیست.',
      }
}

export function formatCourseCardMeta(course: CourseListOut): string {
  return [
    course.level,
    course.course_format,
    course.course_language,
    course.availability,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function formatTalkCardMeta(talk: TalkListOut): string {
  return [talk.event_name, talk.event_date, talk.location, talk.access_state]
    .filter(Boolean)
    .join(' · ')
}

export async function listCourses(locale: Locale): Promise<CourseListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<CourseListOut>(`/api/courses/${locale}`)
  } catch {
    return []
  }
}

export async function listTalks(locale: Locale): Promise<TalkListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<TalkListOut>(`/api/talks/${locale}`)
  } catch {
    return []
  }
}

export async function fetchTeachingIndex(
  locale: Locale,
): Promise<TeachingIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const [courses, talks] = await Promise.all([
    listCourses(locale),
    listTalks(locale),
  ])
  if (!courses.length && !talks.length) {
    return { status: 'unavailable' }
  }

  return { status: 'ready', courses, talks }
}

export async function getCourseDetail(
  locale: Locale,
  slug: string,
): Promise<CourseDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const course = await fetchJson<CourseDetailOut>(
      `/api/courses/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(course)
    if (course.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return course
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return null
    }
    return null
  }
}

export async function getTalkDetail(
  locale: Locale,
  slug: string,
): Promise<TalkDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const talk = await fetchJson<TalkDetailOut>(
      `/api/talks/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(talk)
    if (talk.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return talk
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return null
    }
    return null
  }
}

export async function fetchTeachingDetail(
  locale: Locale,
  slug: string,
): Promise<TeachingDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const course = await getCourseDetail(locale, slug)
  if (course) {
    return { status: 'ready', kind: 'course', record: course }
  }

  const talk = await getTalkDetail(locale, slug)
  if (talk) {
    return { status: 'ready', kind: 'talk', record: talk }
  }

  return { status: 'unavailable' }
}

export async function listTeachingDetailSlugs(
  locale: Locale,
): Promise<string[]> {
  const [courses, talks] = await Promise.all([
    listCourses(locale),
    listTalks(locale),
  ])
  const slugs = new Set<string>()
  for (const course of courses) slugs.add(course.slug)
  for (const talk of talks) slugs.add(talk.slug)
  return [...slugs]
}

export async function resolveTeachingAlternateAvailability(
  locale: Locale,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const model = await fetchTeachingIndex(alternate)
  return model.status === 'ready'
}

export { splitBodyParagraphs }
