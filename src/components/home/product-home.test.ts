import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import HomeHero from './HomeHero.astro'
import HomeFeaturedProjects from './HomeFeaturedProjects.astro'
import HomeFeaturedPublications from './HomeFeaturedPublications.astro'
import HomeJourney from './HomeJourney.astro'
import HomeResearchInterests from './HomeResearchInterests.astro'
import { loadHomeHeroContent, getHomeHeroContent } from '../../lib/home-content'

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

describe('PU-17-home: Product Home Integration Tests (§I04)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads synchronous fallback hero content when API is unreachable', () => {
    const en = getHomeHeroContent('en')
    expect(en.name).toBe('Taha Mohammadi')
    expect(en.focusChips.length).toBeGreaterThan(0)

    const fa = getHomeHeroContent('fa')
    expect(fa.name).toBe('طه محمدی')
    expect(fa.focusChips.length).toBeGreaterThan(0)
  })

  it('integrates live CMS settings and profile in loadHomeHeroContent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/site/en')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                locale: 'en',
                revision: 'rev-test-1',
                brandName: 'Dr. Taha Mohammadi',
                tagline: 'Principal AI Researcher & Systems Architect',
                footerText: 'Footer note',
                seo: { title: 'Taha', description: 'Desc' },
                navLinks: [],
                audienceLinks: [],
                scene: {
                  graphPreset: 'atlas-v2',
                  portalPreset: 'arch-v2',
                  motion: 'full',
                  density: 'standard',
                },
                contentCopy: { 'hero.focus_areas': 'Key Research Thrusts' },
                updatedAt: '2026-09-07T00:00:00Z',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          )
        }
        if (url.includes('/api/profiles/en')) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  slug: 'main',
                  title: 'Dr. Taha Mohammadi',
                  body: 'Researching inspectable foundation models and human-AI decision systems.',
                  locale: 'en',
                },
              ]),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          )
        }
        return Promise.resolve(new Response(null, { status: 404 }))
      }),
    )

    const content = await loadHomeHeroContent('en')
    expect(content.name).toBe('Dr. Taha Mohammadi')
    expect(content.namePrimary).toBe('Dr.')
    expect(content.role).toBe('Principal AI Researcher & Systems Architect')
    expect(content.intro).toBe(
      'Researching inspectable foundation models and human-AI decision systems.',
    )
    expect(content.focusAreasLabel).toBe('Key Research Thrusts')
  })

  it('renders HomeHero with integrated layout in both EN and FA', async () => {
    const enHtml = await render(HomeHero, { locale: 'en' })
    expect(enHtml).toMatch(/data-hero-layout="integrated"/)
    expect(enHtml).toMatch(/class="hm-hero__name"/)

    const faHtml = await render(HomeHero, { locale: 'fa' })
    expect(faHtml).toMatch(/data-hero-layout="integrated"/)
    expect(faHtml).toMatch(/class="hm-hero__name"/)
  })

  it('renders HomeFeaturedProjects and resolves links only for published slugs', async () => {
    const publishedSlugs = new Set(['pars-sql-vtd-edge'])
    const html = await render(HomeFeaturedProjects, {
      locale: 'en',
      publishedProjectSlugs: publishedSlugs,
    })

    expect(html).toMatch(/class="hm-projects"/)
    // The published slug should be linked
    expect(html).toMatch(/href="\/en\/projects\/pars-sql-vtd-edge\/"/)
  })

  it('renders HomeFeaturedPublications and preserves truthful non-links for unconfirmed manuscripts', async () => {
    const html = await render(HomeFeaturedPublications, {
      locale: 'en',
      publishedArticleSlugs: new Set<string>(),
    })

    expect(html).toMatch(/class="hm-publications"/)
    // When no articles are published, cards should not have fake links
    expect(html).not.toMatch(/href="\/en\/blog\/undefined\/"/)
  })

  it('renders HomeResearchInterests and HomeJourney without crashing', async () => {
    const interestsHtml = await render(HomeResearchInterests, { locale: 'en' })
    expect(interestsHtml).toMatch(/class="hm-interests"/)

    const journeyHtml = await render(HomeJourney, { locale: 'en' })
    expect(journeyHtml).toMatch(/class="hm-journey"/)
  })
})
