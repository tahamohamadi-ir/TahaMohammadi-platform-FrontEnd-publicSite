import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from '../../lib/atlas/model'
import {
  buildAtlasIndexModel,
  type AtlasSnapshot,
} from '../../lib/atlas/snapshot'
import AboutAtlasPreview from './AboutAtlasPreview.astro'
import AboutPageContent from './AboutPageContent.astro'

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

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

function readySnapshot(payload: AtlasPayload): AtlasSnapshot {
  return {
    status: 'ready',
    payload,
    etag: '"about-preview"',
    html: buildAtlasIndexModel(payload),
  }
}

const readyProfile = {
  status: 'ready' as const,
  profile: {
    locale: 'en' as const,
    slug: 'about',
    title: 'About Taha Mohammadi',
    excerpt: 'Researcher and software engineer.',
    body: 'First biographical paragraph.',
    published_at: '2026-01-01T00:00:00Z',
  },
}

describe('AboutAtlasPreview (Plan D Phase 1)', () => {
  it('renders about-preview projection and CTA when snapshot is ready', async () => {
    const html = await render(AboutAtlasPreview, {
      locale: 'en',
      snapshot: readySnapshot(readPayload('en.json')),
    })

    expect(html).toContain('data-about-atlas')
    expect(html).toContain('data-atlas-status="ready"')
    expect(html).toContain('data-atlas-projection="about-preview"')
    expect(html).toMatch(/href="\/en\/atlas\/"/)
    expect(html).not.toContain('data-universe-mode="about"')
    expect(html).not.toContain('data-atlas-inspector')
  })

  it('renders honest unavailable state without inventing nodes', async () => {
    const html = await render(AboutAtlasPreview, {
      locale: 'fa',
      snapshot: { status: 'unavailable' },
    })

    expect(html).toContain('data-about-atlas')
    expect(html).toContain('data-atlas-status="unavailable"')
    expect(html).not.toContain('data-atlas-projection=')
    expect(html).not.toContain('data-atlas-node=')
    expect(html).toMatch(/href="\/fa\/atlas\/"/)
  })

  it('AboutPageContent uses Atlas preview instead of Research Universe', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: readyProfile,
      atlasSnapshot: readySnapshot(readPayload('en.json')),
    })

    expect(html).toContain('data-about-atlas')
    expect(html).toContain('data-atlas-projection="about-preview"')
    expect(html).not.toContain('data-universe-mode="about"')
    expect(html).not.toContain('Research Universe')
  })

  it('keeps Atlas preview on unavailable About chrome', async () => {
    const html = await render(AboutPageContent, {
      locale: 'en',
      model: { status: 'unavailable' },
      atlasSnapshot: readySnapshot(readPayload('en.json')),
    })

    expect(html).toContain('data-about-atlas')
    expect(html).toContain('data-atlas-projection="about-preview"')
  })
})

/**
 * The About preview carried the same production defect as /atlas/: the build
 * embeds `unavailable` when PUBLIC_API_BASE_URL is empty, and nothing ever
 * recovered it, so /en/about/ showed "Atlas unavailable" beside a perfectly
 * valid knowledge map. These cases pin the recovery seam.
 */
describe('AboutAtlasPreview runtime recovery seam', () => {
  it('marks a non-ready About region as revalidatable', async () => {
    const html = await render(AboutAtlasPreview, {
      locale: 'en',
      snapshot: { status: 'unavailable' },
    })

    // The recovery script only runs where the region is present and the
    // locale is known; without both, a client fetch would be guesswork.
    expect(html).toContain('data-atlas-revalidation-target')
    expect(html).toContain('data-about-atlas-body')
    expect(html).toContain('data-atlas-locale="en"')
  })

  it('does not revalidate a ready About preview', async () => {
    const html = await render(AboutAtlasPreview, {
      locale: 'en',
      snapshot: readySnapshot(readPayload('en.json')),
    })

    // Already authoritative: a fetch here would be a wasted request and a
    // chance to regress a page that is already correct.
    expect(html).not.toContain('data-atlas-revalidation-target')
  })

  it('keeps the honest state in the no-JS server render', async () => {
    const html = await render(AboutAtlasPreview, {
      locale: 'fa',
      snapshot: { status: 'unavailable' },
    })

    // The honest Persian state must survive in the served HTML, because a
    // visitor with JavaScript disabled sees exactly this.
    expect(html).toContain('اطلس در دسترس نیست')
    expect(html).not.toContain('data-atlas-node=')
  })
})
