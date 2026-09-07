import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CreativeDetailContent from './CreativeDetailContent.astro'
import CreativePageContent from './CreativePageContent.astro'

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

describe('PU-15 Creative Product Family', () => {
  it('renders CMS story document when story is present on creative work', async () => {
    const html = await render(CreativeDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        work: {
          locale: 'en',
          slug: 'algorithmic-symphonies',
          title: 'Algorithmic Symphonies',
          description: 'Generative sonic and visual compositions.',
          work_type: 'Generative Art',
          creator_name: 'Taha Mohammadi',
          creator_role: 'Lead Artist',
          creation_date: '2026-01-10',
          access_state: 'Public',
          license: 'CC-BY-NC-4.0',
          rights_statement:
            'All generative outputs licensed under Creative Commons.',
          body: null,
          gallery: [],
          published_at: '2026-02-01T00:00:00Z',
          story: {
            locale: 'en',
            title: 'Algorithmic Symphonies Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Harmonic Synthesis Process',
                      level: 2,
                      id: 'harmonic-synthesis',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Exploring Fourier transforms and stochastic procedural resonance.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Harmonic Synthesis Process')
    expect(html).toContain('Fourier transforms and stochastic')
    expect(html).toContain('Algorithmic Symphonies')
    expect(html).toContain('Generative Art')
  })

  it('renders fallback body HTML when story is absent on creative work', async () => {
    const html = await render(CreativeDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        work: {
          locale: 'en',
          slug: 'procedural-topologies',
          title: 'Procedural Topologies',
          description: 'Topological mesh distortions rendered in WebGL.',
          work_type: 'Digital Sculpture',
          creator_name: 'Taha Mohammadi',
          creator_role: 'Artist',
          creation_date: '2025-11-20',
          access_state: 'Public',
          license: 'MIT',
          rights_statement: null,
          body: '<p>Interactive 3D mathematical surfaces with dynamic vertex shaders.</p>',
          gallery: [],
          published_at: '2026-01-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('Procedural Topologies')
    expect(html).toContain('Interactive 3D mathematical surfaces')
  })

  it('renders creative page ready view with works', async () => {
    const html = await render(CreativePageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        works: [
          {
            locale: 'en',
            slug: 'algorithmic-symphonies',
            title: 'Algorithmic Symphonies',
            description: 'Generative audio-visual experiences.',
            work_type: 'Generative Art',
            published_at: '2026-02-01T00:00:00Z',
          },
        ],
      },
    })

    expect(html).toContain('Algorithmic Symphonies')
  })

  it('renders Persian creative work detail with proper RTL labels', async () => {
    const html = await render(CreativeDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        work: {
          locale: 'fa',
          slug: 'algorithmic-symphonies-fa',
          title: 'سمفونی‌های الگوریتمی',
          description: 'آثار صوتی و بصری زایشی بر پایه ریاضیات.',
          work_type: 'هنر زایشی',
          creator_name: 'طاها محمدی',
          creator_role: 'هنرمند',
          creation_date: '۱۴۰۴-۱۰-۲۰',
          access_state: 'عمومی',
          license: 'CC-BY-NC-4.0',
          rights_statement: 'کلیه حقوق اثر محفوظ است.',
          body: '<p>فرایند تبدیل داده‌های ساختاریافته به فرم‌های بصری و موسیقیایی.</p>',
          gallery: [],
          published_at: '2026-02-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('سمفونی‌های الگوریتمی')
    expect(html).toContain('نوع')
    expect(html).toContain('هنر زایشی')
    expect(html).toContain('← بازگشت به گالری')
  })
})
