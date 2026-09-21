import { describe, expect, it, vi } from 'vitest'

import { enhanceAtlasRegion } from './enhancement'

interface FakeElement {
  attrs: Map<string, string>
  canvas: object | null
  scene: object | null
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  querySelector(selector: string): object | null
}

function region(attrs: Record<string, string> = {}, bare = false): FakeElement {
  const store = new Map<string, string>(Object.entries(attrs))
  const canvas = bare ? null : {}
  const scene = bare ? null : {}
  return {
    attrs: store,
    canvas,
    scene,
    getAttribute(name: string) {
      return store.get(name) ?? null
    },
    setAttribute(name: string, value: string) {
      store.set(name, value)
    },
    removeAttribute(name: string) {
      store.delete(name)
    },
    querySelector(selector: string) {
      if (selector === '[data-atlas-scene]') return scene
      if (selector === '[data-atlas-canvas]') return canvas
      return null
    },
  }
}

const READY = {
  'data-atlas-status': 'ready',
  'data-atlas-contract': 'atlas01-1.0.0',
}

describe('enhanceAtlasRegion (Plan C Task 15)', () => {
  it('enhances an eligible region in a capable environment', async () => {
    const element = region(READY)
    const loadScene = vi.fn().mockResolvedValue({ default: {} })
    const handle = await enhanceAtlasRegion(element as never, {
      assumeWebgl: true,
      loadScene,
    })
    expect(handle.state).toBe('enhanced')
    expect(element.attrs.get('data-atlas-presentation')).toBe('3d')
    expect(element.attrs.get('data-atlas-state')).toBe('overview')
    handle.dispose()
  })

  it('falls back to 2d without WebGL', async () => {
    const element = region(READY)
    const handle = await enhanceAtlasRegion(element as never, {
      webgl: () => false,
      loadScene: vi.fn(),
    })
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('webgl-unavailable')
    expect(element.attrs.get('data-atlas-presentation')).toBe('2d')
  })

  it('falls back to 2d below the desktop breakpoint', async () => {
    const element = region(READY)
    const handle = await enhanceAtlasRegion(element as never, {
      assumeWebgl: true,
      matchMedia: () => ({ matches: false }) as never,
      loadScene: vi.fn(),
    })
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('narrow-viewport')
  })

  it('falls back with import-rejected when the scene import fails', async () => {
    const element = region(READY)
    const handle = await enhanceAtlasRegion(element as never, {
      assumeWebgl: true,
      loadScene: vi.fn().mockRejectedValue(new Error('no chunk')),
    })
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('import-rejected')
  })

  it('never enhances a second region', async () => {
    const first = region(READY)
    const second = region(READY)
    const one = await enhanceAtlasRegion(first as never, {
      assumeWebgl: true,
      loadScene: vi.fn(),
    })
    expect(one.state).toBe('enhanced')
    const two = await enhanceAtlasRegion(second as never, {
      loadScene: vi.fn(),
    })
    expect(two.state).toBe('fallback')
    expect(two.reason).toBe('already-enhanced')
    one.dispose()
    two.dispose()
  })

  it('runs the refresh before scene construction without blocking first paint', async () => {
    const element = region(READY)
    const order: string[] = []
    const refresh = vi.fn().mockImplementation(async () => {
      order.push('refresh')
      return 'not-modified'
    })
    const loadScene = vi.fn().mockImplementation(async () => {
      order.push('scene')
      return { default: {} }
    })
    await enhanceAtlasRegion(element as never, {
      assumeWebgl: true,
      refresh,
      loadScene,
    })
    expect(order).toEqual(['refresh', 'scene'])
    expect(element.attrs.get('data-atlas-refresh')).toBe('not-modified')
  })
})
