import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import ResearchTopicDetailContent from './ResearchTopicDetailContent.astro'
import ResearchPageContent from './ResearchPageContent.astro'

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

describe('PU-14 Research Product Family', () => {
  it('renders CMS story document when story is present on research topic', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'en',
          slug: 'ai-interpretability',
          title: 'AI Interpretability',
          summary:
            'Understanding representations in frontier foundation models.',
          motivation: 'Legacy motivation fallback.',
          problems: '',
          research_questions: '',
          methods: '',
          future_directions: '',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          story: {
            locale: 'en',
            title: 'AI Interpretability',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Methodological Approach',
                      level: 2,
                      id: 'methodological-approach',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Probing neural network latent spaces using sparse autoencoders.</p>',
                    },
                  },
                  {
                    blockType: 'code',
                    settings: {
                      code: 'def inspect_activations(): pass',
                      language: 'python',
                      caption: 'Activation extractor',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('AI Interpretability')
    expect(html).toMatch(/class="[^"]*story-document[^"]*"/)
    expect(html).toContain('Methodological Approach')
    expect(html).toContain('Probing neural network latent spaces')
    expect(html).toContain('inspect_activations')
  })

  it('renders relatedRecords when present in research topic detail', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'en',
          slug: 'neural-dynamics',
          title: 'Neural Dynamics',
          summary: 'Dynamical systems perspective on transformer models.',
          motivation: 'Motivation text',
          problems: 'Problems text',
          research_questions: 'Questions text',
          methods: 'Methods text',
          future_directions: 'Directions text',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          relatedRecords: [
            {
              family: 'project',
              id: '42',
              locale: 'en',
              slug: 'neural-viz-engine',
              title: 'Neural Visualization Engine',
              summary: 'Interactive tool for latent inspection.',
              routeFamily: 'projects',
            },
          ],
        },
      },
    })

    expect(html).toContain('Related records')
    expect(html).toContain('Neural Visualization Engine')
    expect(html).toMatch(/href="\/en\/projects\/neural-viz-engine\/"/)
  })

  it('renders Persian research topic detail with RTL and Persian copy', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'fa',
          slug: 'interpretable-ai-fa',
          title: 'هوش مصنوعی تفسیرپذیر',
          summary: 'بررسی فضاهای پنهان در مدل‌های زبانی بزرگ.',
          motivation: 'انگیزه پژوهش در راستای اعتمادپذیری.',
          problems: 'پیچیدگی لایه‌های عمیق.',
          research_questions: 'چگونه بازنمایی‌ها شکل می‌گیرند؟',
          methods: 'روش‌های تحلیلی و آماری.',
          future_directions: 'توسعه ابزارهای نظارت بر مدل.',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
        },
      },
    })

    expect(html).toContain('هوش مصنوعی تفسیرپذیر')
    expect(html).toContain('انگیزه پژوهش در راستای اعتمادپذیری')
    expect(html).toContain('بازگشت به پژوهش')
  })

  it('renders real publication list in index when publications are available', async () => {
    const html = await render(ResearchPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        topics: [
          {
            locale: 'en',
            slug: 'representation-learning',
            title: 'Representation Learning',
            summary: 'Geometry of latent manifolds.',
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
        statement: null,
        projects: [],
        publications: [
          {
            locale: 'en',
            slug: 'sparse-autoencoders-latent-spaces',
            title: 'Sparse Autoencoders in Deep Latent Spaces',
            summary: 'A study on disentangling polysemantic neurons.',
            venue: 'ICLR 2026',
            published_at: '2026-05-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })

    expect(html).toContain('Representation Learning')
    expect(html).toMatch(/data-visual-id="PageFamilyBibliographyList"/)
    expect(html).toContain('Sparse Autoencoders in Deep Latent Spaces')
    expect(html).toMatch(
      /href="\/en\/publications\/sparse-autoencoders-latent-spaces\/"/,
    )
  })
})
