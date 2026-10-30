import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ContactPageContent from './ContactPageContent.astro'
import CvPageContent from '../cv/CvPageContent.astro'

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

describe('PUBLIC-230 contact page', () => {
  it('renders one honest unavailable state when contact details are absent, not fabricated chrome', async () => {
    // Empty-state policy: see the equivalent test in
    // src/components/projects/public-210.behavior.test.ts. The contact
    // sidebar's "contact methods" cards (PageFamilyContactSidebarShell)
    // render a fabricated "From approved CMS record" value next to each
    // method label, so it does not get a real/static-chrome exception the
    // way AboutAtlasPreview does on the About page.
    const html = await render(ContactPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="ContentState"/)
    expect(html).toMatch(/data-state-variant="unavailable"/)
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toContain('Contact')
    expect(html).toMatch(/href="\/en\/home\/"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyContactHeroShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyTopicCardsShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyContactSidebarShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyFaqShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilySendWorkflowShell"/)
    expect(html).not.toMatch(/data-contact-form/)
    expect(html).not.toMatch(/disabled/)
  })

  it('renders owner-published contact details and noscript form fields', async () => {
    const html = await render(ContactPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        formEnabled: true,
        contact: {
          email: 'owner@example.com',
          employer: 'Example Lab',
          employerUrl: 'https://example.com/lab',
          formEnabled: true,
          linkedin: 'https://linkedin.com/in/example',
          location: 'Tehran, Iran',
          orcid: 'https://orcid.org/0000-0000-0000-0000',
        },
      },
    })
    expect(html).toMatch(/data-visual-id="PageFamilyContactHeroShell"/)
    expect(html).toMatch(/contact-page__form-row/)
    expect(html).toMatch(/contact-page__panel--form/)
    expect(html).toMatch(/href="mailto:owner@example.com"/)
    expect(html).toMatch(/href="https:\/\/linkedin.com\/in\/example"/)
    expect(html).toMatch(/method="post"/)
    expect(html).toMatch(/action="\/api\/contact"/)
    expect(html).toContain('name="email"')
    expect(html).toContain('name="message"')
    expect(html).toContain('name="website"')
  })

  it('omits the form when formEnabled is false', async () => {
    const html = await render(ContactPageContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        formEnabled: false,
        contact: {
          email: 'owner@example.com',
          employer: '',
          employerUrl: '',
          formEnabled: false,
          linkedin: '',
          location: '',
          orcid: '',
        },
      },
    })
    expect(html).not.toMatch(/data-contact-form/)
    expect(html).toMatch(/href="mailto:owner@example.com"/)
  })
})

describe('PUBLIC-230 cv page', () => {
  it('renders one honest unavailable state when downloads are absent, not fabricated chrome', async () => {
    const html = await render(CvPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="ContentState"/)
    expect(html).toMatch(/data-state-variant="unavailable"/)
    expect(html).toContain('CV')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).not.toMatch(/data-visual-id="AboutContactUtilityTemplate"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyProfileHeroShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilyDownloadListShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilySkillsGridShell"/)
    expect(html).not.toMatch(/data-visual-id="PageFamilySelectedOutputsShell"/)
  })

  it('renders download cards when the model is ready', async () => {
    const html = await render(CvPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        downloads: [
          {
            href: '/media/cv/taha-cv-en.pdf',
            kind: 'CV',
            mime: 'application/pdf',
            note: 'English CV',
            size_bytes: 204800,
            title: 'Curriculum Vitae (EN)',
            updated_at: '2026-01-15',
          },
        ],
      },
    })
    expect(html).toContain('Curriculum Vitae (EN)')
    expect(html).toMatch(/href="\/media\/cv\/taha-cv-en.pdf"/)
    expect(html).toContain('English CV')
  })
})
