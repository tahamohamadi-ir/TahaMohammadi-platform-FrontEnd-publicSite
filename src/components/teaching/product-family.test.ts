import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import TeachingDetailContent from './TeachingDetailContent.astro'
import TeachingPageContent from './TeachingPageContent.astro'

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

describe('PU-15 Courses Product Family', () => {
  it('renders CMS story document when story is present on course', async () => {
    const html = await render(TeachingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'course',
        record: {
          locale: 'en',
          slug: 'distributed-systems-engineering',
          title: 'Distributed Systems Engineering',
          description:
            'A comprehensive graduate course in distributed architectures.',
          level: 'Advanced',
          course_format: 'Hybrid',
          course_language: 'en',
          availability: 'Open',
          last_updated: '2026-03-01',
          license: 'CC-BY-4.0',
          prerequisites: 'Operating systems and networking fundamentals.',
          outcomes: 'Design fault-tolerant replicated services.',
          body: null,
          lessons: [],
          published_at: '2026-02-01T00:00:00Z',
          story: {
            locale: 'en',
            title: 'Course Story Plan',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Course Curriculum Blueprint',
                      level: 2,
                      id: 'curriculum-blueprint',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Deep dive into Raft, Byzantine fault tolerance, and event-driven architectures.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Course Curriculum Blueprint')
    expect(html).toContain('Deep dive into Raft')
    expect(html).toContain('Distributed Systems Engineering')
    expect(html).toContain('Advanced')
  })

  it('renders fallback body HTML when story is absent on course', async () => {
    const html = await render(TeachingDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'course',
        record: {
          locale: 'en',
          slug: 'intro-to-algorithms',
          title: 'Introduction to Algorithms',
          description: 'Fundamental algorithms and data structures.',
          level: 'Beginner',
          course_format: 'Online',
          course_language: 'en',
          availability: 'Archived',
          last_updated: '2026-01-01',
          license: 'MIT',
          prerequisites: null,
          outcomes: null,
          body: '<p>Core sorting, graph search, and dynamic programming.</p>',
          lessons: [],
          published_at: '2026-01-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('Introduction to Algorithms')
    expect(html).toContain(
      'Core sorting, graph search, and dynamic programming.',
    )
  })

  it('renders teaching page ready view with courses and talks', async () => {
    const html = await render(TeachingPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        courses: [
          {
            locale: 'en',
            slug: 'distributed-systems-engineering',
            title: 'Distributed Systems Engineering',
            description: 'Advanced distributed computing.',
            level: 'Advanced',
            course_format: 'Hybrid',
            course_language: 'en',
            availability: 'Open',
            lesson_count: 12,
            published_at: '2026-02-01T00:00:00Z',
          },
        ],
        talks: [],
      },
    })

    expect(html).toContain('Distributed Systems Engineering')
  })

  it('renders Persian course detail with proper RTL labels', async () => {
    const html = await render(TeachingDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        kind: 'course',
        record: {
          locale: 'fa',
          slug: 'advanced-databases',
          title: 'پایگاه‌های داده پیشرفته',
          description: 'مفاهیم پردازش تراکنش و پایگاه‌های داده توزیع‌شده.',
          level: 'پیشرفته',
          course_format: 'حضوری',
          course_language: 'fa',
          availability: 'درحال برگزاری',
          last_updated: '۱۴۰۴-۱۲-۰۱',
          license: 'CC-BY-4.0',
          prerequisites: 'مبانی پایگاه داده و سیستم‌های عامل.',
          outcomes: 'طراحی موتورهای ذخیره‌سازی مقیاس‌پذیر.',
          body: '<p>بررسی موتورهای مبتنی بر درخت LSM و B-Tree.</p>',
          lessons: [],
          published_at: '2026-02-01T00:00:00Z',
        },
      },
    })

    expect(html).toContain('پایگاه‌های داده پیشرفته')
    expect(html).toContain('پیش‌نیازها')
    expect(html).toContain('دستاوردها')
    expect(html).toContain('← بازگشت به آموزش')
  })
})
