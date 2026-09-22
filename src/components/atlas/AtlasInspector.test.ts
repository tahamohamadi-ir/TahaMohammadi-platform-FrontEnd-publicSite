import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import { filterOptions } from '../../lib/atlas/filters'
import type { AtlasPayload } from '../../lib/atlas/model'
import {
  buildAtlasIndexModel,
  type AtlasSnapshot,
} from '../../lib/atlas/snapshot'
import AtlasPageContent from './AtlasPageContent.astro'

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
    etag: '"inspector-etag"',
    html: buildAtlasIndexModel(payload),
  }
}

describe('Atlas inspector and controls (Plan D Phase 2 deferred SSR)', () => {
  it('server-renders an empty inspector mount without per-entity panels', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })

    expect(html).toContain('data-atlas-inspector')
    expect(html).toContain('data-atlas-inspector-mount')
    expect(html).not.toContain('data-atlas-inspector-node=')
    expect(html).not.toContain('data-atlas-inspector-relation=')
  })

  it('shows only the prompt when there is no selection', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })

    expect(html).toMatch(/data-atlas-inspector-prompt(?![^>]*hidden)/)
    expect(html).toContain('Select a node or relation to inspect it.')
    expect(html).toMatch(/role="status"[^>]*data-atlas-announcement/)
    expect(html).toContain('data-atlas-inspector-mount')
  })

  it('renders the exact filterOptions set without the anchor type', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    const rendered = [
      ...html.matchAll(
        /<button\b[^>]*data-atlas-filter[^>]*data-atlas-filter-key="([^"]+)"[^>]*>([^<]+)<\/button>/g,
      ),
    ].map((match) => ({ key: match[1], label: match[2].trim() }))

    expect(rendered).toEqual(
      filterOptions(payload).map(({ key, label }) => ({ key, label })),
    )
    expect(rendered).toHaveLength(6)
    expect(rendered.map(({ key }) => key)).not.toContain('identity')
  })

  it('uses native controls with accessible names in both locales', async () => {
    for (const name of ['benchmark.json', 'fa.json']) {
      const payload = readPayload(name)
      const html = await render(AtlasPageContent, {
        locale: payload.locale,
        snapshot: readySnapshot(payload),
      })
      const controls =
        html.match(
          /<(?:button|input)\b[^>]*(?:data-atlas-control|data-atlas-filter|data-atlas-search)[^>]*>/g,
        ) ?? []

      expect(controls.length).toBe(filterOptions(payload).length + 8)
      for (const control of controls) {
        expect(control).toMatch(/^<(?:button|input)\b/)
        if (control.startsWith('<input')) {
          expect(control).toMatch(/aria-label="[^"]+"/)
        } else {
          expect(control).toMatch(/aria-label="[^"]+"/)
        }
      }
    }
  })

  it('applies the shared 44px CSS contract to every control', async () => {
    const payload = readPayload('benchmark.json')
    const html = await render(AtlasPageContent, {
      locale: 'en',
      snapshot: readySnapshot(payload),
    })
    const controls =
      html.match(
        /<(?:button|input)\b[^>]*(?:data-atlas-control|data-atlas-filter|data-atlas-search)[^>]*>/g,
      ) ?? []
    const stylesheet = readFileSync(
      join(here, '..', '..', 'styles', 'atlas.css'),
      'utf8',
    )

    expect(
      controls.every((control) =>
        /\bclass="[^"]*\batlas-control\b/.test(control),
      ),
    ).toBe(true)
    expect(stylesheet).toMatch(
      /\.atlas-control\s*\{[^}]*min-block-size:\s*44px;[^}]*min-inline-size:\s*44px;/s,
    )
  })
})
