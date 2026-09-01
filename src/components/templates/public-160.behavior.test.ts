import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import AboutContactUtilityTemplate from './AboutContactUtilityTemplate.astro'
import CollectionIndexTemplate from './CollectionIndexTemplate.astro'
import EditorialIndexTemplate from './EditorialIndexTemplate.astro'
import EvidenceVisualDetailTemplate from './EvidenceVisualDetailTemplate.astro'
import HomeTemplate from './HomeTemplate.astro'
import LongFormDetailTemplate from './LongFormDetailTemplate.astro'
import { templateNames } from './index.ts'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

function readTemplateSource(name: string) {
  const relativePath = `src/components/templates/${name}.astro`
  const absolutePath = path.join(repositoryRoot, relativePath)
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true)
  return readFileSync(absolutePath, 'utf8')
}

async function renderTemplate(
  component: Parameters<
    Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
  >[0],
  slots: Record<string, string>,
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, {
    slots: Object.fromEntries(
      Object.entries(slots).map(([name, value]) => [name, value]),
    ),
  })
}

describe('PUBLIC-160 behavior', () => {
  it('registers all six template names from the pinned authority', () => {
    expect(templateNames).toHaveLength(6)
    for (const name of templateNames) {
      expect(
        existsSync(
          path.join(
            repositoryRoot,
            'src',
            'components',
            'templates',
            `${name}.astro`,
          ),
        ),
      ).toBe(true)
    }
  })

  it('keeps exactly one H1 responsibility in a designated lead slot per template', () => {
    for (const name of templateNames) {
      const source = readTemplateSource(name)
      expect(source, `${name} must expose a stable data-visual-id`).toMatch(
        /data-visual-id=/,
      )
      expect(source, `${name} must not hardcode an H1`).not.toMatch(/<h1[\s>]/)
      expect(
        source,
        `${name} must delegate H1 ownership to a lead region`,
      ).toMatch(/h1-region|identity-lead/)
    }
  })

  it('renders HomeTemplate with required and optional slots without placeholder content', async () => {
    const html = await renderTemplate(HomeTemplate, {
      header: '<div data-test="header">Header</div>',
      'identity-lead': '<h1>Identity lead</h1>',
      'relationship-graph': '<ul><li>Graph node</li></ul>',
      footer: '<div data-test="footer">Footer</div>',
    })

    expect(html).toMatch(/data-visual-id="HomeTemplate"/)
    expect(html).toMatch(/<h1>Identity lead<\/h1>/)
    expect(html).toMatch(/Graph node/)
    expect(html).not.toMatch(/placeholder/i)
  })

  it('renders collection and editorial index templates with lead, records, and pagination slots', async () => {
    const collectionHtml = await renderTemplate(CollectionIndexTemplate, {
      header: '<div>Header</div>',
      breadcrumbs: '<nav>Breadcrumbs</nav>',
      lead: '<h1>Projects</h1>',
      filters: '<form>Filters</form>',
      records: '<ul><li>Record</li></ul>',
      pagination: '<nav>Pagination</nav>',
      footer: '<div>Footer</div>',
    })
    expect(collectionHtml).toMatch(/data-visual-id="CollectionIndexTemplate"/)
    expect(collectionHtml).toMatch(/<h1>Projects<\/h1>/)

    const editorialHtml = await renderTemplate(EditorialIndexTemplate, {
      header: '<div>Header</div>',
      breadcrumbs: '<nav>Breadcrumbs</nav>',
      lead: '<h1>Writing</h1>',
      featured: '<article>Featured</article>',
      filters: '<form>Filters</form>',
      records: '<ul><li>Essay</li></ul>',
      pagination: '<nav>Pagination</nav>',
      footer: '<div>Footer</div>',
    })
    expect(editorialHtml).toMatch(/data-visual-id="EditorialIndexTemplate"/)
    expect(editorialHtml).toMatch(/Featured/)
  })

  it('renders detail templates with lead, body or media, and related slots', async () => {
    const longFormHtml = await renderTemplate(LongFormDetailTemplate, {
      header: '<div>Header</div>',
      breadcrumbs: '<nav>Breadcrumbs</nav>',
      lead: '<h1>Article title</h1>',
      toc: '<nav>TOC</nav>',
      body: '<p>Body copy</p>',
      related: '<ul><li>Related</li></ul>',
      footer: '<div>Footer</div>',
    })
    expect(longFormHtml).toMatch(/data-visual-id="LongFormDetailTemplate"/)
    expect(longFormHtml).toMatch(/Body copy/)

    const evidenceHtml = await renderTemplate(EvidenceVisualDetailTemplate, {
      header: '<div>Header</div>',
      breadcrumbs: '<nav>Breadcrumbs</nav>',
      lead: '<h1>Evidence title</h1>',
      metadata: '<dl>Metadata</dl>',
      'media-body': '<figure>Media</figure>',
      limitations: '<p>Rights note</p>',
      related: '<ul><li>Related</li></ul>',
      footer: '<div>Footer</div>',
    })
    expect(evidenceHtml).toMatch(
      /data-visual-id="EvidenceVisualDetailTemplate"/,
    )
    expect(evidenceHtml).toMatch(/Rights note/)
  })

  it('renders AboutContactUtilityTemplate with typed record slots', async () => {
    const html = await renderTemplate(AboutContactUtilityTemplate, {
      header: '<div>Header</div>',
      breadcrumbs: '<nav>Breadcrumbs</nav>',
      lead: '<h1>Contact</h1>',
      records: '<form>Contact path</form>',
      footer: '<div>Footer</div>',
    })

    expect(html).toMatch(/data-visual-id="AboutContactUtilityTemplate"/)
    expect(html).toMatch(/Contact path/)
  })
})
