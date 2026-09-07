import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import WritingDetailContent from './WritingDetailContent.astro'
import WritingPageContent from './WritingPageContent.astro'

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

describe('PU-15 Articles Product Family', () => {
  it('renders CMS story document when story is present on article', async () => {
    const html = await render(WritingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        article: {
          locale: 'en',
          slug: 'engineering-reliable-distributed-systems',
          title: 'Engineering Reliable Distributed Systems',
          excerpt:
            'Patterns and trade-offs in distributed consensus and replication.',
          reading_time_minutes: 8,
          license: 'CC-BY-4.0',
          published_at: '2026-02-01T00:00:00Z',
          updated_at: null,
          topic_tags: [{ slug: 'systems', name: 'Distributed Systems' }],
          series: [],
          featured_image: null,
          story: {
            locale: 'en',
            title: 'Engineering Reliable Distributed Systems Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Consensus Guarantees',
                      level: 2,
                      id: 'consensus-guarantees',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Linearizability vs sequential consistency in Paxos clusters.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Consensus Guarantees')
    expect(html).toContain('Linearizability vs sequential consistency')
    expect(html).toContain('Engineering Reliable Distributed Systems')
    expect(html).toContain('Distributed Systems')
  })

  it('renders fallback body HTML when story is absent', async () => {
    const html = await render(WritingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        article: {
          locale: 'en',
          slug: 'memory-models-in-practice',
          title: 'Memory Models in Practice',
          excerpt: 'Sequential consistency and acquire-release semantics.',
          reading_time_minutes: 5,
          license: 'CC-BY-4.0',
          published_at: '2026-01-15T00:00:00Z',
          updated_at: null,
          topic_tags: [],
          series: [],
          featured_image: null,
          body: '<p>Modern CPU architectures require explicit memory ordering fences.</p>',
        },
      },
    })

    expect(html).toContain('Memory Models in Practice')
    expect(html).toContain(
      'Modern CPU architectures require explicit memory ordering fences.',
    )
  })

  it('renders writing page ready view with article list', async () => {
    const html = await render(WritingPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        articles: [
          {
            locale: 'en',
            slug: 'engineering-reliable-distributed-systems',
            title: 'Engineering Reliable Distributed Systems',
            excerpt:
              'Patterns and trade-offs in distributed consensus and replication.',
            reading_time_minutes: 8,
            published_at: '2026-02-01T00:00:00Z',
            topic_tags: [],
          },
        ],
        books: [],
      },
    })

    expect(html).toContain('Engineering Reliable Distributed Systems')
    expect(html).toContain(
      '/en/writing/engineering-reliable-distributed-systems',
    )
  })

  it('renders Persian article detail with proper RTL labels', async () => {
    const html = await render(WritingDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        article: {
          locale: 'fa',
          slug: 'modern-systems-architecture',
          title: 'معماری سامانه‌های مدرن',
          excerpt: 'بررسی الگوهای تاب‌آوری در معماری نرم‌افزار.',
          reading_time_minutes: 6,
          license: 'CC-BY-4.0',
          published_at: '2026-01-10T00:00:00Z',
          updated_at: null,
          topic_tags: [{ slug: 'architecture', name: 'معماری' }],
          series: [],
          featured_image: null,
          body: '<p>تاب‌آوری و مقیاس‌پذیری در سامانه‌های توزیع‌شده.</p>',
        },
      },
    })

    expect(html).toContain('معماری سامانه‌های مدرن')
    expect(html).toContain('زمان مطالعه')
    expect(html).toContain('← بازگشت به وبلاگ')
  })
})
