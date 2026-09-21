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

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

function readySnapshot(
  payload: AtlasPayload,
  etag = '"bench-etag"',
): AtlasSnapshot {
  return {
    status: 'ready',
    payload,
    etag,
    html: buildAtlasIndexModel(payload),
  }
}

describe('AtlasPageContent (Plan C Task 6)', () => {
  it('renders one list item per node with its canonical href', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    expect(html).toContain('data-atlas-region')
    expect(html).toContain('data-atlas-status="ready"')
    const nodeItems =
      html.match(/<li class="atlas-index__node" data-atlas-node="[^"]+"/g) ?? []
    expect(nodeItems).toHaveLength(payload.nodes.length)
    for (const node of payload.nodes) {
      if (node.canonical?.href)
        expect(html).toContain(`href="${node.canonical.href}"`)
    }
  })

  it('renders one relation item per relation with resolved endpoint labels', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    const relationItems = html.match(/data-atlas-relation="[^"]+"/g) ?? []
    expect(relationItems).toHaveLength(payload.relations.length)
    const labelByKey = new Map(
      payload.nodes.map((n) => [n.key, n.label ?? n.key]),
    )
    const first = payload.relations[0]
    const escaped = (s: string) => s.replace(/&/g, '&amp;')
    expect(html).toContain(escaped(labelByKey.get(first.source) as string))
    expect(html).toContain(escaped(labelByKey.get(first.target) as string))
  })

  it('renders a group section per group and escapes the payload script', async () => {
    const payload = readPayload('benchmark.json')
    const evil = {
      ...payload,
      nodes: [{ ...payload.nodes[0], label: 'Evil </script><script>' }],
    }
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(evil),
    })
    const groupSections = html.match(/data-atlas-group="[^"]+"/g) ?? []
    expect(groupSections).toHaveLength(payload.groups.length)
    expect(html).not.toContain('</script><script>')
    expect(html).toContain('\\u003c/script>')
  })

  it('renders the honest unavailable state with no payload script', async () => {
    for (const locale of ['en', 'fa'] as const) {
      const html = await render(AtlasPageContent, {
        locale,
        snapshot: { status: 'unavailable' },
      })
      expect(html).toContain('data-atlas-status="unavailable"')
      expect(html).not.toContain('atlas-payload')
      expect(html).not.toContain('data-atlas-node=')
    }
  })

  it('renders the invalid state without inventing content', async () => {
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: { status: 'invalid', reason: 'duplicate-key' },
    })
    expect(html).toContain('data-atlas-status="invalid"')
    expect(html).not.toContain('atlas-payload')
    expect(html).not.toContain('data-atlas-node=')
    expect(html).toMatch(/validation/i)
  })

  it('renders locale-correct visible copy without silent EN fallback on FA', async () => {
    const payload = readPayload('benchmark.json')
    const en = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    const fa = await render(AtlasPageContent, {
      locale: 'fa',
      snapshot: readySnapshot(payload),
    })
    expect(en).toContain('Knowledge Atlas')
    expect(en).toContain('Domains &amp; works')
    expect(fa).toContain('اطلس دانش')
    expect(fa).toContain('حوزه‌ها و آثار')
    expect(fa).not.toContain('Knowledge Atlas')
    expect(fa).not.toContain('Domains &amp; works')
  })
})
