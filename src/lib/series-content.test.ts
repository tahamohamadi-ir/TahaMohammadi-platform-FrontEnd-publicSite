import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CollectionPage from '../components/series/CollectionPage.astro'
import DetailPage from '../components/series/DetailPage.astro'
import {
  getSeriesRouteTitle,
  getSeriesUnavailableCopy,
} from './series-content'

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

describe('PU-16 Series Product Family (F12)', () => {
  it('renders series route title and copy correctly for both locales', () => {
    expect(getSeriesRouteTitle('en')).toBe('Article Series')
    expect(getSeriesRouteTitle('fa')).toBe('مجموعه مقالات')

    const enUnavailable = getSeriesUnavailableCopy('en')
    expect(enUnavailable.title).toBe('Series Unavailable')

    const faUnavailable = getSeriesUnavailableCopy('fa')
    expect(faUnavailable.title).toBe('مجموعه مقالات در دسترس نیست')
  })

  it('renders series list page with items and canonical links', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'ready',
        series: [
          {
            locale: 'en',
            slug: 'nlp-to-sql-systems',
            title: 'Designing Reliable NLP-to-SQL Systems',
            description: 'A multi-part guide on edge architectures for natural language database interfaces.',
          },
        ],
      },
    })

    expect(html).toContain('Designing Reliable NLP-to-SQL Systems')
    expect(html).toContain('A multi-part guide on edge architectures')
    expect(html).toContain('/en/blog/series/nlp-to-sql-systems')
  })

  it('renders series list unavailable state honestly without fake cards', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'unavailable',
      },
    })

    expect(html).toContain('Series Unavailable')
    expect(html).not.toContain('/en/blog/series/nlp-to-sql-systems')
  })

  it('renders series detail page with story and ordered articles', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        series: {
          locale: 'en',
          slug: 'nlp-to-sql-systems',
          title: 'Designing Reliable NLP-to-SQL Systems',
          description: 'A multi-part guide on edge architectures.',
          story: {
            version: '2.0',
            sections: [
              {
                id: 'sec-1',
                title: 'Overview',
                level: 2,
                blocks: [
                  {
                    id: 'b-1',
                    blockType: 'text',
                    settings: {
                      text: 'This series covers design patterns for edge NLP.',
                    },
                  },
                ],
              },
            ],
          },
          items: [
            {
              contentType: 'article',
              slug: 'evaluating-persian-text-to-sql',
              title: 'Evaluating Persian Text-to-SQL Pipelines',
              summary: 'Benchmarking parsing accuracy and inference latency.',
            },
            {
              contentType: 'article',
              slug: 'schema-linking-under-resource-constraints',
              title: 'Schema Linking Under Resource Constraints',
              summary: 'Pruning large database schemas on constrained hardware.',
            },
          ],
        },
      },
    })

    expect(html).toContain('Designing Reliable NLP-to-SQL Systems')
    expect(html).toContain('This series covers design patterns for edge NLP.')
    expect(html).toContain('Part 1')
    expect(html).toContain('Evaluating Persian Text-to-SQL Pipelines')
    expect(html).toContain('/en/blog/evaluating-persian-text-to-sql')
    expect(html).toContain('Part 2')
    expect(html).toContain('Schema Linking Under Resource Constraints')
    expect(html).toContain('/en/blog/schema-linking-under-resource-constraints')
  })

  it('renders series detail unavailable state cleanly', async () => {
    const html = await render(DetailPage, {
      locale: 'fa',
      model: {
        status: 'unavailable',
      },
    })

    expect(html).toContain('مجموعه مقالات در دسترس نیست')
  })
})
