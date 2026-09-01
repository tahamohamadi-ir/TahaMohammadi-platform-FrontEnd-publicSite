import { describe, expect, it } from 'vitest'

import { fetchCvPageModel, getCvUnavailableCopy } from './cv-content'
import { hasPublishedDownloads } from './site-settings-content'
import { listBooks } from './writing-content'
import { listTalks, getTeachingUnavailableCopy } from './teaching-content'
import { getWritingUnavailableCopy } from './writing-content'

/**
 * PUBLIC-212 — books, talks, and downloads ship inside parent route families
 * per ROUTE-REGISTRY.md (no standalone /books/, /talks/, or /downloads/ routes).
 */
describe('PUBLIC-212 books/talks/downloads via parent families', () => {
  it('loads books through writing-content with honest unavailable copy', async () => {
    const books = await listBooks('en')
    expect(Array.isArray(books)).toBe(true)
    expect(getWritingUnavailableCopy('en').message).toContain(
      'not available yet',
    )
    expect(getWritingUnavailableCopy('fa').title).toBe('نوشتار')
  })

  it('loads talks through teaching-content with honest unavailable copy', async () => {
    const talks = await listTalks('en')
    expect(Array.isArray(talks)).toBe(true)
    expect(getTeachingUnavailableCopy('en').message).toContain(
      'not available yet',
    )
    expect(getTeachingUnavailableCopy('fa').title).toBe('تدریس')
  })

  it('projects CV downloads through site settings with honest unavailable copy', async () => {
    expect(hasPublishedDownloads([])).toBe(false)
    expect(hasPublishedDownloads(undefined)).toBe(false)
    const model = await fetchCvPageModel()
    expect(model.status).toBe('unavailable')
    expect(getCvUnavailableCopy('en').message).toContain('not yet available')
    expect(getCvUnavailableCopy('fa').title).toBeTruthy()
  })
})
