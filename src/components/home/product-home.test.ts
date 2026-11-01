import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '../../lib/navigation'
type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]
const render = async (component: Component, props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(component, { props })
const published_at = '2026-09-01T00:00:00Z'
function mockCms(
  locale: Locale,
  name = 'Edited identity',
  includeRecords = true,
  includeCopy = true,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input, 'https://api.example.test')
      const records = includeRecords
        ? [
            {
              family: 'project',
              id: '1',
              locale,
              slug: 'selected-project',
              title: 'Selected project',
              summary: 'CMS project summary',
              routeFamily: 'projects',
            },
            {
              family: 'publication',
              id: '2',
              locale,
              slug: 'selected-paper',
              title: 'Selected paper',
              summary: 'CMS publication summary',
              routeFamily: 'publications',
            },
          ]
        : []
      const copy = includeCopy
        ? {
            'hero.focus_areas': 'Focus label',
            'hero.cta.research': 'Research action',
            'hero.cta.cv': 'CV action',
            'hero.cta.contact': 'Contact action',
            'home.projects.title': 'Project section',
            'home.projects.view_all': 'Project index',
            'home.projects.view_record': 'Read project',
            'home.publications.title': 'Publication section',
            'home.publications.view_all': 'Publication index',
            'home.interests.title': 'Interests section',
            'home.interests.lead': 'Research lead',
            'home.collaboration.title': 'Collaboration section',
            'home.collaboration.body': 'Managed availability',
            'home.collaboration.contact': 'Contact owner',
            'home.explore.title': 'Explore section',
            'home.explore.gallery.title': 'Gallery',
            'home.explore.gallery.action': 'Browse gallery',
            'home.journey.title': 'Journey section',
            'home.journey.headline': 'Journey headline',
            'home.unavailable.title': 'Home unavailable',
            'home.unavailable.message': 'No published Home modules',
          }
        : {}
      const data: Record<string, unknown> = {
        ['/api/v1/site/' + locale]: {
          locale,
          brandName: name,
          tagline: 'Edited role',
          contentCopy: copy,
          featuredRecords: records.map(({ family, id }) => ({ family, id })),
        },
        ['/api/profiles/' + locale]: [
          {
            locale,
            slug: 'about',
            title: name,
            body: 'Published biography',
            published_at,
          },
        ],
        ['/api/landings/' + locale + '/home']: {
          locale,
          slug: 'home',
          title: 'Home',
          body: 'Edited introduction',
          published_at,
        },
        ['/api/research/topics/' + locale]: {
          count: 1,
          items: [
            {
              locale,
              slug: 'topic',
              title: locale === 'fa' ? 'موضوع پژوهش' : 'Research topic',
              summary: 'Published topic summary',
              published_at,
            },
          ],
        },
        ['/api/research/statements/' + locale]: [
          {
            locale,
            slug: 'statement',
            title: 'Published research statement',
            body: 'Published statement body',
            published_at,
          },
        ],
        ['/api/v1/records/' + locale + '/resolve']: {
          items: records,
          unresolved: [],
        },
        ['/api/v1/site/' + locale + '/journey']: {
          locale,
          milestones: [
            {
              kind: 'experience',
              title: 'CMS role',
              subtitle: 'CMS org',
              period: '2020–now',
            },
            {
              kind: 'education',
              title: 'CMS degree, CMS field',
              subtitle: 'CMS school',
              period: '2016–2018',
            },
          ],
        },
      }
      return data[url.pathname]
        ? new Response(JSON.stringify(data[url.pathname]))
        : new Response(null, { status: 404 })
    }),
  )
}
beforeEach(() => vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

import HeroV3 from './hero-v3/HeroV3.astro'
import HomeContent from './HomeContent.astro'
import HomeFeaturedProjects from './HomeFeaturedProjects.astro'
import HomeFeaturedPublications from './HomeFeaturedPublications.astro'
import HomeJourney from './HomeJourney.astro'
import HomeResearchInterests from './HomeResearchInterests.astro'
import HomeExploreRails from './HomeExploreRails.astro'
import HomeCollaborationCta from './HomeCollaborationCta.astro'
import { homeModuleOrder } from '../../lib/home-content'

describe('PU-17 Home CMS integration', () => {
  it.each(['en', 'fa'] as const)(
    'renders published identity, introduction and focus in %s',
    async (locale) => {
      mockCms(locale, locale === 'fa' ? 'هویت ویرایش شده' : 'Edited identity')
      const html = await render(HeroV3, { locale })
      expect(html).toContain(locale === 'fa' ? 'هویت' : 'Edited')
      expect(html).toContain(locale === 'fa' ? 'ویرایش شده' : 'identity')
      expect(html).toContain('Edited introduction')
      expect(html).toContain('Published statement body')
      expect(html).toContain('Edited role')
      expect(html).toContain(locale === 'fa' ? 'موضوع پژوهش' : 'Research topic')
      expect(html).toContain('href="/' + locale + '/research/"')
    },
  )
  it('reflects edited text on the next render and removes deleted selected records', async () => {
    mockCms('en', 'First identity')
    expect(await render(HeroV3, { locale: 'en' })).toContain('First')
    expect(await render(HomeFeaturedProjects, { locale: 'en' })).toContain(
      'href="/en/projects/selected-project/"',
    )
    mockCms('en', 'Second identity', false)
    const updated = await render(HeroV3, { locale: 'en' })
    expect(updated).toContain('Second')
    expect(updated).not.toContain('First')
    expect(await render(HomeFeaturedProjects, { locale: 'en' })).not.toContain(
      'Selected project',
    )
    expect(
      await render(HomeFeaturedPublications, { locale: 'en' }),
    ).not.toContain('Selected paper')
  })
  it('draws the published graph as linked constellation nodes without duplicate focus chips', async () => {
    mockCms('en')
    const cms = globalThis.fetch as unknown as (
      input: string,
    ) => Promise<Response>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = new URL(input, 'https://api.example.test')
        if (url.pathname !== '/api/graph/en') return cms(input)
        return new Response(
          JSON.stringify({
            nodes: [
              {
                id: 'identity',
                type: 'identity',
                label: 'Edited identity',
                accessibleLabel: 'Edited identity',
                weight: 1,
                colorRole: 'brand',
                iconRole: 'ring',
                position: { x: 0, y: 0, z: 8 },
                relatedRecords: [],
              },
              {
                id: 'topic-1',
                type: 'research-topic',
                label: 'Graph topic',
                accessibleLabel: 'Graph topic',
                weight: 1,
                colorRole: 'research',
                iconRole: 'disc',
                position: { x: 0, y: -76, z: -8 },
                relatedRecords: [{ family: 'project', id: '1' }],
              },
            ],
            edges: [
              {
                id: 'e1',
                source: 'identity',
                target: 'topic-1',
                relationType: 'research-focus',
                directed: true,
                weight: 1,
              },
            ],
          }),
        )
      }),
    )
    const html = await render(HeroV3, { locale: 'en' })
    expect(html).toContain('data-hero-visual="constellation"')
    expect(html).toContain('data-hv3-live')
    expect(html).toContain('Graph topic')
    expect(html).toContain('href="/en/projects/selected-project/"')
    expect(html).not.toContain('hv3__focus')
  })
  it('links selected publications to the actual publication detail family', async () => {
    mockCms('en')
    const html = await render(HomeFeaturedPublications, { locale: 'en' })
    expect(html).toContain('href="/en/publications/selected-paper/"')
    expect(html).toContain('href="/en/publications/"')
    expect(html).not.toContain('Manuscript draft')
  })
  it('renders published journey milestones with periods and organizations', async () => {
    mockCms('en')
    const html = await render(HomeJourney, { locale: 'en' })
    expect(html).toContain('Journey headline')
    expect(html).toContain('CMS role')
    expect(html).toContain('CMS org')
    expect(html).toContain('2020–now')
    expect(html).toContain('CMS degree, CMS field')
    expect(html).toContain('CMS school')
  })
  it('omits empty headings and fit callouts until managed copy is published', async () => {
    mockCms('en', 'Edited identity', true, false)
    const interests = await render(HomeResearchInterests, { locale: 'en' })
    const journey = await render(HomeJourney, { locale: 'en' })

    expect(interests).toContain('Research topic')
    expect(interests).not.toContain('hm-interests__header')
    expect(interests).not.toContain('hm-interests__fit')
    expect(journey).toContain('CMS role')
    expect(journey).not.toContain('hm-journey__header')
    expect(interests + journey).not.toMatch(/<h[23][^>]*>\s*<\/h[23]>/)
  })
  it('leaves all optional content absent on API failure instead of showing local records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    for (const component of [
      HomeFeaturedProjects,
      HomeFeaturedPublications,
      HomeResearchInterests,
      HomeJourney,
      HomeExploreRails,
      HomeCollaborationCta,
    ]) {
      const html = await render(component, { locale: 'en' })
      expect(html).not.toContain('<section')
      expect(html).not.toContain('Taha')
      expect(html).not.toContain('PARS-SQL')
    }
  })
  it('uses published module visibility and order and merges the graph into one hero', async () => {
    mockCms('en')
    const composition = {
      revision: 'r1',
      modules: [
        { key: 'identity', order: 10 },
        { key: 'graph', order: 11 },
        { key: 'publications', order: 1 },
        { key: 'projects', order: 2 },
      ],
    }
    expect(homeModuleOrder(composition)).toEqual([
      'publications',
      'projects',
      'identity',
    ])
    const html = await render(HomeContent, {
      locale: 'en',
      composition,
      graph: { locale: 'en', status: 'unavailable' },
    })
    expect(html.indexOf('data-home-module="publications"')).toBeLessThan(
      html.indexOf('data-home-module="projects"'),
    )
    expect(html.match(/data-home-module="hero"/g)).toHaveLength(1)
    expect(html).not.toContain('data-home-module="research-fit"')
    expect(html).toContain('data-hero-v3')
    expect(html).not.toContain('portal-orbit')
  })
  it('renders the managed unavailable message when no home modules are published', async () => {
    mockCms('en')
    const html = await render(HomeContent, {
      locale: 'en',
      composition: null,
      graph: { locale: 'en', status: 'unavailable' },
    })
    expect(html).toContain('Home unavailable')
    expect(html).not.toContain('Edited identity')
    expect(html).not.toContain('Selected project')
  })
  it.each([
    ['en', 'Content unavailable', 'Published content is not available yet.'],
    ['fa', 'محتوا در دسترس نیست', 'محتوای منتشرشده هنوز در دسترس نیست.'],
  ] as const)(
    'keeps the unavailable state readable when managed copy is absent in %s',
    async (locale, title, message) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null, { status: 404 })),
      )
      const html = await render(HomeContent, {
        locale,
        composition: null,
        graph: { locale, status: 'unavailable' },
      })
      expect(html).toContain(title)
      expect(html).toContain(message)
    },
  )
})
