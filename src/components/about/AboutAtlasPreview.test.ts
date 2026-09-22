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
