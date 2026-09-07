import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CollectionPage from '../components/collections/CollectionPage.astro'
import DetailPage from '../components/collections/DetailPage.astro'
import {
  getCollectionsRouteTitle,
  getCollectionsUnavailableCopy,
} from './collections-content'

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

describe('PU-16 Collections Product Family (F12)', () => {
  it('renders collections route title and copy correctly for both locales', () => {
    expect(getCollectionsRouteTitle('en')).toBe('Collections')
    expect(getCollectionsRouteTitle('fa')).toBe('مجموعه‌ها')

    const enUnavailable = getCollectionsUnavailableCopy('en')
    expect(enUnavailable.title).toBe('Collections Unavailable')

    const faUnavailable = getCollectionsUnavailableCopy('fa')
    expect(faUnavailable.title).toBe('مجموعه‌ها در دسترس نیست')
  })

  it('renders collections list page with items and canonical links', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'ready',
        collections: [
          {
            locale: 'en',
            slug: 'human-ai-interaction-dossier',
            title: 'Human-AI Interaction Dossier',
            description:
              'Foundational works on trustworthy human-AI interaction.',
            curatorName: 'Taha Mohammadi',
            curatorTitle: 'Principal Investigator',
            criteria:
              'Peer-reviewed articles with open-source implementations.',
            curatedDate: '2026-03-01',
          },
        ],
      },
    })

    expect(html).toContain('Human-AI Interaction Dossier')
    expect(html).toContain(
      'Foundational works on trustworthy human-AI interaction.',
    )
    expect(html).toContain('Taha Mohammadi')
    expect(html).toContain('/en/collections/human-ai-interaction-dossier')
  })

  it('renders collections list unavailable state honestly without fake cards', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'unavailable',
      },
    })

    expect(html).toContain('Collections Unavailable')
    expect(html).not.toContain('/en/collections/human-ai-interaction-dossier')
  })

  it('renders collection detail page with curator, criteria, story, and included works', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        collection: {
          locale: 'en',
          slug: 'human-ai-interaction-dossier',
          title: 'Human-AI Interaction Dossier',
          description:
            'A curated dossier of research papers and software artifacts.',
          curatorName: 'Taha Mohammadi',
          curatorTitle: 'Principal Investigator',
          criteria: 'Peer-reviewed articles with open-source implementations.',
          curatedDate: '2026-03-01',
          cover: {
            url: 'https://cdn.example.com/collections/hai-cover.jpg',
            alt: 'Dossier Cover',
          },
          story: {
            version: '2.0',
            sections: [
              {
                id: 'sec-1',
                title: 'Introduction',
                level: 2,
                blocks: [
                  {
                    id: 'b-1',
                    blockType: 'text',
                    settings: {
                      text: 'This collection brings together pivotal works.',
                    },
                  },
                ],
              },
            ],
          },
          items: [
            {
              contentType: 'project',
              slug: 'pars-sql-vtd-edge',
              title: 'PARS-SQL / VTD-Edge',
              summary: 'Reliable Persian NLP-to-SQL architecture.',
            },
            {
              contentType: 'publication',
              slug: 'comparative-visual-discourses',
              title: 'Comparative Visual Discourses',
              summary: 'Discourse analytics research paper.',
            },
          ],
        },
      },
    })

    expect(html).toContain('Human-AI Interaction Dossier')
    expect(html).toContain('Taha Mohammadi')
    expect(html).toContain(
      'Peer-reviewed articles with open-source implementations.',
    )
    expect(html).toContain('This collection brings together pivotal works.')
    expect(html).toContain('PARS-SQL / VTD-Edge')
    expect(html).toContain('/en/projects/pars-sql-vtd-edge')
    expect(html).toContain('Comparative Visual Discourses')
    expect(html).toContain('/en/publications/comparative-visual-discourses')
  })

  it('renders collection detail unavailable state cleanly', async () => {
    const html = await render(DetailPage, {
      locale: 'fa',
      model: {
        status: 'unavailable',
      },
    })

    expect(html).toContain('مجموعه‌ها در دسترس نیست')
  })
})
