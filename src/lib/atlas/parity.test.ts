import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import AtlasPageContent from '../../components/atlas/AtlasPageContent.astro'
import type { AtlasPayload } from './model'
import { project2d } from './projection-2d'
import { buildAtlasIndexModel, type AtlasSnapshot } from './snapshot'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')
const stylesDir = join(here, '..', '..', 'styles')

function readFixture(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

function nodeGeometry(payload: AtlasPayload) {
  const projection = project2d(payload, {
    mode: 'mobile-overview',
    viewport: { width: 390, height: 520 },
  })
  return new Map(
    projection.nodes.map((node) => [
      node.key,
      { cx: node.cx, cy: node.cy, r: node.r },
    ]),
  )
}

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function renderPage(props: Record<string, unknown>) {
  const container = await AstroContainer.create()
  return container.renderToString(AtlasPageContent as Component, { props })
}

function readySnapshot(payload: AtlasPayload): AtlasSnapshot {
  return {
    status: 'ready',
    payload,
    etag: '"task-21"',
    html: buildAtlasIndexModel(payload),
  }
}

describe('Atlas EN/FA parity and accessibility (Task 21)', () => {
  it('projects identical geometry for both locales', () => {
    const en = readFixture('en.json')
    const fa = readFixture('fa.json')
    expect(nodeGeometry(en)).toEqual(nodeGeometry(fa))
    expect(en.nodes.map((node) => node.label)).not.toEqual(
      fa.nodes.map((node) => node.label),
    )
    expect(en.nodeTypes[0].label).not.toBe(fa.nodeTypes[0].label)
  })

  it('keeps the canvas and the SVG out of the accessibility tree and the tab order', async () => {
    const payload = readFixture('en.json')
    const html = await renderPage({
      locale: 'en',
      snapshot: readySnapshot(payload),
    })

    expect(html).toMatch(
      /<svg[^>]*class="atlas-projection"[^>]*aria-hidden="true"/,
    )
    expect(html).toMatch(
      /<svg[^>]*class="atlas-projection"[^>]*focusable="false"/,
    )
    expect(html).not.toMatch(/class="atlas-projection__node"[^>]*tabindex=/i)
    expect(html).not.toMatch(/class="atlas-projection__node"[^>]*role="button"/i)

    const canvasMatches = html.match(/<canvas[^>]*data-atlas-canvas[^>]*>/g)
    expect(canvasMatches ?? []).toHaveLength(0)
  })

  it('documents keyboard-path contracts: status target, index without JS, focus styles', async () => {
    const payload = readFixture('en.json')
    const html = await renderPage({
      locale: 'en',
      snapshot: readySnapshot(payload),
    })

    expect(html).toMatch(/data-atlas-announcement/)
    expect(html).toMatch(/aria-live="polite"/)
    expect(html).toMatch(/role="status"/)

    const nodeItems =
      html.match(/<li class="atlas-index__node" data-atlas-node="/g) ?? []
    expect(nodeItems).toHaveLength(payload.nodes.length)
    expect(html).not.toMatch(/<script[^>]*required/i)

    const atlasCss = readFileSync(join(stylesDir, 'atlas.css'), 'utf8')
    expect(atlasCss).toMatch(/:focus-visible/)
    expect(atlasCss).not.toMatch(/\bmargin-left\b/)
    expect(atlasCss).not.toMatch(/\bmargin-right\b/)
    expect(atlasCss).not.toMatch(/\bpadding-left\b/)
    expect(atlasCss).not.toMatch(/\bpadding-right\b/)
  })
})
