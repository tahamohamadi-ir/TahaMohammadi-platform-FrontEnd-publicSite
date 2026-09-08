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
      const copy = {
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

import HomeHero from './HomeHero.astro'
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
      const html = await render(HomeHero, { locale })
      expect(html).toContain(locale === 'fa' ? 'هویت ویرایش شده' : 'Edited')
      expect(html).toContain('Edited introduction')
      expect(html).toContain('Published statement body')
      expect(html).toContain('Edited role')
      expect(html).toContain(locale === 'fa' ? 'موضوع پژوهش' : 'Research topic')
      expect(html).toContain('href="/' + locale + '/research/"')
    },
  )
  it('reflects edited text on the next render and removes deleted selected records', async () => {
    mockCms('en', 'First identity')
    expect(await render(HomeHero, { locale: 'en' })).toContain('First')
    expect(await render(HomeFeaturedProjects, { locale: 'en' })).toContain(
      'href="/en/projects/selected-project/"',
    )
    mockCms('en', 'Second identity', false)
    const updated = await render(HomeHero, { locale: 'en' })
    expect(updated).toContain('Second')
    expect(updated).not.toContain('First')
    expect(await render(HomeFeaturedProjects, { locale: 'en' })).not.toContain(
      'Selected project',
    )
    expect(
      await render(HomeFeaturedPublications, { locale: 'en' }),
    ).not.toContain('Selected paper')
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
    expect(html).toContain('data-hero-layout="integrated"')
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
})
