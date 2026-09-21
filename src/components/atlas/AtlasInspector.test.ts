import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import AtlasPageContent from './AtlasPageContent.astro'
import {
  buildAtlasIndexModel,
  type AtlasSnapshot,
} from '../../lib/atlas/snapshot'
import { filterOptions } from '../../lib/atlas/filters'
import type { AtlasPayload } from '../../lib/atlas/model'

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
const cssPath = join(here, '..', '..', 'styles', 'atlas.css')

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

function readySnapshot(payload: AtlasPayload): AtlasSnapshot {
  return {
    status: 'ready',
    payload,
    etag: '"bench-etag"',
    html: buildAtlasIndexModel(payload),
  }
}

describe('Atlas inspector + controls (Plan C Task 14)', () => {
  it('renders an inspector block for every node and relation', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    for (const node of payload.nodes) {
      expect(html).toContain(`data-atlas-inspector-block="node:${node.key}"`)
    }
    for (const relation of payload.relations) {
      expect(html).toContain(
        `data-atlas-inspector-block="relation:${relation.key}"`,
      )
    }
  })

  it('shows the prompt with every block hidden when nothing is selected', async () => {
    const payload = readPayload('en.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    expect(html).toContain('data-atlas-inspector-prompt')
    expect(html).toContain('role="status"')
    const total = (html.match(/data-atlas-inspector-block="/g) ?? []).length
    expect(total).toBeGreaterThan(0)
    const hidden =
      html.match(/data-atlas-inspector-block="[^"]+"[^>]*hidden/g) ?? []
    expect(hidden).toHaveLength(total)
  })

  it('renders one native filter chip per filter option and never the anchor', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    const expected = filterOptions(payload)
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.find((o) => o.key === 'identity')).toBeUndefined()
    for (const option of expected) {
      expect(html).toContain(`data-atlas-filter="${option.key}"`)
    }
    const chips = html.match(/data-atlas-filter="(?!all")[^"]+"/g) ?? []
    expect(chips).toHaveLength(expected.length)
  })

  it('renders every control as a button or input with an accessible name', async () => {
    const payload = readPayload('en.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    for (const name of [
      'Zoom in',
      'Zoom out',
      'Focus',
      'Reset',
      'Clear',
      'Back to overview',
    ]) {
      expect(html).toContain(`>${name}</button>`)
    }
    expect(html).toContain('type="search"')
    expect(html).toContain('data-atlas-search')
  })

  it('guarantees 44px minimum targets through the stylesheet contract', () => {
    const css = readFileSync(cssPath, 'utf8')
    expect(css).toMatch(/min-height:\s*44px/)
    expect(css).toMatch(/min-width:\s*44px/)
  })
})
