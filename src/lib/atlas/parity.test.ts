import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { project2d } from './projection-2d'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')
const cssPath = join(here, '..', '..', 'styles', 'atlas.css')

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

const VIEWPORT = { width: 390, height: 520 }

describe('atlas locale parity, RTL and accessibility (Plan C Task 21)', () => {
  it('projects identical geometry for both locales while text differs', () => {
    const en = readPayload('en.json')
    const fa = readPayload('fa.json')
    const enProjection = project2d(en, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: null,
    })
    const faProjection = project2d(fa, {
      mode: 'mobile-overview',
      viewport: VIEWPORT,
      focusKey: null,
    })
    expect(faProjection.nodes.map((n) => [n.key, n.cx, n.cy, n.r])).toEqual(
      enProjection.nodes.map((n) => [n.key, n.cx, n.cy, n.r]),
    )
    expect(faProjection.transform).toEqual(enProjection.transform)
    const enLabels = en.nodes.map((n) => n.label ?? n.key)
    const faLabels = fa.nodes.map((n) => n.label ?? n.key)
    expect(faLabels).not.toEqual(enLabels)
  })

  it('keeps the representative 72-node scale inside the same geometry contract', () => {
    const en = readPayload('en.json')
    const bench = readPayload('benchmark.json')
    for (const payload of [en, bench]) {
      const projected = project2d(payload, {
        mode: 'mobile-overview',
        viewport: VIEWPORT,
        focusKey: null,
      })
      for (const node of projected.nodes) {
        expect(node.cx - node.r).toBeGreaterThanOrEqual(0)
        expect(node.cy - node.r).toBeGreaterThanOrEqual(0)
        expect(node.cx + node.r).toBeLessThanOrEqual(VIEWPORT.width)
        expect(node.cy + node.r).toBeLessThanOrEqual(VIEWPORT.height)
      }
    }
    expect(bench.nodes.length).toBeGreaterThanOrEqual(60)
    expect(bench.nodes.length).toBeLessThanOrEqual(80)
  })

  it('uses logical properties only — no physical direction leaks', () => {
    const css = readFileSync(cssPath, 'utf8')
    const physical = css.match(
      /(?<![a-z-])(margin-left|margin-right|padding-left|padding-right|left|right|text-align\s*:\s*(left|right))/g,
    )
    expect(physical ?? []).toEqual([])
    expect(css).toMatch(/margin-inline/)
    expect(css).toMatch(/padding-inline/)
  })

  it('keeps every control keyboard-visible with a focus style and 44px targets', () => {
    const css = readFileSync(cssPath, 'utf8')
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/min-height:\s*44px/)
    expect(css).toMatch(/min-width:\s*44px/)
  })
})
