import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import ResearchStatementDetailContent from './ResearchStatementDetailContent.astro'

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

describe('PU-14 Statements Product Family', () => {
  it('renders CMS story document when story is present on statement', async () => {
    const html = await render(ResearchStatementDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        statement: {
          locale: 'en',
          slug: 'research-vision-2026',
          title: 'Research Vision 2026',
          body: 'Fallback text that should not appear when story is rendered.',
          published_at: '2026-01-10T00:00:00Z',
          updated_at: null,
          statement_pdf: {
            url: 'https://cdn.example.com/vision-2026.pdf',
            alt: 'Research Vision PDF',
          },
          relatedRecords: [
            {
              slug: 'distributed-consensus-core',
              title: 'Distributed Consensus Core',
              summary: 'High-throughput transactional engine.',
            },
          ],
          story: {
            locale: 'en',
            title: 'Research Vision Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Core Principles of Computational Trust',
                      level: 2,
                      id: 'computational-trust',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Decentralized systems require mathematically verifiable state transitions.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Core Principles of Computational Trust')
    expect(html).toContain('Decentralized systems require mathematically verifiable')
    expect(html).toContain('Research Vision 2026')
    expect(html).toContain('Download Statement PDF')
    expect(html).toContain('Distributed Consensus Core')
  })

  it('renders fallback body paragraphs when story is absent', async () => {
    const html = await render(ResearchStatementDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        statement: {
          locale: 'en',
          slug: 'algorithmic-integrity',
          title: 'Algorithmic Integrity and Verification',
          body: 'Verifiable computing foundations.\n\nFormal methods applied to real-world distributed architectures.',
          published_at: '2026-02-01T00:00:00Z',
          updated_at: null,
          statement_pdf: null,
          relatedRecords: [],
        },
      },
    })

    expect(html).toContain('Algorithmic Integrity and Verification')
    expect(html).toContain('Verifiable computing foundations.')
    expect(html).toContain('Formal methods applied to real-world distributed architectures.')
  })

  it('renders Persian research statement with proper RTL labels', async () => {
    const html = await render(ResearchStatementDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        statement: {
          locale: 'fa',
          slug: 'research-vision-fa',
          title: 'چشم‌انداز پژوهشی',
          body: 'توسعه سامانه‌های توزیع‌شده با قابلیت اطمینان بالا.',
          published_at: '2026-01-10T00:00:00Z',
          updated_at: null,
          statement_pdf: {
            url: 'https://cdn.example.com/vision-fa.pdf',
            alt: 'پی‌دی‌اف چشم‌انداز پژوهشی',
          },
          relatedRecords: [],
        },
      },
    })

    expect(html).toContain('چشم‌انداز پژوهشی')
    expect(html).toContain('دانلود نسخه پی‌دی‌اف بیانیه')
    expect(html).toContain('توسعه سامانه‌های توزیع‌شده')
    expect(html).toContain('← بازگشت به پژوهش')
  })
})
