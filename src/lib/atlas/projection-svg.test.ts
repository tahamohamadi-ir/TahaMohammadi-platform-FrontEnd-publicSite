import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { project2d } from './projection-2d'
import { projectionSvgHtml } from './projection-svg'

function tinyPayload(): AtlasPayload {
  const node = (key: string, x: number, y: number) => ({
    key,
    type: 'research-area',
    label: key,
    importance: 80,
    mobileOverviewPriority: 'featured',
    aliases: [],
    position: { x, y, z: 0 },
  })
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: '1-x',
      publishedAt: '2026-09-21T00:00:00.000000+00:00',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [node('a-00000001', 0, 0), node('b-00000002', 10, 10)],
    relations: [
      {
        key: 'a-00000001~uses~b-00000002',
        type: 'uses',
        source: 'a-00000001',
        target: 'b-00000002',
        directed: true,
        weight: 1,
        hierarchy: false,
      },
    ],
  } as unknown as AtlasPayload
}

describe('atlas shared SVG renderer (Plan C Task 13 repair)', () => {
  it('emits the same contract as the Astro presentation, without interaction', () => {
    const payload = tinyPayload()
    const html = projectionSvgHtml(
      project2d(payload, {
        mode: 'mobile-overview',
        viewport: { width: 390, height: 520 },
        focusKey: null,
      }),
      'mobile-overview',
    )
    expect(html).toContain('data-atlas-projection="mobile-overview"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-atlas-projected="a-00000001"')
    expect(html).toContain('data-atlas-edge="a-00000001~uses~b-00000002"')
    expect(html).not.toMatch(/tabindex/)
    expect(html).not.toMatch(/onclick/)
    expect(html).not.toMatch(/<a[ >]/)
  })

  it('escapes hostile keys and stays inside the viewBox contract', () => {
    const payload = tinyPayload()
    payload.nodes[0] = { ...payload.nodes[0], key: 'evil-"><script' }
    const html = projectionSvgHtml(
      project2d(payload, {
        mode: 'mobile-overview',
        viewport: { width: 390, height: 520 },
        focusKey: null,
      }),
      'mobile-overview',
    )
    expect(html).not.toContain('"><script')
    expect(html).toContain('&quot;&gt;&lt;script')
  })
})
