import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ResearchPageContent from './ResearchPageContent.astro'
import ResearchTopicDetailContent from './ResearchTopicDetailContent.astro'

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

describe('PUBLIC-201 research pages', () => {
  it('renders structural empty-state chrome on the research index', async () => {
    const html = await render(ResearchPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="CollectionIndexTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toContain('Research')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/data-visual-id="PageFamilyConstellationShell"/)
    expect(html).toMatch(/data-visual-id="PageFamilyResearchFitShell"/)
    expect(html).toMatch(/research-page__directions/)
    expect(html).toMatch(/research-page__topics/)
  })

  it('renders topic cards when the index model is ready', async () => {
    const html = await render(ResearchPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        topics: [
          {
            locale: 'en',
            slug: 'human-centered-ai',
            title: 'Human-Centered AI',
            summary: 'Focus summary.',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
        statement: null,
        projects: [],
      },
    })
    expect(html).toContain('Human-Centered AI')
    expect(html).toMatch(/href="\/en\/research\/human-centered-ai\/"/)
  })

  it('renders topic detail sections when ready', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'en',
          slug: 'human-centered-ai',
          title: 'Human-Centered AI',
          summary: 'Summary.',
          motivation: 'Motivation paragraph.',
          problems: 'Problem statement.',
          research_questions: 'Question one?',
          methods: 'Mixed methods.',
          future_directions: 'Future work.',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
        },
      },
    })
    expect(html).toContain('Human-Centered AI')
    expect(html).toMatch(/id="motivation"/)
    expect(html).toContain('Motivation paragraph.')
  })
})
