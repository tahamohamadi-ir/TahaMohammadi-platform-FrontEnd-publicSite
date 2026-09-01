import { describe, expect, it } from 'vitest'

import {
  formatCourseCardMeta,
  formatTalkCardMeta,
  getTeachingRouteTitle,
  getTeachingUnavailableCopy,
} from './teaching-content'

describe('teaching content helpers', () => {
  it('returns localized route titles and unavailable copy', () => {
    expect(getTeachingRouteTitle('en')).toBe('Teaching')
    expect(getTeachingRouteTitle('fa')).toBe('تدریس')
    expect(getTeachingUnavailableCopy('en').message).toContain(
      'not available yet',
    )
    expect(getTeachingUnavailableCopy('fa').title).toBe('تدریس')
  })

  it('formats course and talk card metadata from API fields only', () => {
    expect(
      formatCourseCardMeta({
        locale: 'en',
        slug: 'intro-ai',
        title: 'Intro to AI',
        description: '',
        level: 'Graduate',
        course_format: 'Online',
        course_language: 'English',
        availability: 'Open',
        license: '',
        last_updated: null,
        published_at: '2026-01-01T00:00:00Z',
        updated_at: null,
      }),
    ).toBe('Graduate · Online · English · Open')

    expect(
      formatTalkCardMeta({
        locale: 'en',
        slug: 'keynote-2026',
        title: 'Keynote',
        event_name: 'AI Summit',
        event_date: '2026-03-01',
        location: 'Tehran',
        speakers: 'Taha Mohammadi',
        access_state: 'Public',
        license: '',
        published_at: '2026-01-01T00:00:00Z',
        updated_at: null,
      }),
    ).toBe('AI Summit · 2026-03-01 · Tehran · Public')
  })
})
