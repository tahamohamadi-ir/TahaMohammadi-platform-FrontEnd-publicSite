import { describe, it, expect } from 'vitest'
import {
  extractTableOfContents,
  firstStoryMedia,
  hasStoryContent,
  formatFileSize,
  normalizeStoryMedia,
  parseHeadingLevel,
  type StoryDocument,
} from './story-content'

describe('Story Content Utilities', () => {
  it('parses heading levels correctly from strings and numbers', () => {
    expect(parseHeadingLevel('h2')).toBe(2)
    expect(parseHeadingLevel('h3')).toBe(3)
    expect(parseHeadingLevel('h4')).toBe(4)
    expect(parseHeadingLevel('H2')).toBe(2)
    expect(parseHeadingLevel('2')).toBe(2)
    expect(parseHeadingLevel(3)).toBe(3)
    expect(parseHeadingLevel(null)).toBe(2)
    expect(parseHeadingLevel(undefined)).toBe(2)
    expect(parseHeadingLevel('invalid')).toBe(2)
  })

  it('identifies whether a story document has printable/renderable content', () => {
    expect(hasStoryContent(null)).toBe(false)
    expect(hasStoryContent(undefined)).toBe(false)
    expect(
      hasStoryContent({ locale: 'en', title: 'Empty', sections: [] }),
    ).toBe(false)
    expect(
      hasStoryContent({
        locale: 'en',
        title: 'Has Section but empty blocks',
        sections: [{ layout: '1col', blocks: [] }],
      }),
    ).toBe(false)
    expect(
      hasStoryContent({
        locale: 'en',
        title: 'Valid Story',
        sections: [
          {
            layout: '1col',
            blocks: [{ blockType: 'text', settings: { body: 'Hello world' } }],
          },
        ],
      }),
    ).toBe(true)
  })

  it('extracts structured Table of Contents from heading blocks', () => {
    const doc: StoryDocument = {
      locale: 'en',
      title: 'Research Methodology',
      sections: [
        {
          layout: '1col',
          blocks: [
            {
              blockType: 'heading',
              settings: { text: 'Introduction', level: 2, id: 'introduction' },
            },
            {
              blockType: 'text',
              settings: { body: 'Text content...' },
            },
            {
              blockType: 'heading',
              settings: {
                text: 'Core Architecture',
                level: 2,
                id: 'core-architecture',
              },
            },
            {
              blockType: 'heading',
              settings: {
                text: 'Data Pipeline',
                level: 3,
                id: 'data-pipeline',
              },
            },
            {
              blockType: 'code',
              settings: { code: 'const a = 1;', language: 'typescript' },
            },
            {
              blockType: 'heading',
              settings: { text: 'Conclusion', level: 2, id: 'conclusion' },
            },
          ],
        },
      ],
    }

    const toc = extractTableOfContents(doc)
    expect(toc).toHaveLength(4)
    expect(toc[0]).toEqual({
      id: 'introduction',
      text: 'Introduction',
      level: 2,
    })
    expect(toc[1]).toEqual({
      id: 'core-architecture',
      text: 'Core Architecture',
      level: 2,
    })
    expect(toc[2]).toEqual({
      id: 'data-pipeline',
      text: 'Data Pipeline',
      level: 3,
    })
    expect(toc[3]).toEqual({ id: 'conclusion', text: 'Conclusion', level: 2 })
  })

  it('formats file sizes in human readable form', () => {
    expect(formatFileSize(undefined)).toBe('')
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(-10)).toBe('')
    expect(formatFileSize(0)).toBe('')
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(1048576 * 3.5)).toBe('3.5 MB')
  })

  it('handles heading blocks with missing ID or whitespace-only text', () => {
    const doc: StoryDocument = {
      locale: 'fa',
      title: 'مستندات',
      sections: [
        {
          blocks: [
            {
              blockType: 'heading',
              settings: { text: '   ', level: 2 },
            },
            {
              blockType: 'heading',
              settings: { text: 'مقدمه بدون شناسه' },
            },
          ],
        },
      ],
    }

    const toc = extractTableOfContents(doc)
    expect(toc).toHaveLength(1)
    expect(toc[0]).toEqual({
      id: 'heading-1',
      text: 'مقدمه بدون شناسه',
      level: 2,
    })
  })

  it('normalizes projected story media from object and array shapes (PU-13/CM-05)', () => {
    const single = { url: '/media/a.jpg', alt: 'A' }
    const multi = [
      { url: '/media/a.jpg', alt: 'A' },
      { url: '/media/b.jpg', alt: 'B' },
    ]
    // mediaId projection (single object) must not disappear.
    expect(normalizeStoryMedia(single)).toHaveLength(1)
    expect(firstStoryMedia(single)?.url).toBe('/media/a.jpg')
    // mediaIds projection (array) must preserve every item.
    expect(normalizeStoryMedia(multi)).toHaveLength(2)
    expect(firstStoryMedia(multi)?.url).toBe('/media/a.jpg')
    // Absent/invalid media stays empty without throwing.
    expect(normalizeStoryMedia(undefined)).toEqual([])
    expect(normalizeStoryMedia(null)).toEqual([])
    expect(firstStoryMedia(null)).toBeNull()
  })
})
