import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import PublicationDetailContent from './PublicationDetailContent.astro'
import PublicationsPageContent from './PublicationsPageContent.astro'

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

describe('PU-14 Publications Product Family', () => {
  it('renders CMS story document when story is present on publication', async () => {
    const html = await render(PublicationDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        publication: {
          locale: 'en',
          slug: 'neural-attention-mechanisms',
          title: 'Neural Attention Mechanisms',
          authors: 'Taha Mohammadi',
          venue: 'NeurIPS 2025',
          publication_type: 'Conference paper',
          academic_stage: 'published',
          access_state: 'open',
          doi: '10.1000/182',
          abstract: 'An empirical investigation of sparse attention.',
          citation_text: 'Mohammadi, T. (2025). Neural Attention Mechanisms. NeurIPS.',
          published_at: '2025-12-01T00:00:00Z',
          updated_at: null,
          url: 'https://example.com/paper',
          pdf_url: 'https://example.com/paper.pdf',
          story: {
            locale: 'en',
            title: 'Neural Attention Mechanisms Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Experimental Results',
                      level: 2,
                      id: 'experimental-results',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Comprehensive evaluation across 12 benchmark suites.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Experimental Results')
    expect(html).toContain('Comprehensive evaluation across 12 benchmark suites.')
    expect(html).toContain('Neural Attention Mechanisms')
    expect(html).toContain('10.1000/182')
  })

  it('renders fallback abstract and citation when story is absent', async () => {
    const html = await render(PublicationDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        publication: {
          locale: 'en',
          slug: 'transformer-interpretability',
          title: 'Transformer Interpretability',
          authors: 'Taha Mohammadi',
          venue: 'ICLR 2026',
          publication_type: 'Conference paper',
          academic_stage: 'published',
          access_state: 'open',
          doi: '10.1000/183',
          abstract: 'Dissecting transformer latent circuits with attribution graphs.',
          citation_text: 'Mohammadi, T. (2026). Transformer Interpretability. ICLR.',
          published_at: '2026-05-01T00:00:00Z',
          updated_at: null,
          url: null,
          pdf_url: null,
        },
      },
    })

    expect(html).toContain('Transformer Interpretability')
    expect(html).toContain('Dissecting transformer latent circuits with attribution graphs.')
    expect(html).toContain('Mohammadi, T. (2026). Transformer Interpretability. ICLR.')
  })

  it('renders publication index ready view with publication list', async () => {
    const html = await render(PublicationsPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        publications: [
          {
            locale: 'en',
            slug: 'neural-attention-mechanisms',
            title: 'Neural Attention Mechanisms',
            authors: 'Taha Mohammadi',
            venue: 'NeurIPS 2025',
            publication_type: 'Conference paper',
            published_at: '2025-12-01T00:00:00Z',
            access_state: 'open',
          },
        ],
      },
    })

    expect(html).toContain('Neural Attention Mechanisms')
    expect(html).toContain('/en/publications/neural-attention-mechanisms')
  })

  it('renders Persian publication detail with proper RTL labels', async () => {
    const html = await render(PublicationDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        publication: {
          locale: 'fa',
          slug: 'persian-nlp-foundations',
          title: 'مبانی پردازش زبان طبیعی فارسی',
          authors: 'طاها محمدی',
          venue: 'کنفرانس هوش مصنوعی',
          publication_type: 'مقاله کنفرانس',
          academic_stage: 'منتشرشده',
          access_state: 'آزاد',
          doi: '10.1000/184',
          abstract: 'بررسی روش‌های نوین پیش‌آموزش در زبان فارسی.',
          citation_text: 'محمدی، طاها. (۱۴۰۴). مبانی پردازش زبان طبیعی فارسی.',
          published_at: '2025-11-01T00:00:00Z',
          updated_at: null,
          url: null,
          pdf_url: null,
        },
      },
    })

    expect(html).toContain('مبانی پردازش زبان طبیعی فارسی')
    expect(html).toContain('چکیده')
    expect(html).toContain('ارجاع')
    expect(html).toContain('← بازگشت به خروجی‌ها')
  })
})
