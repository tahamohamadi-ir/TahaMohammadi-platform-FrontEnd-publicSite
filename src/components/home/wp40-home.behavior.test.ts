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

import { readFileSync } from 'node:fs'
import HomeHero from './HomeHero.astro'
import {
  adaptHeroGraph,
  createStaticRelatedResolver,
} from '../../lib/hero-graph-content'
const payload = JSON.parse(
  readFileSync(
    new URL(
      '../../../tests/fixtures/contracts/hero-graph.json',
      import.meta.url,
    ),
    'utf8',
  ),
).payload
const resolver = createStaticRelatedResolver([
  {
    family: 'researchtopic',
    id: '11',
    locale: 'en',
    href: '/en/research/human-centered-ai/',
  },
  { family: 'project', id: '7', locale: 'en', href: '/en/projects/pars-sql/' },
  {
    family: 'publication',
    id: '3',
    locale: 'en',
    href: '/en/publications/vtd-edge/',
  },
  {
    family: 'article',
    id: '21',
    locale: 'en',
    href: '/en/blog/visual-discourse/',
  },
])
describe('CMS Home retains integrated graph behavior', () => {
  it.each(['en', 'fa'] as const)(
    'keeps hero and graph together without portal imagery in %s',
    async (locale) => {
      mockCms(locale)
      const html = await render(HomeHero, { locale })
      expect(html).toContain('data-hero-layout="integrated"')
      expect(html).toContain('hm-hero__copy')
      expect(html).toContain('hm-hero__graph')
      expect(html).not.toContain('portal-orbit')
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    },
  )
  it('renders every adapted graph node and resolver-only link natively', async () => {
    mockCms('en')
    const graph = adaptHeroGraph(payload, {
      locale: 'en',
      resolveRelatedHref: resolver,
    })
    const html = await render(HomeHero, { locale: 'en', graph })
    expect(html.match(/data-graph-node="/g)).toHaveLength(5)
    expect(html.match(/<details[\s>]/g)).toHaveLength(5)
    expect(html).toContain('href="/en/research/human-centered-ai/"')
    expect(html).toContain('href="/en/projects/pars-sql/"')
    expect(html.match(/data-graph-edge="/g)).toHaveLength(4)
    expect(html).toContain('data-graph-canvas')
  })
  it('keeps the selected node detail accessible in server HTML', async () => {
    mockCms('en')
    const graph = adaptHeroGraph(payload, {
      locale: 'en',
      resolveRelatedHref: resolver,
    })
    const html = await render(HomeHero, {
      locale: 'en',
      graph,
      selectedId: 'node-01',
    })
    const detail = html.match(/data-graph-detail[\s\S]*?<\/div>/)?.[0] ?? ''
    expect(detail).toContain('Human-Centered AI')
    expect(detail).toContain('human goals and agency')
  })
  it('does not render a hidden identity or graph module', async () => {
    mockCms('en')
    const html = await render(HomeHero, { locale: 'en', showGraph: false })
    expect(html).not.toContain('data-graph-region')
    const graphOnly = await render(HomeHero, {
      locale: 'en',
      showIdentity: false,
    })
    expect(graphOnly).not.toContain('hm-hero__copy')
    expect(graphOnly).toContain('data-graph-region')
  })
})
