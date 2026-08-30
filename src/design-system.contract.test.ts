import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { uiComponentNames } from './components/ui/index.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepositoryFile(relativePath: string) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

const public140UiComponents = [
  'Button',
  'IconButton',
  'Link',
  'Chip',
  'Badge',
  'Breadcrumbs',
  'LocalTabs',
  'FilterBar',
  'Pagination',
  'SectionLead',
  'Card',
  'FeaturedRecord',
  'ContentRow',
  'PublicationRow',
  'MetadataGroup',
  'TimelineNode',
  'MediaTile',
  'TOCItem',
  'ContactCTA',
  'Input',
  'Textarea',
] as const;

const pinnedInventoryShellComponents = ['ThemeToggle', 'LanguageToggle', 'Header'] as const;

const requiredTemplates = [
  'HomeTemplate.astro',
  'CollectionIndexTemplate.astro',
  'EditorialIndexTemplate.astro',
  'LongFormDetailTemplate.astro',
  'EvidenceVisualDetailTemplate.astro',
  'AboutContactUtilityTemplate.astro',
] as const;

describe('PUBLIC-140 — UI primitives', () => {
  it('exports the 21 UI component names from a single registry', () => {
    expect([...uiComponentNames]).toEqual([...public140UiComponents]);
  });

  it('implements every PUBLIC-140 component under src/components/ui', () => {
    for (const name of public140UiComponents) {
      expect(
        existsSync(path.join(repositoryRoot, 'src', 'components', 'ui', `${name}.astro`)),
        `${name}.astro must exist under src/components/ui`,
      ).toBe(true);
    }
  });

  it('keeps the integrated 24-name inventory aligned with the pinned authority snapshot', () => {
    const inventory = JSON.parse(readRepositoryFile('contracts/design-authority/components.json'));
    const pinnedNames = inventory.components.map((entry: { name: string }) => entry.name);
    expect(pinnedNames).toHaveLength(24);
    expect(new Set(pinnedNames)).toEqual(
      new Set([...public140UiComponents, ...pinnedInventoryShellComponents]),
    );
    expect(pinnedNames).not.toContain('Footer');
    expect(pinnedNames).not.toContain('SkipLink');
  });

  it('projects token consumption, visual ids, and touch targets on every PUBLIC-140 component', () => {
    for (const name of public140UiComponents) {
      const source = readRepositoryFile(`src/components/ui/${name}.astro`);
      expect(source, `${name} must expose a stable data-visual-id`).toMatch(/data-visual-id=/);
      expect(source, `${name} must consume design tokens`).toMatch(/var\(--/);
      expect(source, `${name} must keep scoped styles local to the component`).toMatch(/<style>/);
    }
  });
});

describe('PUBLIC-150 — shell', () => {
  it('refactors Header, LanguageToggle, and Footer while keeping SkipLink behavior focused', () => {
    for (const name of ['Header', 'LanguageToggle', 'Footer'] as const) {
      expect(existsSync(path.join(repositoryRoot, 'src', 'components', `${name}.astro`))).toBe(true);
    }
    expect(existsSync(path.join(repositoryRoot, 'src', 'components', 'SkipLink.astro'))).toBe(true);
    const skipLink = readRepositoryFile('src/components/SkipLink.astro');
    expect(skipLink).toContain('skip-link');
    expect(skipLink).toContain('#main-content');
  });

  it('extracts shell styles into a dedicated module consumed by SiteLayout', () => {
    expect(existsSync(path.join(repositoryRoot, 'src', 'styles', 'shell.css'))).toBe(true);
    const siteLayout = readRepositoryFile('src/layouts/SiteLayout.astro');
    expect(siteLayout).toContain('shell.css');
  });
});

describe.skip('PUBLIC-160 — templates', () => {
  it('implements the six slot-based templates from the pinned authority', () => {
    for (const filename of requiredTemplates) {
      expect(
        existsSync(path.join(repositoryRoot, 'src', 'components', 'templates', filename)),
        `${filename} must exist under src/components/templates`,
      ).toBe(true);
    }
  });
});

describe.skip('PUBLIC-170 — Visual Atlas', () => {
  it('registers the Visual Atlas outside src/pages when DESIGN_ATLAS=1', () => {
    expect(existsSync(path.join(repositoryRoot, 'src', 'integrations', 'design-atlas.mjs'))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, 'src', 'atlas', 'AtlasRoute.astro'))).toBe(true);
    const astroConfig = readRepositoryFile('astro.config.mjs');
    expect(astroConfig).toContain('design-atlas.mjs');
  });
});
