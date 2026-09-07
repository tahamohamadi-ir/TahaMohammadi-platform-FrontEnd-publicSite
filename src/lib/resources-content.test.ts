import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CollectionPage from '../components/resources/CollectionPage.astro'
import DetailPage from '../components/resources/DetailPage.astro'

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

describe('PU-16 Resources Product Family', () => {
  it('renders resources collection page with resources list', async () => {
    const html = await render(CollectionPage, {
      locale: 'en',
      model: {
        status: 'ready',
        resources: [
          {
            locale: 'en',
            slug: 'distributed-tracer-runtime',
            title: 'Distributed Tracer Runtime v2.4',
            description:
              'High-performance eBPF tracing agent for Kubernetes clusters.',
            download_type: 'Binary Package',
            language: 'en',
            license: 'Apache-2.0',
            access_state: 'Public',
            published_at: '2026-02-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })

    expect(html).toContain('Distributed Tracer Runtime v2.4')
    expect(html).toContain('High-performance eBPF tracing agent')
    expect(html).toContain('/en/resources/distributed-tracer-runtime')
  })

  it('renders CMS story document when story is present on resource', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        resource: {
          locale: 'en',
          slug: 'distributed-tracer-runtime',
          title: 'Distributed Tracer Runtime v2.4',
          description: 'Fallback resource overview.',
          download_type: 'Binary Package',
          language: 'en',
          license: 'Apache-2.0',
          access_state: 'Public',
          accessibility_notes: 'CLI documentation available in plaintext.',
          file: {
            url: 'https://cdn.example.com/binaries/tracer-v2.4.tar.gz',
            alt: 'Tracer archive',
          },
          mime: 'application/gzip',
          size_bytes: 15420000,
          published_at: '2026-02-01T00:00:00Z',
          updated_at: null,
          story: {
            locale: 'en',
            title: 'Tracer Architecture and Deployment Guide',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Zero-Overhead In-Kernel Instrumentation',
                      level: 2,
                      id: 'kernel-instrumentation',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Direct ring-buffer memory copies avoid user-space context switches.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Zero-Overhead In-Kernel Instrumentation')
    expect(html).toContain('Direct ring-buffer memory copies avoid')
    expect(html).toContain('Download Resource')
    expect(html).toContain('14.7 MB')
    expect(html).toContain('Apache-2.0')
  })

  it('renders fallback description when story is absent', async () => {
    const html = await render(DetailPage, {
      locale: 'en',
      model: {
        status: 'ready',
        resource: {
          locale: 'en',
          slug: 'consensus-benchmark-dataset',
          title: 'Consensus Protocol Benchmark Dataset',
          description:
            'Network partition traces under varying adversarial conditions.',
          download_type: 'Dataset',
          language: 'en',
          license: 'CC0-1.0',
          access_state: 'Public',
          accessibility_notes: '',
          file: {
            url: 'https://cdn.example.com/data/benchmarks.parquet',
            alt: 'Parquet dataset',
          },
          mime: 'application/octet-stream',
          size_bytes: 52428800,
          story: null,
        },
      },
    })

    expect(html).toContain('Consensus Protocol Benchmark Dataset')
    expect(html).toContain(
      'Network partition traces under varying adversarial conditions.',
    )
    expect(html).toContain('50.0 MB')
  })

  it('renders Persian resource detail with proper RTL labels', async () => {
    const html = await render(DetailPage, {
      locale: 'fa',
      model: {
        status: 'ready',
        resource: {
          locale: 'fa',
          slug: 'tracer-fa',
          title: 'ابزار ردگیری توزیع‌شده',
          description: 'بسته اجرایی ردگیری عملکردی هسته لینوکس.',
          download_type: 'بسته نرم‌افزاری',
          language: 'fa',
          license: 'Apache-2.0',
          access_state: 'عمومی',
          accessibility_notes: '',
          file: {
            url: 'https://cdn.example.com/binaries/tracer-fa.tar.gz',
            alt: 'فایل ردگیری',
          },
          mime: 'application/gzip',
          size_bytes: 1048576,
          story: null,
        },
      },
    })

    expect(html).toContain('ابزار ردگیری توزیع‌شده')
    expect(html).toContain('دانلود فایل منبع')
    expect(html).toContain('نوع پرونده')
    expect(html).toContain('← بازگشت به منابع')
  })
})
