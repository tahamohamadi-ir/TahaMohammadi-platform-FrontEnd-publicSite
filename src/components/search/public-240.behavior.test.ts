import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import SearchPageContent from './SearchPageContent.astro';

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0];

async function render(component: Component, props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

describe('PUBLIC-240 search page', () => {
  it('renders a GET search form and noscript unavailable guidance', async () => {
    const html = await render(SearchPageContent, { locale: 'en' });
    expect(html).toContain('Search');
    expect(html).toMatch(/method="get"/);
    expect(html).toMatch(/action="\/en\/search\/"/);
    expect(html).toMatch(/name="q"/);
    expect(html).toMatch(/<noscript>/);
    expect(html).toMatch(/data-pagefind-ignore/);
  });

  it('initializes the locale-specific Pagefind bundle path in the client script', async () => {
    const html = await render(SearchPageContent, { locale: 'fa' });
    expect(html).toContain('/pagefind/fa');
    expect(html).toMatch(/data-search-form/);
  });
});
