import { describe, expect, it } from 'vitest'

import {
  formatArticleCardMeta,
  formatBookCardMeta,
  formatReadingTime,
  getWritingRouteTitle,
  getWritingUnavailableCopy,
  resolveWritingAlternateAvailability,
} from './writing-content'

describe('writing content helpers', () => {
  it('returns localized route titles and unavailable copy', async () => {
    expect(getWritingRouteTitle('en')).toBe('Blog')
    expect(getWritingRouteTitle('fa')).toBe('وبلاگ')
    expect(getWritingUnavailableCopy('en').message).toContain(
      'not available yet',
    )
    expect(getWritingUnavailableCopy('fa').title).toBe('وبلاگ')
    await expect(resolveWritingAlternateAvailability('fa')).resolves.toBe(true)
  })

  it('formats reading time and card metadata from API fields only', () => {
    expect(formatReadingTime('en', 8)).toBe('8 min read')
    expect(formatReadingTime('fa', 8)).toBe('8 دقیقه مطالعه')
    expect(formatReadingTime('en', 0)).toBe('')

    expect(
      formatArticleCardMeta('en', {
        locale: 'en',
        slug: 'example',
        title: 'Example',
        excerpt: '',
        reading_time_minutes: 5,
        license: '',
        published_at: '2026-01-01T00:00:00Z',
        updated_at: null,
        series: [
          {
            locale: 'en',
            slug: 'series',
            title: 'Series One',
            description: '',
            ordering: 1,
            published_at: null,
          },
        ],
      }),
    ).toBe('5 min read · Series One')

    expect(
      formatBookCardMeta({
        locale: 'en',
        slug: 'book',
        title: 'Book',
        authors: 'Author',
        publisher: 'Press',
        publication_date: '2025',
        access_state: 'Available',
        isbn: '',
        license: '',
        published_at: '2026-01-01T00:00:00Z',
        updated_at: null,
      }),
    ).toBe('Author · Press · 2025 · Available')
  })
})
