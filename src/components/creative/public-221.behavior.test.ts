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
  it('renders one honest empty state on the creative index, not fabricated chrome', async () => {
    // Empty-state policy: see the equivalent test in
    // src/components/projects/public-210.behavior.test.ts.
    const html = await render(CreativePageContent, {
      locale: 'en',
      model: { status: 'empty' },
    })
    expect(html).toMatch(/data-visual-id="ContentState"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toContain('Gallery')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toContain('Published creative works are not available yet.')
    expect(html).toMatch(/href="\/en\/home\/"/)
    expect(html).not.toMatch(/data-visual-id="CollectionIndexTemplate"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyFeaturedShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyMediaGridPlaceholder"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyPaginationShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyCollaborateBandShell"/)
    expect(html).not.toMatch(/disabled/)
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

  it('renders the same honest unavailable state for the empty-shell design-QA fixture slug, not fabricated chrome', async () => {
    // "empty-shell" (src/pages/{en,fa}/gallery/empty-shell/) was a reserved
    // slug that rendered a fully fabricated preview page. It now reuses the
    // real unavailable-detail ContentState — see CreativeDetailContent.astro.
    const html = await render(CreativeDetailContent, {
      locale: 'en',
      model: { status: 'empty-shell' },
    })
    expect(html).toMatch(/data-visual-id="ContentState"/)
    expect(html).toMatch(/data-state-variant="unavailable"/)
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyCreativeDetailShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyCollaborateBandShell"/)
    expect(html).not.toContain('Awaiting approved CMS copy')
    expect(html).not.toMatch(/disabled/)
  })
})
