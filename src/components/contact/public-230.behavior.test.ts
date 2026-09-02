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
  it('renders structural empty-state chrome when contact details are absent', async () => {
    const html = await render(ContactPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="AboutContactUtilityTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toContain('Contact')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/pf-index-hero--portal/)
    expect(html).toMatch(/contact-page__topics/)
    expect(html).not.toMatch(/data-contact-form/)
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
    expect(html).toMatch(/pf-index-hero--portal/)
    expect(html).toMatch(/contact-page__topic-chip/)
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
  it('renders structural empty-state chrome when downloads are absent', async () => {
    const html = await render(CvPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })
    expect(html).toMatch(/data-visual-id="AboutContactUtilityTemplate"/)
    expect(html).toMatch(/data-state-variant="empty"/)
    expect(html).toContain('CV')
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toMatch(/cv-page__section/)
    expect(html).toMatch(/data-visual-id="PageFamilyIndexHero"/)
    expect(html).toMatch(/data-visual-id="PageFamilyDownloadListShell"/)
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
