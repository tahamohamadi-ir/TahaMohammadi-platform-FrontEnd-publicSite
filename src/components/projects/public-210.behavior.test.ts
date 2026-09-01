import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import ProjectsPageContent from './ProjectsPageContent.astro';
import ProjectDetailContent from './ProjectDetailContent.astro';

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0];

async function render(component: Component, props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

describe('PUBLIC-210 projects pages', () => {
  it('renders unavailable ContentState on the projects index', async () => {
    const html = await render(ProjectsPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
    });
    expect(html).toMatch(/data-state-variant="unavailable"/);
    expect(html).toContain('Projects');
    expect(html).toMatch(/<h1[\s>]/);
  });

  it('renders project cards when the index model is ready', async () => {
    const html = await render(ProjectsPageContent, {
      locale: 'en',
      model: {
        status: 'ready',
        projects: [
          {
            locale: 'en',
            slug: 'pars-sql-vtd-edge',
            title: 'PARS SQL / VTD Edge',
            objective: 'Data architecture case study.',
            project_type: 'Research system',
            code_availability: 'Open source',
            data_availability: 'Restricted',
            demo_availability: 'Unavailable',
            license: 'MIT',
            has_case_study: true,
            published_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    });
    expect(html).toContain('PARS SQL / VTD Edge');
    expect(html).toMatch(/href="\/en\/projects\/pars-sql-vtd-edge\/"/);
  });

  it('renders project detail sections when ready', async () => {
    const html = await render(ProjectDetailContent, {
      locale: 'en',
      model: {
        status: 'ready',
        project: {
          locale: 'en',
          slug: 'pars-sql-vtd-edge',
          title: 'PARS SQL / VTD Edge',
          objective: 'Objective summary.',
          role: 'Lead engineer',
          methods_summary: 'Methods paragraph.',
          project_type: 'Research system',
          code_availability: 'Open source',
          data_availability: 'Restricted',
          demo_availability: 'Unavailable',
          code_url: 'https://example.com/code',
          data_url: '',
          demo_url: '',
          license: 'MIT',
          has_case_study: false,
          start_date: '2024-01-01',
          end_date: null,
          published_at: '2026-01-01T00:00:00Z',
          updated_at: null,
        },
      },
    });
    expect(html).toContain('PARS SQL / VTD Edge');
    expect(html).toContain('Methods paragraph.');
    expect(html).toMatch(/href="https:\/\/example.com\/code"/);
  });
});
