import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import WritingPageContent from './WritingPageContent.astro'
import WritingDetailContent from './WritingDetailContent.astro'

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

describe('PUBLIC-211/212 writing pages', () => {
  it('renders structural empty-state chrome on the writing index', async () => {
    const html = await render(WritingPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="EditorialIndexTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/data-visual-id="PageFamilyFeaturedShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyContentRowPlaceholder"/)
    expect(html).toMatch(/data-visual-id="PageFamilyThemeExploreShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyPaginationShell"/)
    expect(html).toMatch(/pf-index-featured--writing/)
    expect(html).toMatch(/pf-index-featured--copy-first/)
    expect(html).toMatch(/pf-index-theme-explore__cards/)
  })

  it('renders article and book sections when the index model is ready', async () => {
    const html = await render(WritingPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        books: [
          {
            locale: 'en',
            slug: 'dashboard-book',
            title: 'Dashboard Book',
            authors: 'Taha Mohammadi',
            publisher: 'Example Press',
            publication_date: '2025',
            access_state: 'Available',
            isbn: '978-0-000000-0-0',
            license: 'All rights reserved',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
        articles: [
          {
            locale: 'en',
            slug: 'visual-discourse',
            title: 'Visual Discourse',
            excerpt: 'Essay excerpt.',
            reading_time_minutes: 8,
            license: 'CC-BY',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })
    expect(html).toContain('Dashboard Book')
    expect(html).toContain('Visual Discourse')
    expect(html).toMatch(/href="\/en\/writing\/visual-discourse\/"/)
    expect(html).toContain('Books')
    expect(html).toContain('Articles')
  })

  it('renders article detail body when ready', async () => {
    const html = await render(WritingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        article: {
          locale: 'en',
          slug: 'visual-discourse',
          title: 'Visual Discourse',
          excerpt: 'Lead excerpt.',
          body: '<p>Sanitized body paragraph.</p>',
          reading_time_minutes: 8,
          license: 'CC-BY',
          accessibility_notes: '',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          topic_tags: [
            {
              locale: 'en',
              slug: 'visual-analytics',
              name: 'Visual analytics',
              description: '',
            },
          ],
        },
      },
    })
    expect(html).toContain('Visual Discourse')
    expect(html).toContain('Sanitized body paragraph.')
    expect(html).toContain('Visual analytics')
    expect(html).toContain('8 min read')
  })
})
