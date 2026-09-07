import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import ProjectDetailContent from './ProjectDetailContent.astro'
import ProjectsPageContent from './ProjectsPageContent.astro'

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

describe('PU-14 Projects Product Family', () => {
  it('renders CMS story document when story is present on project', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: {
          locale: 'en',
          slug: 'autonomous-robotics-platform',
          title: 'Autonomous Robotics Platform',
          objective:
            'End-to-end robotics control and verification architecture.',
          project_type: 'Robotics',
          role: 'Principal Architect',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          license: 'Apache-2.0',
          code_availability: 'open',
          data_availability: 'open',
          demo_availability: 'live',
          methods_summary:
            'Distributed ROS2 nodes with hardware-in-the-loop simulation.',
          code_url: 'https://github.com/example/robotics',
          data_url: 'https://data.example.com/robotics',
          demo_url: 'https://demo.example.com/robotics',
          published_at: '2025-12-31T00:00:00Z',
          updated_at: null,
          story: {
            locale: 'en',
            title: 'Autonomous Robotics Platform Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Architecture Overview',
                      level: 2,
                      id: 'architecture-overview',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Decoupled actuation and perception pipelines running on embedded Linux.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Architecture Overview')
    expect(html).toContain('Decoupled actuation and perception pipelines')
    expect(html).toContain('Autonomous Robotics Platform')
    expect(html).toContain('Principal Architect')
  })

  it('renders case study breakdown and methods when story is absent', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: {
          locale: 'en',
          slug: 'edge-inference-optimizer',
          title: 'Edge Inference Optimizer',
          objective: 'Low-latency quantized inference on ARM targets.',
          project_type: 'Systems',
          role: 'Lead Developer',
          start_date: '2025-03-01',
          end_date: null,
          license: 'MIT',
          code_availability: 'open',
          data_availability: 'none',
          demo_availability: 'none',
          methods_summary:
            'Integer quantization using symmetric channel-wise scale factors.',
          code_url: 'https://github.com/example/edge-opt',
          data_url: null,
          demo_url: null,
          published_at: '2025-08-01T00:00:00Z',
          updated_at: null,
          case_study: {
            problem: 'Latency was exceeding the 20ms real-time constraint.',
            constraints: 'Thermal throttling on fanless SBC hardware.',
            technical_decisions:
              'Adopted 8-bit integer tensor representations.',
            trade_offs: '0.2% drop in accuracy for a 3.4x speedup.',
            outcomes_summary: 'Sub-15ms latency achieved reliably.',
            lessons_learned:
              'Memory bandwidth dominates computation cost on edge NPUs.',
          },
        },
      },
    })

    expect(html).toContain('Edge Inference Optimizer')
    expect(html).toContain(
      'Integer quantization using symmetric channel-wise scale factors.',
    )
    expect(html).toContain('Case study')
    expect(html).toContain(
      'Latency was exceeding the 20ms real-time constraint.',
    )
    expect(html).toContain('Sub-15ms latency achieved reliably.')
  })

  it('renders projects page ready view with project list', async () => {
    const html = await render(ProjectsPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        projects: [
          {
            locale: 'en',
            slug: 'autonomous-robotics-platform',
            title: 'Autonomous Robotics Platform',
            objective:
              'End-to-end robotics control and verification architecture.',
            project_type: 'Robotics',
            published_at: '2025-12-31T00:00:00Z',
            code_availability: 'open',
            demo_availability: 'live',
            data_availability: 'open',
          },
        ],
      },
    })

    expect(html).toContain('Autonomous Robotics Platform')
    expect(html).toContain('/en/projects/autonomous-robotics-platform')
  })

  it('renders Persian project detail with RTL labels', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        project: {
          locale: 'fa',
          slug: 'persian-ai-platform',
          title: 'سامانه هوش مصنوعی فارسی',
          objective: 'زیرساخت پردازش زبان طبیعی و گفتار.',
          project_type: 'هوش مصنوعی',
          role: 'طراح ارشد',
          start_date: '۱۴۰۴-۰۱-۰۱',
          end_date: null,
          license: 'MIT',
          code_availability: 'open',
          data_availability: 'open',
          demo_availability: 'live',
          methods_summary: 'معماری توزیع‌شده با کارایی بالا.',
          code_url: null,
          data_url: null,
          demo_url: null,
          published_at: '2025-12-01T00:00:00Z',
          updated_at: null,
        },
      },
    })

    expect(html).toContain('سامانه هوش مصنوعی فارسی')
    expect(html).toContain('طراح ارشد')
    expect(html).toContain('روش‌ها')
    expect(html).toContain('← بازگشت به پروژه‌ها')
  })
})
