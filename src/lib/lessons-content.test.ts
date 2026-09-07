import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '../generated/public-api'
import {
  fetchLessonDetail,
  getLessonDetail,
  listCourseLessonParams,
  resolveLessonAlternateAvailability,
} from './lessons-content'

const lesson: components['schemas']['LessonDetailOut'] = {
  locale: 'en',
  courseSlug: 'course',
  slug: 'lesson',
  title: 'Published lesson',
  summary: 'From the public endpoint',
  position: 0,
  resources: [],
  alternates: [
    {
      locale: 'fa',
      slug: 'translated-lesson',
      courseSlug: 'translated-course',
      routeFamily: 'education',
    },
  ],
}
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test'))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Lesson public schema consumer', () => {
  it('accepts real LessonDetailOut without a published_at field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(lesson)))
    expect(await fetchLessonDetail('en', 'course', 'lesson')).toEqual({
      status: 'ready',
      lesson,
    })
  })
  it('rejects wrong-locale and unavailable responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ ...lesson, locale: 'fa' })),
    )
    expect(await getLessonDetail('en', 'course', 'lesson')).toBeNull()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    expect(await getLessonDetail('en', 'course', 'lesson')).toBeNull()
  })
  it('follows every page of courses when collecting lesson routes', async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname === '/api/courses/en') {
        const second = url.searchParams.get('page') === '2'
        return json({
          count: 101,
          items: Array.from({ length: second ? 1 : 100 }, (_, i) => ({
            slug: `course-${second ? 100 : i}`,
            locale: 'en',
          })),
        })
      }
      const courseSlug = url.searchParams.get('course')!
      return json({ count: 1, items: [{ ...lesson, courseSlug }] })
    })
    vi.stubGlobal('fetch', fetcher)
    const params = await listCourseLessonParams('en')
    expect(params).toHaveLength(101)
    expect(params.at(-1)).toEqual({
      courseSlug: 'course-100',
      lessonSlug: 'lesson',
    })
  })
  it('uses explicit translation identity when lesson and course slugs differ', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) =>
        input.endsWith('/en/course/lesson')
          ? json(lesson)
          : new Response(null, { status: 404 }),
      ),
    )
    expect(
      await resolveLessonAlternateAvailability('en', 'course', 'lesson'),
    ).toBe(true)
  })
})
