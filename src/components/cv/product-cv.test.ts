import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CvPageContent from './CvPageContent.astro'
import { getCvUnavailableCopy, formatDownloadMeta } from '../../lib/cv-content'

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

describe('PU-18 CV Product Family (F13)', () => {
  it('formats download metadata correctly', () => {
    const meta = formatDownloadMeta({
      label: 'Academic CV',
      url: 'https://cdn.example.com/cv.pdf',
      kind: 'PDF',
      updated_at: '2026-03-01',
      size_bytes: 204800,
    })
    expect(meta).toBe('PDF · 2026-03-01 · 200 KB')
  })

  it('renders structural empty-state chrome when CV downloads are unavailable', async () => {
    const html = await render(CvPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    })

    expect(html).toContain('AboutContactUtilityTemplate')
    expect(html).toContain('The current public CV is not yet available for download')
    expect(html).toContain('PageFamilyProfileHeroShell')
  })

  it('renders download list when approved public downloads are available', async () => {
    const html = await render(CvPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        downloads: [
          {
            title: 'Academic Curriculum Vitae (English)',
            href: 'https://cdn.example.com/docs/taha-mohammadi-cv-en.pdf',
            kind: 'Academic CV',
            updated_at: '2026-03-01',
            size_bytes: 358400,
          },
        ],
      },
    })

    expect(html).toContain('Academic Curriculum Vitae (English)')
    expect(html).toContain('https://cdn.example.com/docs/taha-mohammadi-cv-en.pdf')
    expect(html).toContain('Academic CV · 2026-03-01 · 350 KB')
  })

  it('renders Persian empty state copy correctly', async () => {
    const emptyCopy = getCvUnavailableCopy('fa')
    const html = await render(CvPageContent, {
      locale: 'fa',
      model: { status: 'unavailable' },
    })

    expect(html).toContain(emptyCopy.message)
  })
})
