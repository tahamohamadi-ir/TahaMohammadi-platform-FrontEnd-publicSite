import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import ContactPageContent from './ContactPageContent.astro'
import { getContactUnavailableCopy } from '../../lib/contact-content'

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

describe('PU-18 Contact Product Family (F14)', () => {
  it('renders structural empty state when contact details are unavailable', async () => {
    const html = await render(ContactPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })

    expect(html).toContain('AboutContactUtilityTemplate')
    expect(html).toContain('PageFamilyContactHeroShell')
    expect(html).not.toContain('data-contact-form')
  })

  it('renders contact channels and noscript form when ready in English', async () => {
    const html = await render(ContactPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        formEnabled: true,
        contact: {
          email: 'taha@example.com',
          location: 'Tehran, Iran',
          employer: 'Human-Centered AI Lab',
          employerUrl: 'https://example.com/hai-lab',
          linkedin: 'https://linkedin.com/in/tahamohammadi',
          orcid: 'https://orcid.org/0000-0002-1825-0097',
          formEnabled: true,
        },
      },
    })

    expect(html).toContain('PageFamilyContactHeroShell')
    expect(html).toContain('mailto:taha@example.com')
    expect(html).toContain('https://linkedin.com/in/tahamohammadi')
    expect(html).toContain('https://orcid.org/0000-0002-1825-0097')
    expect(html).toContain('Human-Centered AI Lab')
    expect(html).toContain('method="post"')
    expect(html).toContain('action="/api/contact"')
  })

  it('renders Persian empty state copy correctly', async () => {
    const emptyCopy = getContactUnavailableCopy('fa')
    const html = await render(ContactPageContent, {
      locale: 'fa',
      model: { status: 'unavailable' },
    })

    expect(html).toContain(emptyCopy.message)
  })
})
