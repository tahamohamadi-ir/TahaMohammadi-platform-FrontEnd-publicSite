import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getHomeHeroContent,
  getHomeFeaturedContent,
  getHomePublicationsContent,
  getHomeInterestsContent,
  getHomeJourneyContent,
  summarizeHomeLanding,
  summarizeResearchStatement,
} from './home-content'

const published_at = '2026-09-01T00:00:00Z'
beforeEach(() => vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('CMS-only Home content', () => {
  it('turns authored Markdown and HTML into concise, safe hero copy', () => {
    expect(
      summarizeHomeLanding(`## Research · Engineering · Design

Design · Interaction · Engineering · Data · AI

I build and study human-centered intelligent systems across interaction, data and AI.

### Explore by perspective

One identity, multiple entry paths.`),
    ).toBe(
      'I build and study human-centered intelligent systems across interaction, data and AI.',
    )
    expect(
      summarizeResearchStatement(
        '<p>Software engineer and applied AI researcher.</p><p>Second paragraph.</p>',
      ),
    ).toBe('Software engineer and applied AI researcher.')
    expect(summarizeResearchStatement('<script>alert(1)</script>Safe')).toBe(
      'alert(1)Safe',
    )
  })

  it('does not restore owner facts or selected works when APIs are unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    expect((await getHomeHeroContent('en')).name).toBe('')
    expect((await getHomeHeroContent('fa')).focusChips).toEqual([])
    expect((await getHomeFeaturedContent('en')).projects).toEqual([])
    expect((await getHomePublicationsContent('en')).items).toEqual([])
    expect((await getHomeJourneyContent('en')).milestones).toEqual([])
  })
  it('shows updated published profile, landing and exact-locale research records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const path = new URL(input).pathname
        const data: Record<string, unknown> = {
          '/api/v1/site/en': {
            locale: 'en',
            brandName: 'Edited identity',
            tagline: 'Edited role',
            contentCopy: {
              'hero.focus_areas': 'Edited focus label',
              'home.interests.title': 'Edited section',
            },
          },
          '/api/profiles/en': [
            {
              locale: 'en',
              slug: 'about',
              title: 'Published profile',
              body: 'Published biography',
              published_at,
            },
          ],
          '/api/landings/en/home': {
            locale: 'en',
            slug: 'home',
            title: 'Home',
            body: 'Edited introduction',
            published_at,
          },
          '/api/research/topics/en': {
            count: 2,
            items: [
              {
                locale: 'en',
                slug: 'topic',
                title: 'Edited topic',
                summary: 'Edited research',
                published_at,
              },
              {
                locale: 'fa',
                slug: 'wrong',
                title: 'Wrong locale',
                summary: '',
                published_at,
              },
            ],
          },
        }
        return data[path]
          ? new Response(JSON.stringify(data[path]))
          : new Response(null, { status: 404 })
      }),
    )
    const hero = await getHomeHeroContent('en')
    expect(hero.name).toBe('Edited identity')
    expect(hero.role).toBe('Edited role')
    expect(hero.intro).toBe('Edited introduction')
    expect(hero.focusChips).toEqual(['Edited topic'])
    const interests = await getHomeInterestsContent('en')
    expect(interests.cards.map((item) => item.title)).toEqual(['Edited topic'])
    expect(interests.sectionTitle).toBe('Edited section')
  })
  it('preserves intentional blank settings and landing copy after deletion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const path = new URL(input).pathname
        const data: Record<string, unknown> = {
          '/api/v1/site/en': {
            locale: 'en',
            brandName: '',
            tagline: '',
            contentCopy: {},
          },
          '/api/profiles/en': [
            {
              locale: 'en',
              slug: 'about',
              title: 'Different profile title',
              body: 'Biography',
              published_at,
            },
          ],
          '/api/landings/en/home': {
            locale: 'en',
            slug: 'home',
            title: 'Home',
            body: '',
            published_at,
          },
          '/api/research/topics/en': {
            count: 1,
            items: [
              {
                locale: 'en',
                slug: 'draft',
                title: 'Draft research',
                summary: '',
                published_at: null,
              },
            ],
          },
        }
        return data[path]
          ? new Response(JSON.stringify(data[path]))
          : new Response(null, { status: 404 })
      }),
    )
    const hero = await getHomeHeroContent('en')
    expect(hero.name).toBe('')
    expect(hero.role).toBe('')
    expect(hero.intro).toBe('')
    expect(hero.focusChips).toEqual([])
  })
  it('omits unresolved and wrong-locale featured records without guessing links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input.includes('/api/v1/site/en'))
          return new Response(
            JSON.stringify({
              locale: 'en',
              featuredRecords: [
                { family: 'project', id: '1' },
                { family: 'project', id: '2' },
              ],
              contentCopy: {},
            }),
          )
        return new Response(
          JSON.stringify({
            items: [
              {
                family: 'project',
                id: '1',
                locale: 'fa',
                slug: 'private-wrong-locale',
                routeFamily: 'projects',
                title: 'Excluded',
                summary: '',
              },
            ],
            unresolved: [{ family: 'project', id: '2' }],
          }),
        )
      }),
    )
    expect((await getHomeFeaturedContent('en')).projects).toEqual([])
  })
})
