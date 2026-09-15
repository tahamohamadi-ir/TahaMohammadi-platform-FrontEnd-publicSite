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

import HomeHero from './HomeHero.astro'

describe('CMS Home keeps the image hero and carries no graph runtime', () => {
  it.each(['en', 'fa'] as const)(
    'keeps hero and copy together with the image sequence in %s',
    async (locale) => {
      mockCms(locale)
      const html = await render(HomeHero, { locale })
      expect(html).toContain('data-hero-layout="integrated"')
      expect(html).toContain('hm-hero__copy')
      expect(html).toContain('hm-hero__sequence')
      expect(html).toContain('data-hero-sequence')
      expect(html).not.toContain('portal-orbit')
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    },
  )

  it('renders the four authored states and mounts no graph, canvas or scene payload', async () => {
    mockCms('en')
    const html = await render(HomeHero, { locale: 'en' })
    // Four authored states, one set per authored theme (one of them hidden server-side).
    expect(html).toContain('data-hero-sequence-frame-count="4"')
    expect(html.match(/data-hero-sequence-frame="/g)).toHaveLength(8)
    expect(html.match(/data-hero-sequence-theme="/g)).toHaveLength(2)
    expect(html).not.toContain('data-graph-node')
    expect(html).not.toContain('data-graph-edge')
    expect(html).not.toContain('data-graph-region')
    expect(html).not.toContain('data-graph-canvas')
    expect(html).not.toContain('data-scene-payload')
    expect(html).not.toContain('<canvas')
  })

  it('ships device-specific art through a real source query, never a CSS crop', async () => {
    mockCms('en')
    const html = await render(HomeHero, { locale: 'en' })
    expect(html).toMatch(/media="\(min-width:\s*768px\)"/)
    expect(html).toContain('image/avif')
    expect(html).toContain('image/webp')
    // Exactly one frame is the eager, high-priority one: the visible theme's first state.
    expect(html.match(/loading="eager"/g)).toHaveLength(1)
    expect(html.match(/fetchpriority="high"/g)).toHaveLength(1)
  })

  it('does not render a hidden identity or sequence module', async () => {
    mockCms('en')
    const withoutSequence = await render(HomeHero, {
      locale: 'en',
      showSequence: false,
    })
    expect(withoutSequence).not.toContain('data-hero-sequence')
    expect(withoutSequence).toContain('hm-hero__copy')
    const withoutIdentity = await render(HomeHero, {
      locale: 'en',
      showIdentity: false,
    })
    expect(withoutIdentity).not.toContain('hm-hero__copy')
    expect(withoutIdentity).toContain('data-hero-sequence')
  })
})
