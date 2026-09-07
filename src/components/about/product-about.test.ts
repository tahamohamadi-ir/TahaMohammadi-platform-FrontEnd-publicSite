import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import AboutPageContent from './AboutPageContent.astro'

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

describe('PU-18 About Product Family (F13)', () => {
  it('renders structural empty-state chrome when profile is unavailable', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })

    expect(html).toContain('AboutContactUtilityTemplate')
    expect(html).toContain('PageFamilyProfileHeroShell')
    expect(html).toContain('Awaiting approved CMS copy')
  })

  it('does not resurrect hardcoded identity when profile is unavailable', async () => {
    for (const locale of ['en', 'fa'] as const) {
      const html = await render(AboutPageContent, {
        locale,
        model: { status: 'unavailable' },
      })
      expect(html).not.toContain('Taha Mohammadi')
      expect(html).not.toContain('طاها محمدی')
      expect(html).not.toContain('طه محمدی')
      expect(html).not.toContain('Researcher · Engineer · Designer')
    }
  })

  it('renders complete about profile when ready in English', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        profile: {
          locale: 'en',
          slug: 'about',
          title: 'About Taha Mohammadi',
          excerpt: 'Researcher and software engineer.',
          body: 'First biographical paragraph.\n\nSecond biographical paragraph.',
          engineering_title: 'Engineering & Systems',
          engineering_body: 'High-reliability distributed architectures.',
          education: [
            {
              id: 'edu-1',
              title: 'M.Sc. Computer Science',
              institution: 'Top Research Institute',
              period: '2020–2022',
              summary: 'Specialization in Human-AI Interaction.',
            },
          ],
          experience: [
            {
              id: 'exp-1',
              title: 'Principal Engineer',
              organization: 'Edge Data Labs',
              period: '2022–present',
              summary: 'Leading local-first analytics architecture.',
            },
          ],
          published_at: '2026-01-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('About Taha Mohammadi')
    expect(html).toContain('Researcher and software engineer.')
    expect(html).toContain('First biographical paragraph.')
    expect(html).toContain('Second biographical paragraph.')
    expect(html).toContain('Engineering &amp; Systems')
    expect(html).toContain('M.Sc. Computer Science')
    expect(html).toContain('Top Research Institute')
    expect(html).toContain('Principal Engineer')
    expect(html).toContain('Edge Data Labs')
  })

  it('renders complete about profile in Persian', async () => {
    const html = await render(AboutPageContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        profile: {
          locale: 'fa',
          slug: 'about',
          title: 'درباره طه محمدی',
          excerpt: 'پژوهشگر و مهندس نرم‌افزار.',
          body: 'پاراگراف زندگی‌نامه نخست.\n\nپاراگراف زندگی‌نامه دوم.',
          published_at: '2026-01-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('درباره طه محمدی')
    expect(html).toContain('پژوهشگر و مهندس نرم‌افزار.')
    expect(html).toContain('پاراگراف زندگی‌نامه نخست.')
  })
})
