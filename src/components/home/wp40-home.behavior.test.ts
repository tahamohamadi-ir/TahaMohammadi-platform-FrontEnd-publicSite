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

import HeroV3 from './hero-v3/HeroV3.astro'

function withGraph(locale: Locale) {
  const cms = globalThis.fetch as unknown as (
    input: string,
  ) => Promise<Response>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input, 'https://api.example.test')
      if (url.pathname !== '/api/graph/' + locale) return cms(input)
      return new Response(
        JSON.stringify({
          nodes: [
            {
              id: 'identity',
              type: 'identity',
              label: 'Identity',
              accessibleLabel: 'Identity',
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
              position: { x: 96, y: 38, z: 0 },
              relatedRecords: [],
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
}

describe('Home Hero v3 keeps one copy column and draws only the published graph', () => {
  it.each(['en', 'fa'] as const)(
    'renders one heading, no scroll sequence and no hero image in %s',
    async (locale) => {
      mockCms(locale)
      withGraph(locale)
      const html = await render(HeroV3, { locale })
      expect(html).toContain('hv3__copy')
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
      // Two coloured spans, but one accessible name with a word gap.
      expect(html).toMatch(/hv3__name-line"[^>]*>[^<]+<\/span> <span/)
      expect(html).not.toContain('data-hero-sequence')
      expect(html).not.toContain('data-hero-scroll-shell')
      expect(html).not.toContain('portal-orbit')
      expect(html).not.toContain('<img')
    },
  )

  it('ships the SVG poster, the live canvas and its payload for the published graph', async () => {
    mockCms('en')
    withGraph('en')
    const html = await render(HeroV3, { locale: 'en' })
    expect(html).toContain('data-hero-visual="constellation"')
    expect(html).toContain('class="hv3-const__poster"')
    expect(html).toContain('<canvas')
    expect(html).toContain('data-hv3-payload')
    expect(html.match(/class="hv3-const__edge"/g)).toHaveLength(1)
    expect(html).toContain('Graph topic')
  })

  it('falls back to the copy column with focus chips when no graph is published', async () => {
    mockCms('en')
    const html = await render(HeroV3, { locale: 'en' })
    expect(html).toContain('hv3--copy-only')
    expect(html).toContain('data-hero-visual="none"')
    expect(html).toContain('hv3__focus')
    expect(html).not.toContain('<canvas')
    expect(html).not.toContain('data-hv3-constellation')
  })

  it('does not render a hidden identity or graph module', async () => {
    mockCms('en')
    withGraph('en')
    const withoutGraph = await render(HeroV3, {
      locale: 'en',
      showGraph: false,
    })
    expect(withoutGraph).not.toContain('data-hv3-constellation')
    expect(withoutGraph).toContain('hv3__copy')
    const withoutIdentity = await render(HeroV3, {
      locale: 'en',
      showIdentity: false,
    })
    expect(withoutIdentity).not.toContain('hv3__copy')
    expect(withoutIdentity).toContain('data-hv3-constellation')
  })
})
