import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import TeachingPageContent from './TeachingPageContent.astro'
import TeachingDetailContent from './TeachingDetailContent.astro'

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(
  component: Component,
  props: Record<string, unknown> = {},
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

describe('PUBLIC-220 teaching pages', () => {
  it('renders structural empty-state chrome on the teaching index', async () => {
    const html = await render(TeachingPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="EditorialIndexTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/data-visual-id="PageFamilyFeaturedPathShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyListCardShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyPathProcessShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyCollaborateBandShell"/)
    expect(html).toContain('Teaching')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/teaching-page__filters/)
    expect(html).toMatch(/teaching-page--grid/)
    expect(html).toMatch(/pf-index-empty__filter-chip--rect/)
    expect(html).toMatch(/data-visual-id="PageFamilyTeachingFilterDropdowns"/)
    expect(html).toMatch(/pf-index-path--featured/)
    expect(html).toContain('Browse paths')
  })

  it('renders course and talk cards when the index model is ready', async () => {
    const html = await render(TeachingPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        courses: [
          {
            locale: 'en',
            slug: 'intro-ai',
            title: 'Intro to AI',
            description: 'Graduate course overview.',
            level: 'Graduate',
            course_format: 'Online',
            course_language: 'English',
            availability: 'Open',
            license: 'MIT',
            last_updated: null,
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
        talks: [
          {
            locale: 'en',
            slug: 'ai-summit-keynote',
            title: 'AI Summit Keynote',
            event_name: 'AI Summit',
            event_date: '2026-03-01',
            location: 'Tehran',
            speakers: 'Taha Mohammadi',
            access_state: 'Public',
            license: '',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })
    expect(html).toContain('Intro to AI')
    expect(html).toContain('AI Summit Keynote')
    expect(html).toMatch(/href="\/en\/teaching\/intro-ai\/"/)
    expect(html).toMatch(/href="\/en\/teaching\/ai-summit-keynote\/"/)
  })

  it('renders course detail sections when ready', async () => {
    const html = await render(TeachingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'course',
        record: {
          locale: 'en',
          slug: 'intro-ai',
          title: 'Intro to AI',
          description: 'Course overview.',
          body: '<p>Course body.</p>',
          level: 'Graduate',
          course_format: 'Online',
          course_language: 'English',
          availability: 'Open',
          prerequisites: 'Linear algebra.',
          outcomes: 'Understand AI fundamentals.',
          license: 'MIT',
          last_updated: '2026-01-01',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          accessibility_notes: '',
        },
      },
    })
    expect(html).toContain('Intro to AI')
    expect(html).toContain('Linear algebra.')
    expect(html).toContain('Course body.')
  })

  it('renders talk detail links when ready', async () => {
    const html = await render(TeachingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'talk',
        record: {
          locale: 'en',
          slug: 'ai-summit-keynote',
          title: 'AI Summit Keynote',
          abstract: 'Talk abstract.',
          event_name: 'AI Summit',
          event_date: '2026-03-01',
          location: 'Tehran',
          speakers: 'Taha Mohammadi',
          access_state: 'Public',
          video_url: 'https://example.com/video',
          slides_url: 'https://example.com/slides',
          license: '',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          accessibility_notes: '',
        },
      },
    })
    expect(html).toContain('AI Summit Keynote')
    expect(html).toMatch(/href="https:\/\/example.com\/video"/)
    expect(html).toMatch(/href="https:\/\/example.com\/slides"/)
  })
})
