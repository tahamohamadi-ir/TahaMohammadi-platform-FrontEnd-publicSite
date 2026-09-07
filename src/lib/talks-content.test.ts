import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CollectionPage from '../components/talks/CollectionPage.astro'
import DetailPage from '../components/talks/DetailPage.astro'

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

describe('PU-16 Talks Product Family', () => {
  it('renders talks collection page with talks list', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'ready',
        talks: [
          {
            locale: 'en',
            slug: 'scaling-verifiable-computation',
            title: 'Scaling Verifiable Computation in Modern Clusters',
            speakers: 'Taha Mohammadi',
            event_name: 'Distributed Systems Summit 2026',
            event_date: '2026-03-12',
            location: 'Zurich, Switzerland',
            license: 'CC-BY-4.0',
            access_state: 'Public',
            published_at: '2026-03-12T00:00:00Z',
          },
        ],
      },
    })

    expect(html).toContain('Scaling Verifiable Computation in Modern Clusters')
    expect(html).toContain('Distributed Systems Summit 2026')
    expect(html).toContain('/en/talks/scaling-verifiable-computation')
  })

  it('renders CMS story document when story is present on talk', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        talk: {
          locale: 'en',
          slug: 'scaling-verifiable-computation',
          title: 'Scaling Verifiable Computation in Modern Clusters',
          speakers: 'Taha Mohammadi',
          event_name: 'Distributed Systems Summit 2026',
          event_date: '2026-03-12',
          location: 'Zurich, Switzerland',
          license: 'CC-BY-4.0',
          access_state: 'Public',
          abstract: 'Fallback talk abstract.',
          video_url: 'https://youtube.com/watch?v=sample',
          slides_url: 'https://cdn.example.com/slides.pdf',
          published_at: '2026-03-12T00:00:00Z',
          story: {
            locale: 'en',
            title: 'Keynote Breakdown Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Zero-Knowledge State Proofs',
                      level: 2,
                      id: 'zk-proofs',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Constructing recursive SNARK verifiers across sharded consensus participants.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Zero-Knowledge State Proofs')
    expect(html).toContain('Constructing recursive SNARK verifiers')
    expect(html).toContain('Watch Video')
    expect(html).toContain('Download Slides')
    expect(html).toContain('Zurich, Switzerland')
  })

  it('renders fallback abstract when story is absent', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        talk: {
          locale: 'en',
          slug: 'intro-to-actors',
          title: 'Introduction to the Actor Model',
          speakers: 'Taha Mohammadi',
          event_name: 'Concurrency Workshop',
          event_date: '2025-11-10',
          location: 'Online',
          license: 'MIT',
          access_state: 'Open',
          abstract: 'Mailboxes, actor hierarchies, and failure supervision trees.',
          video_url: null,
          slides_url: null,
          story: null,
        },
      },
    })

    expect(html).toContain('Introduction to the Actor Model')
    expect(html).toContain('Mailboxes, actor hierarchies, and failure supervision trees.')
  })

  it('renders Persian talk detail with proper RTL labels', async () => {
    const html = await render(DetailPage, {
      locale: 'fa',
      model: {
        status: 'ready',
        talk: {
          locale: 'fa',
          slug: 'distributed-systems-fa',
          title: 'همایش سامانه‌های توزیع‌شده',
          speakers: 'طاها محمدی',
          event_name: 'کنفرانس مهندسی کامپیوتر',
          event_date: '۱۴۰۴-۱۱-۲۰',
          location: 'تهران، ایران',
          license: 'CC-BY-4.0',
          access_state: 'عمومی',
          abstract: 'بررسی چالش‌های مقیاس‌پذیری در معماری‌های نوین.',
          video_url: 'https://aparat.com/sample',
          slides_url: null,
          story: null,
        },
      },
    })

    expect(html).toContain('همایش سامانه‌های توزیع‌شده')
    expect(html).toContain('طاها محمدی')
    expect(html).toContain('مشاهده ویدیو')
    expect(html).toContain('← بازگشت به ارائه‌ها')
  })
})
