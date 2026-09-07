import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { components } from '../../generated/public-api'
import { fetchLessonDetail } from '../../lib/lessons-content'
import LessonDetailContent from './LessonDetailContent.astro'

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

describe('PU-15 Lessons Product Family', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  it('renders the public loader output with real WorkRef resources and neighbors', async () => {
    vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test')
    const resource: components['schemas']['WorkRefOut'] = {
      family: 'download',
      id: '5',
      locale: 'en',
      routeFamily: 'resources',
      slug: 'lecture-notes',
      title: 'Lecture notes',
      summary: 'Published notes',
    }
    const lesson: components['schemas']['LessonDetailOut'] = {
      locale: 'en',
      courseSlug: 'course',
      slug: 'lesson',
      title: 'Published lesson',
      summary: '',
      position: 0,
      resources: [resource],
      next: {
        ...resource,
        family: 'lesson',
        routeFamily: 'education',
        courseSlug: 'course',
        slug: 'next-lesson',
        title: 'Next lesson',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(lesson))),
    )
    const html = await render(LessonDetailContent, {
      locale: 'en',
      model: await fetchLessonDetail('en', 'course', 'lesson'),
    })
    expect(html).toContain('href="/en/resources/lecture-notes/"')
    expect(html).toContain('Published notes')
    expect(html).toContain('href="/en/education/course/lessons/next-lesson/"')
  })
  it('renders CMS story document when story is present on lesson', async () => {
    const html = await render(LessonDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        lesson: {
          locale: 'en',
          slug: 'raft-consensus-mechanisms',
          title: 'Raft Consensus Mechanisms',
          summary:
            'Detailed look at leader election, log replication, and safety guarantees.',
          courseSlug: 'distributed-systems-engineering',
          position: 2,
          resources: [
            {
              title:
                'In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)',
              family: 'download',
              id: '10',
              locale: 'en',
              routeFamily: 'resources',
              slug: 'raft-paper',
              summary: 'Primary research paper for the Raft protocol.',
            },
          ],
          previous: {
            family: 'lesson',
            id: '1',
            locale: 'en',
            routeFamily: 'education',
            slug: 'paxos-fundamentals',
            title: 'Paxos Fundamentals',
            courseSlug: 'distributed-systems-engineering',
            position: 1,
          },
          next: {
            family: 'lesson',
            id: '3',
            locale: 'en',
            routeFamily: 'education',
            slug: 'byzantine-fault-tolerance',
            title: 'Byzantine Fault Tolerance',
            courseSlug: 'distributed-systems-engineering',
            position: 3,
          },
          story: {
            locale: 'en',
            title: 'Raft Lesson Story',
            sections: [
              {
                layout: '1col',
                blocks: [
                  {
                    blockType: 'heading',
                    settings: {
                      text: 'Leader Election Protocol',
                      level: 2,
                      id: 'leader-election',
                    },
                  },
                  {
                    blockType: 'text',
                    settings: {
                      body: '<p>Heartbeats, randomized election timeouts, and split-vote mitigation.</p>',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(html).toContain('Leader Election Protocol')
    expect(html).toContain('Heartbeats, randomized election timeouts')
    expect(html).toContain('Raft Consensus Mechanisms')
    expect(html).toContain('Lesson 3')
    expect(html).toContain('Paxos Fundamentals')
    expect(html).toContain('Byzantine Fault Tolerance')
    expect(html).toContain('In Search of an Understandable Consensus Algorithm')
    expect(html).toContain('/en/education/distributed-systems-engineering')
  })

  it('renders fallback summary when story is absent', async () => {
    const html = await render(LessonDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        lesson: {
          locale: 'en',
          slug: 'intro-to-clock-synchronization',
          title: 'Introduction to Clock Synchronization',
          summary:
            'Lamport timestamps and vector clocks in asynchronous networks.',
          courseSlug: 'distributed-systems-engineering',
          position: 0,
          resources: [],
          previous: null,
          next: null,
          story: null,
        },
      },
    })

    expect(html).toContain('Introduction to Clock Synchronization')
    expect(html).toContain(
      'Lamport timestamps and vector clocks in asynchronous networks.',
    )
    expect(html).toContain('Lesson 1')
  })

  it('renders Persian lesson with proper RTL labels', async () => {
    const html = await render(LessonDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        lesson: {
          locale: 'fa',
          slug: 'raft-consensus-fa',
          title: 'مکانیزم‌های اجماع رفت (Raft)',
          summary: 'بررسی انتخاب رهبر، همانندسازی وقایع و تضمین‌های پایداری.',
          courseSlug: 'distributed-systems-fa',
          position: 1,
          resources: [],
          previous: null,
          next: null,
          story: null,
        },
      },
    })

    expect(html).toContain('مکانیزم‌های اجماع رفت (Raft)')
    expect(html).toContain('درس ۲')
    expect(html).toContain('← دوره والد')
    expect(html).toContain('← بازگشت به صفحه دوره')
  })
})
