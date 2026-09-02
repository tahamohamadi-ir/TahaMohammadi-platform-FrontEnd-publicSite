import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import CreativePageContent from './CreativePageContent.astro'
import CreativeDetailContent from './CreativeDetailContent.astro'

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

describe('PUBLIC-221 creative pages', () => {
  it('renders structural empty-state chrome on the creative index', async () => {
    const html = await render(CreativePageContent, {
      locale: 'en',
      model: { status: 'empty' },
    })
    expect(html).toMatch(/data-visual-id="CollectionIndexTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/data-visual-id="PageFamilyFeaturedShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyMediaGridPlaceholder"/)
    expect(html).toContain('Creative')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/creative-page__filters/)
    expect(html).toMatch(/pf-index-empty__filters--collection/)
    expect(html).toMatch(/pf-index-empty__filter-chip--dropdown/)
    expect(html).toContain('Selected visual work')
    expect(html).toContain('View work')
    expect(html).toContain('Published creative works are not available yet.')
    expect(html).toContain('All work')
    expect(html).toContain('Medium')
  })

  it('renders creative work cards when the index model is ready', async () => {
    const html = await render(CreativePageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        works: [
          {
            locale: 'en',
            slug: 'ivory-forms',
            title: 'Ivory Forms',
            description: 'A photographic series.',
            work_type: 'Photography',
            creator_name: 'Taha Mohammadi',
            creator_role: 'Artist',
            creation_date: '2025',
            access_state: 'Public',
            license: 'CC BY',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })
    expect(html).toContain('Ivory Forms')
    expect(html).toMatch(/href="\/en\/creative\/ivory-forms\/"/)
  })

  it('renders creative detail gallery when ready', async () => {
    const html = await render(CreativeDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        work: {
          locale: 'en',
          slug: 'ivory-forms',
          title: 'Ivory Forms',
          description: 'A photographic series.',
          body: '<p>Creative body.</p>',
          work_type: 'Photography',
          creator_name: 'Taha Mohammadi',
          creator_role: 'Artist',
          creation_date: '2025',
          access_state: 'Public',
          rights_statement: 'All rights reserved.',
          license: 'CC BY',
          gallery: [
            {
              url: 'https://example.com/image.jpg',
              alt: 'Ivory form detail',
              caption: 'Detail shot',
              mime: 'image/jpeg',
              size: 1024,
              title: 'Detail',
            },
          ],
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          accessibility_notes: '',
        },
      },
    })
    expect(html).toContain('Ivory Forms')
    expect(html).toContain('Creative body.')
    expect(html).toMatch(/src="https:\/\/example.com\/image.jpg"/)
  })
})
