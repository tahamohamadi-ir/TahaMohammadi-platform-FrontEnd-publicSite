import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import PublicationsPageContent from './PublicationsPageContent.astro'
import PublicationDetailContent from './PublicationDetailContent.astro'

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

describe('PUBLIC-201 publications pages', () => {
  it('renders unavailable ContentState on the publications index', async () => {
    const html = await render(PublicationsPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-state-variant="unavailable"/)
    expect(html).toContain('Research Outputs')
    expect(html).toMatch(/<h1[\s>]/)
  })

  it('renders publication cards when the index model is ready', async () => {
    const html = await render(PublicationsPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        publications: [
          {
            locale: 'en',
            slug: 'example-paper',
            title: 'Example Paper',
            authors: 'Taha Mohammadi',
            venue: 'Example Venue',
            date: '2026',
            publication_type: 'Journal article',
            academic_stage: 'Published',
            access_state: 'Open',
            doi: '',
            license: '',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })
    expect(html).toContain('Example Paper')
    expect(html).toMatch(/href="\/en\/publications\/example-paper\/"/)
  })

  it('renders publication detail metadata when ready', async () => {
    const html = await render(PublicationDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        publication: {
          locale: 'en',
          slug: 'example-paper',
          title: 'Example Paper',
          authors: 'Taha Mohammadi',
          venue: 'Example Venue',
          date: '2026',
          abstract: 'Abstract paragraph.',
          publication_type: 'Journal article',
          academic_stage: 'Published',
          access_state: 'Open',
          accessibility_notes: '',
          citation_count: null,
          citation_text: 'Mohammadi, T. (2026). Example Paper.',
          code_url: '',
          dataset_url: '',
          doi: '10.0000/example',
          isbn: '',
          license: 'CC-BY',
          pdf_url: '',
          preprint_url: '',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          url: 'https://example.com/paper',
        },
      },
    })
    expect(html).toContain('Example Paper')
    expect(html).toContain('Abstract paragraph.')
    expect(html).toContain('10.0000/example')
  })
})
