import { describe, expect, it, vi } from 'vitest'

import type { AtlasPayload } from '../../atlas/model'
import { enhanceAtlasRegion, type AtlasEnhancementOptions } from './enhancement'

function payload(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: 1,
      relationCount: 0,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'node-12345678',
        type: 'topic',
        label: 'Node',
        importance: 1,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    relations: [],
  }
}

class FakeRegion {
  ownerDocument: FakeDocument
  attributes = new Map<string, string>()
  payloadScript = { textContent: JSON.stringify(payload()) }

  constructor(doc: FakeDocument) {
    this.ownerDocument = doc
    this.attributes.set('data-atlas-region', '')
    this.attributes.set('data-atlas-status', 'ready')
    this.attributes.set('data-atlas-revision', 'rev-1')
    this.attributes.set('data-atlas-etag', '"rev-1"')
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  querySelector(selector: string): unknown {
    return selector === '#atlas-payload, [data-atlas-payload]'
      ? this.payloadScript
      : null
  }

  querySelectorAll(): unknown[] {
    return []
  }

  addEventListener(): void {}
  removeEventListener(): void {}
}

class FakeDocument {
  defaultView: FakeWindow

  constructor(win: FakeWindow) {
    this.defaultView = win
  }
}

class FakeWindow {
  WebGLRenderingContext: unknown = class {}
  location = {
    href: 'https://example.test/en/atlas/',
    search: '',
  }
  history = { pushState: vi.fn() }
  listeners = new Map<string, Set<() => void>>()

  constructor(public wide = true) {}

  matchMedia(query: string): MediaQueryList {
    const matches =
      query === '(min-width: 1024px)'
        ? this.wide
        : query === '(prefers-reduced-motion: reduce)'
          ? false
          : false
    return {
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as MediaQueryList
  }

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener)
  }
}

function harness(wide = true) {
  const win = new FakeWindow(wide)
  const doc = new FakeDocument(win)
  const region = new FakeRegion(doc)
  const scene = { dispose: vi.fn() }
  const createAtlasScene = vi.fn(() => scene)
  const options: AtlasEnhancementOptions = {
    doc: doc as unknown as Document,
    win: win as unknown as Window,
    loadScene: async () => ({ createAtlasScene }),
    loadControls: async () => ({}),
    loadPicking: async () => ({}),
    loadLabels: async () => ({}),
    refreshAtlas: async () => 'not-modified',
  }
  return { win, doc, region, scene, createAtlasScene, options }
}

describe('enhanceAtlasRegion', () => {
  it('enhances an eligible region in a capable environment', async () => {
    const { region, options, createAtlasScene } = harness()

    const handle = await enhanceAtlasRegion(
      region as unknown as HTMLElement,
      options,
    )

    expect(handle.state).toBe('enhanced')
    expect(handle.reason).toBeNull()
    expect(createAtlasScene).toHaveBeenCalledOnce()
    expect(region.getAttribute('data-atlas-presentation')).toBe('3d')
    expect(region.getAttribute('data-atlas-enhancement')).toBe('enhanced')
    expect(region.getAttribute('data-atlas-state')).toBe('overview')
  })

  it('keeps the 2d list when WebGL is unavailable', async () => {
    const { win, region, options, createAtlasScene } = harness()
    delete (win as { WebGLRenderingContext?: unknown }).WebGLRenderingContext

    const handle = await enhanceAtlasRegion(
      region as unknown as HTMLElement,
      options,
    )

    expect(handle).toMatchObject({
      state: 'list',
      reason: 'webgl-unavailable',
    })
    expect(createAtlasScene).not.toHaveBeenCalled()
    expect(region.getAttribute('data-atlas-presentation')).toBe('2d')
    expect(region.getAttribute('data-atlas-reason')).toBe('webgl-unavailable')
  })

  it('keeps the 2d presentation below the desktop breakpoint', async () => {
    const { region, options, createAtlasScene } = harness(false)

    const handle = await enhanceAtlasRegion(
      region as unknown as HTMLElement,
      options,
    )

    expect(handle.state).toBe('list')
    expect(handle.reason).toBe('viewport-2d')
    expect(createAtlasScene).not.toHaveBeenCalled()
    expect(region.getAttribute('data-atlas-presentation')).toBe('2d')
  })

  it('falls back when the lazy scene import rejects', async () => {
    const { region, options } = harness()
    options.loadScene = async () => {
      throw new Error('chunk unavailable')
    }

    const handle = await enhanceAtlasRegion(
      region as unknown as HTMLElement,
      options,
    )

    expect(handle).toMatchObject({
      state: 'fallback',
      reason: 'import-rejected',
    })
    expect(region.getAttribute('data-atlas-presentation')).toBe('2d')
    expect(region.getAttribute('data-atlas-enhancement')).toBe('fallback')
  })

  it('never enhances a second region in the same document', async () => {
    const { doc, options } = harness()
    const first = new FakeRegion(doc)
    const second = new FakeRegion(doc)

    expect(
      (await enhanceAtlasRegion(first as unknown as HTMLElement, options))
        .state,
    ).toBe('enhanced')
    const secondHandle = await enhanceAtlasRegion(
      second as unknown as HTMLElement,
      options,
    )

    expect(secondHandle).toMatchObject({
      state: 'list',
      reason: 'already-enhanced',
    })
    expect(second.getAttribute('data-atlas-presentation')).toBe('2d')
  })

  it('starts refresh before scene construction without awaiting it', async () => {
    const { region, options } = harness()
    const order: string[] = []
    options.refreshAtlas = vi.fn(
      () =>
        new Promise(() => {
          order.push('refresh')
        }),
    )
    options.loadScene = async () => ({
      createAtlasScene: () => {
        order.push('scene')
        return { dispose: vi.fn() }
      },
    })

    const handle = await enhanceAtlasRegion(
      region as unknown as HTMLElement,
      options,
    )

    expect(handle.state).toBe('enhanced')
    expect(order).toEqual(['refresh', 'scene'])
  })
})
