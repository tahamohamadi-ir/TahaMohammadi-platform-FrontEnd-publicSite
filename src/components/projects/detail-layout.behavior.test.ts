import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ProjectDetailContent from './ProjectDetailContent.astro'
import ResearchTopicDetailContent from '../research/ResearchTopicDetailContent.astro'

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(component: Component, props: Record<string, unknown>) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

const baseProject = {
  locale: 'en',
  slug: 'pars-sql',
  title: 'PARS-SQL',
  objective: 'Objective.',
  project_type: 'ai',
  code_availability: 'public',
  data_availability: 'not_available',
  demo_availability: 'not_available',
  published_at: '2026-01-01T00:00:00Z',
  updated_at: null,
}

describe('project detail layout', () => {
  it('shows chips, facts and only the action buttons that have a real url', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: {
          ...baseProject,
          role: 'Lead engineer',
          start_date: '2024',
          end_date: '2025',
          license: 'MIT',
          code_url: 'https://example.com/code',
          demo_url: null,
          data_url: '',
        },
      },
    })
    expect(html).toContain('detail-chip')
    expect(html).toContain('Lead engineer')
    expect(html).toContain('2024 – 2025')
    expect(html).toContain('MIT')
    expect(html).toMatch(/href="https:\/\/example.com\/code"/)
    expect(html).not.toContain('>Demo<')
    expect(html).not.toContain('>Data<')
  })

  it('numbers the case study as steps and outlines it when there are two or more sections', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: {
          ...baseProject,
          methods_summary: 'How it works.',
          case_study: {
            problem: 'The problem.',
            constraints: '',
            technical_decisions: 'The decisions.',
            trade_offs: null,
            outcomes_summary: 'The outcomes.',
            lessons_learned: null,
          },
        },
      },
    })
    expect(html).toContain('class="reading-toc"')
    for (const id of ['project-methods', 'project-case-study', 'problem'])
      expect(html).toContain(`href="#${id}"`)
    expect(html).toContain('href="#technical-decisions"')
    expect(html).not.toContain('href="#constraints"')
    expect(html.match(/class="detail-steps__item"/g)).toHaveLength(3)
  })

  it('leaves out the outline for a single section', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: { ...baseProject, methods_summary: 'Only methods.' },
      },
    })
    expect(html).not.toContain('reading-toc')
    expect(html).toContain('id="project-methods"')
  })

  it('renders related topics and outputs as cards with locale-correct links', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'fa',
      model: {
        status: 'ready',
        project: {
          ...baseProject,
          topics: [{ slug: 'topic-a', title: 'موضوع الف' }],
          publications: [{ slug: 'paper-b', title: 'مقاله ب' }],
        },
      },
    })
    expect(html).toContain('href="/fa/research/topic-a/"')
    expect(html).toContain('href="/fa/publications/paper-b/"')
    expect(html.match(/class="detail-card"/g)).toHaveLength(2)
  })
})

describe('research topic detail layout', () => {
  it('outlines the filled sections and skips the empty ones', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'en',
          slug: 'topic',
          title: 'Topic',
          summary: 'Summary.',
          motivation: 'Why.',
          problems: '',
          research_questions: 'What?',
          methods: 'How.',
          future_directions: null,
          projects: [{ slug: 'proj', title: 'Project' }],
        },
      },
    })
    expect(html).toContain('class="reading-toc"')
    for (const id of ['motivation', 'research-questions', 'methods'])
      expect(html).toContain(`href="#${id}"`)
    expect(html).not.toContain('href="#problems"')
    expect(html).toContain('href="/en/projects/proj/"')
    expect(html).toContain('class="detail-card"')
  })

  it('keeps a topic with one section free of an outline', async () => {
    const html = await render(ResearchTopicDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        kind: 'topic',
        record: {
          locale: 'en',
          slug: 'topic',
          title: 'Topic',
          summary: 'Summary.',
          motivation: 'Why.',
        },
      },
    })
    expect(html).not.toContain('reading-toc')
  })
})
