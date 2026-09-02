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

describe('PUBLIC-200 about page', () => {
  it('renders structural empty-state chrome when the profile is not published', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="AboutContactUtilityTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toContain('About')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/about-page__section/)
    expect(html).toMatch(/pf-index-empty__timeline-placeholder/)
  })

  it('renders profile sections with anchor ids when ready', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        profile: {
          locale: 'en',
          slug: 'about',
          title: 'About Taha Mohammadi',
          excerpt: 'Background summary.',
          body: 'Intro paragraph one.\n\nIntro paragraph two.',
          engineering_title: 'Engineering',
          engineering_body: 'Engineering paragraph.',
          education: [
            {
              id: 'edu-1',
              title: 'M.A. Visual Communication',
              institution: 'Example University',
              period: '2018–2020',
            },
          ],
          experience: [
            {
              id: 'exp-1',
              title: 'Software Engineer',
              organization: 'Example Org',
              period: '2020–present',
            },
          ],
          published_at: '2026-01-01T00:00:00Z',
        },
      },
    })
    expect(html).toContain('About Taha Mohammadi')
    expect(html).toMatch(/id="about-intro"/)
    expect(html).toMatch(/id="about-engineering"/)
    expect(html).toMatch(/id="about-education"/)
    expect(html).toMatch(/id="about-experience"/)
    expect(html).toContain('Intro paragraph one.')
  })
})
