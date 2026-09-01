import { describe, expect, it } from 'vitest'

import { getAboutUnavailableCopy, splitBodyParagraphs } from './about-profile'

describe('about profile helpers', () => {
  it('provides locale-specific unavailable state copy', () => {
    expect(getAboutUnavailableCopy('en').title).toBe('About')
    expect(getAboutUnavailableCopy('fa').title).toBe('درباره')
    expect(getAboutUnavailableCopy('en').message).toMatch(/not available/i)
    expect(getAboutUnavailableCopy('fa').message).toMatch(/در دسترس نیست/)
  })

  it('splits body markdown into paragraphs', () => {
    expect(splitBodyParagraphs('One.\n\nTwo.')).toEqual(['One.', 'Two.'])
    expect(splitBodyParagraphs('')).toEqual([])
  })
})
