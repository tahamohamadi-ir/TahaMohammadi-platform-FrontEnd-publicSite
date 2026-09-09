import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import {
  HERO_ENHANCEMENT_VERSION,
  enhanceHeroRegion,
  isEligibleHeroRegion,
  readEmbeddedPayload,
  shouldLoadScene,
} from '../../lib/visual/hero-enhancement'
import {
  SCENE_CONTRACT_VERSION,
  toScenePayload,
} from '../../lib/visual/scene-contract'
import {
  adaptHeroGraph,
  createStaticRelatedResolver,
  type GraphPayloadOut,
} from '../../lib/hero-graph-content'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

function readSource(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

function readFixturePayload(): GraphPayloadOut {
  const raw = readFileSync(
    path.join(
      repositoryRoot,
      'tests',
      'fixtures',
      'contracts',
      'hero-graph.json',
    ),
    'utf8',
  )
  return (JSON.parse(raw) as { payload: GraphPayloadOut }).payload
}

const resolver = createStaticRelatedResolver([
  {
    family: 'researchtopic',
    id: '11',
    locale: 'en',
    href: '/en/research/human-centered-ai/',
  },
  {
    family: 'project',
    id: '7',
    locale: 'en',
    href: '/en/projects/pars-sql/',
  },
  {
    family: 'publication',
    id: '3',
    locale: 'en',
    href: '/en/blog/vtd-edge/',
  },
  {
    family: 'article',
    id: '21',
    locale: 'en',
    href: '/en/blog/visual-discourse/',
  },
])

// Minimal DOM double for node-environment tests. The enhancement module only
// relies on getAttribute/setAttribute/querySelector/querySelectorAll plus a
// tiny document/window surface injected by callers.
class MockElement {
  tagName: string
  attributes = new Map<string, string>()
  children: MockElement[] = []
  parent: MockElement | null = null
  textContent = ''
  hidden = false
  listeners = new Map<string, Array<(event: never) => void>>()

  constructor(tagName: string, text = '') {
    this.tagName = tagName.toUpperCase()
    this.textContent = text
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  appendChild(child: MockElement) {
    child.parent = this
    this.children.push(child)
    return child
  }

  matches(selector: string): boolean {
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const inner = selector.slice(1, -1)
      if (inner.includes('=')) {
        const eq = inner.indexOf('=')
        const key = inner.slice(0, eq)
        const raw = inner.slice(eq + 1).replace(/^["']|["']$/g, '')
        return this.attributes.get(key!) === raw
      }
      return this.attributes.has(inner)
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1)
      return (this.attributes.get('class') ?? '').split(/\s+/).includes(cls)
    }
    return this.tagName.toLowerCase() === selector.toLowerCase()
  }

  querySelector(selector: string): MockElement | null {
    // Support simple descendant chains by matching the last token.
    const token = selector.trim().split(/\s+/).pop()!
    for (const child of this.children) {
      if (child.matches(token)) return child
      const nested = child.querySelector(selector)
      if (nested) return nested
    }
    return null
  }

  querySelectorAll(selector: string): MockElement[] {
    const token = selector.trim().split(/\s+/).pop()!
    const out: MockElement[] = []
    for (const child of this.children) {
      if (child.matches(token)) out.push(child)
      out.push(...child.querySelectorAll(selector))
    }
    return out
  }

  addEventListener(type: string, handler: (event: never) => void) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: (event: never) => void) {
    const list = this.listeners.get(type)
    if (list)
      this.listeners.set(
        type,
        list.filter((h) => h !== handler),
      )
  }
}

function buildReadyRegion(status = 'ready'): {
  region: MockElement
  canvas: MockElement
  stage: MockElement
  nodesList: MockElement
  detail: MockElement
} {
  const region = new MockElement('section')
  region.setAttribute('data-graph-region', '')
  region.setAttribute('data-graph-status', status)
  region.setAttribute('data-graph-locale', 'en')
  region.setAttribute('data-scene-contract', SCENE_CONTRACT_VERSION)

  const stage = new MockElement('div')
  stage.setAttribute('data-graph-scene', '')
  region.appendChild(stage)

  const canvas = new MockElement('canvas')
  canvas.setAttribute('data-graph-canvas', '')
  canvas.hidden = true
  stage.appendChild(canvas)

  const orbit = new MockElement('svg')
  orbit.setAttribute('class', 'hg-orbit')
  stage.appendChild(orbit)

  const nodesList = new MockElement('ul')
  nodesList.setAttribute('data-graph-nodes', '')
  for (const id of ['node-01', 'node-02']) {
    const li = new MockElement('li')
    li.setAttribute('data-graph-node', id)
    const details = new MockElement('details')
    const summary = new MockElement('summary', id)
    details.appendChild(summary)
    li.appendChild(details)
    nodesList.appendChild(li)
  }
  region.appendChild(nodesList)

  const detail = new MockElement('div')
  detail.setAttribute('data-graph-detail', '')
  const prompt = new MockElement('p', 'Select a node to read its summary')
  detail.appendChild(prompt)
  region.appendChild(detail)

  if (status === 'ready') {
    const model = adaptHeroGraph(readFixturePayload(), {
      locale: 'en',
      resolveRelatedHref: resolver,
    })
    if (model.status !== 'ready') throw new Error('fixture must be ready')
    const payload = toScenePayload(model, null)
    const script = new MockElement('script')
    script.setAttribute('data-graph-payload', '')
    script.setAttribute('type', 'application/json')
    script.textContent = JSON.stringify(payload)
    region.appendChild(script)
  }

  return { region, canvas, stage, nodesList, detail }
}

function mockDocWithSingleRegion(region: MockElement) {
  return {
    querySelectorAll: (selector: string): MockElement[] => {
      if (selector.includes('data-graph-region')) return [region]
      if (selector.includes('gw__portal') || selector.includes('gateway'))
        return []
      return []
    },
    querySelector: (_selector: string) => null,
  }
}

function mockScene() {
  return {
    render: vi.fn(),
    resize: vi.fn(),
    setPalette: vi.fn(),
    setSelection: vi.fn(),
    setMotion: vi.fn(),
    dispose: vi.fn(),
  }
}

function mockController() {
  return {
    select: vi.fn(),
    clearSelection: vi.fn(),
    getState: vi.fn(() => ({ selectedId: null })),
    dispose: vi.fn(),
  }
}

function mockMotion() {
  return {
    playSettle: vi.fn(async () => {}),
    animateSelection: vi.fn(async () => {}),
    setMotionPreference: vi.fn(),
    dispose: vi.fn(),
  }
}

describe('CA-06 hero enhancement eligibility', () => {
  it('pins the enhancement version alongside the locked scene contract', () => {
    expect(HERO_ENHANCEMENT_VERSION).toBe('ca06-1.0.0')
    expect(SCENE_CONTRACT_VERSION).toBe('ca03-1.0.0')
  })

  it('is eligible only for ready semantic regions with a matching contract', () => {
    const { region } = buildReadyRegion('ready')
    expect(isEligibleHeroRegion(region as never)).toBe(true)

    for (const status of ['empty', 'error', 'unavailable']) {
      const fallback = buildReadyRegion(status)
      expect(isEligibleHeroRegion(fallback.region as never)).toBe(false)
    }

    const mismatched = buildReadyRegion('ready')
    mismatched.region.setAttribute('data-scene-contract', 'ca99-0.0.0')
    expect(isEligibleHeroRegion(mismatched.region as never)).toBe(false)
  })

  it('loads only on eligible routes: single graph, no gateway portal', () => {
    const { region } = buildReadyRegion('ready')
    const doc = mockDocWithSingleRegion(region)
    expect(shouldLoadScene(region as never, doc as never)).toBe(true)

    const duplicateDoc = {
      querySelectorAll: (selector: string) => {
        if (selector.includes('data-graph-region'))
          return [region, new MockElement('section')]
        return []
      },
      querySelector: () => null,
    }
    expect(shouldLoadScene(region as never, duplicateDoc as never)).toBe(false)

    const gatewayDoc = {
      querySelectorAll: (selector: string) => {
        if (selector.includes('data-graph-region')) return [region]
        return []
      },
      querySelector: (selector: string) => {
        if (selector.includes('gw__portal')) return new MockElement('div')
        return null
      },
    }
    expect(shouldLoadScene(region as never, gatewayDoc as never)).toBe(false)

    const { region: emptyRegion } = buildReadyRegion('unavailable')
    expect(
      shouldLoadScene(
        emptyRegion as never,
        mockDocWithSingleRegion(emptyRegion) as never,
      ),
    ).toBe(false)
  })

  it('reads the embedded renderer payload without changing graph facts', () => {
    const { region } = buildReadyRegion('ready')
    const result = readEmbeddedPayload(region as never)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok payload')
    expect(result.payload.contractVersion).toBe(SCENE_CONTRACT_VERSION)
    expect(result.payload.locale).toBe('en')
    expect(result.payload.nodes).toHaveLength(5)
    expect(result.payload.edges).toHaveLength(4)
    // Facts preserved: labels come from the adapter, not invented here.
    expect(result.payload.nodes.find((n) => n.id === 'node-01')?.label).toBe(
      'Human-Centered AI',
    )
  })
})

describe('CA-06 fallbacks preserve content', () => {
  it('keeps synchronous WebGL initialization failure in fallback', async () => {
    const { region } = buildReadyRegion('ready')
    const scene = mockScene()
    const handle = await enhanceHeroRegion(region as never, {
      doc: mockDocWithSingleRegion(region) as never,
      loadScene: async () => ({
        createGraphScene: (options) => {
          options.onError?.('webgl-unavailable')
          return scene
        },
      }),
      loadController: async () => ({
        createGraphController: () => mockController() as never,
      }),
      loadMotion: async () => ({
        createGraphMotion: () => mockMotion() as never,
      }),
    })
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('webgl-unavailable')
    expect(scene.dispose).toHaveBeenCalled()
  })
  it('binds native controls and projected labels to the same live controller', async () => {
    const { region, detail, stage } = buildReadyRegion('ready')
    const labels = new MockElement('div')
    labels.setAttribute('data-graph-labels', '')
    stage.appendChild(labels)
    const controller = vi.fn(() => mockController() as never)
    const handle = await enhanceHeroRegion(region as never, {
      doc: mockDocWithSingleRegion(region) as never,
      loadScene: async () => ({ createGraphScene: () => mockScene() as never }),
      loadController: async () => ({ createGraphController: controller }),
      loadMotion: async () => ({
        createGraphMotion: () => mockMotion() as never,
      }),
    })
    expect(controller).toHaveBeenCalledWith(
      expect.objectContaining({
        container: region,
        detailElement: detail,
        labelsContainer: expect.anything(),
      }),
    )
    handle.dispose()
  })
  it('load rejection never hides semantic content and reports no success', async () => {
    const { region, canvas, nodesList, detail } = buildReadyRegion('ready')
    const doc = mockDocWithSingleRegion(region)
    const handle = await enhanceHeroRegion(region as never, {
      doc: doc as never,
      loadScene: async () => {
        throw new Error('dynamic import failed')
      },
      loadController: async () => ({
        createGraphController: () => mockController() as never,
      }),
      loadMotion: async () => ({
        createGraphMotion: () => mockMotion() as never,
      }),
    })
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('import-rejected')
    // Semantic content preserved: list + detail remain, canvas stays hidden.
    expect(region.querySelector('[data-graph-nodes]')).not.toBeNull()
    expect(nodesList.children.length).toBe(2)
    expect(region.querySelector('[data-graph-detail]')).not.toBeNull()
    const prompt = detail.querySelector('p')
    expect(prompt?.textContent ?? '').toContain('Select a node')
    expect(canvas.hidden).toBe(true)
    expect(region.getAttribute('data-hero-enhancement')).toBe('fallback')
    handle.dispose()
  })

  it('context loss preserves selection instead of clearing semantic state', async () => {
    const { region, canvas } = buildReadyRegion('ready')
    const doc = mockDocWithSingleRegion(region)
    const scene = mockScene()
    let capturedOnError: ((code: string) => void) | null = null
    const handle = await enhanceHeroRegion(region as never, {
      doc: doc as never,
      initialSelectedId: 'node-01',
      loadScene: async () => ({
        createGraphScene: ((options: { onError?: (code: string) => void }) => {
          capturedOnError = options.onError ?? null
          return scene
        }) as never,
      }),
      loadController: async () => ({
        createGraphController: () => mockController() as never,
      }),
      loadMotion: async () => ({
        createGraphMotion: () => mockMotion() as never,
      }),
    })
    expect(handle.state).toBe('enhanced')
    expect(canvas.hidden).toBe(false)
    expect(capturedOnError).not.toBeNull()
    // Simulate WebGL context loss after a selection exists.
    capturedOnError?.('context-lost')
    expect(handle.state).toBe('fallback')
    expect(handle.reason).toBe('context-lost')
    // Selection/content preserved: semantic nodes and detail remain intact.
    expect(region.querySelector('[data-graph-nodes]')).not.toBeNull()
    expect(region.querySelector('[data-graph-detail]')).not.toBeNull()
    expect(region.getAttribute('data-hero-enhancement')).toBe('fallback')
    handle.dispose()
  })

  it('does not start a second scene when the region is already enhanced', async () => {
    const { region } = buildReadyRegion('ready')
    region.setAttribute('data-hero-enhancement', 'enhanced')
    const doc = mockDocWithSingleRegion(region)
    const loadScene = vi.fn(async () => {
      throw new Error('must not be called')
    })
    const handle = await enhanceHeroRegion(region as never, {
      doc: doc as never,
      loadScene: loadScene as never,
    })
    expect(handle.state).toBe('idle')
    expect(loadScene).not.toHaveBeenCalled()
    handle.dispose()
  })
})

describe('CA-06 route hygiene and layout stability', () => {
  it('never imports the gateway portal path on the Home hero path', () => {
    const enhancement = readSource('src/lib/visual/hero-enhancement.ts')
    // The Home hero path must never bundle the gateway portal scene: forbid
    // static/dynamic imports of the gateway modules, not the eligibility
    // guard that keeps the two routes separate.
    expect(enhancement).not.toMatch(/from\s+['"][^'"]*gateway/i)
    expect(enhancement).not.toMatch(/import\s*\(\s*['"][^'"]*gateway/i)
    expect(enhancement).not.toMatch(/GatewayPortal/)

    const hero = readSource('src/components/hero/HeroGraph.astro')
    expect(hero).not.toMatch(/from\s+['"][^'"]*gateway/i)
    expect(hero).not.toMatch(/import\s*\(\s*['"][^'"]*gateway/i)
    expect(hero).not.toMatch(/GatewayPortal/)
    expect(hero).not.toMatch(/gw__portal/)
  })

  it('reserves scene size before load so images and labels do not shift layout', () => {
    const css = readSource('src/styles/hero-graph.css')
    // Reserved scene slot (intrinsic dimensions, not text height).
    expect(css).toMatch(/\.hg-scene[\s\S]*?min-block-size:\s*280px/)
    // Canvas and projected labels overlay the reserved slot absolutely.
    expect(css).toMatch(/\.hg-canvas[\s\S]*?position:\s*absolute/)
    expect(css).toMatch(/\.hg-labels[\s\S]*?position:\s*absolute/)
    // Text never waits for the scene: no zero-opacity copy rules.
    expect(css).not.toMatch(/\.hm-hero__copy[\s\S]*?opacity:\s*0/)
    expect(css).not.toMatch(/\.hg-node-list[\s\S]*?opacity:\s*0/)
    expect(css).not.toMatch(/\.hg-detail[\s\S]*?opacity:\s*0/)
  })

  it('keeps the semantic fallback readable without JavaScript', async () => {
    const hero = readSource('src/components/hero/HeroGraph.astro')
    // Native list + detail + honest states are static HTML, not script output.
    expect(hero).toContain('GraphNodeList')
    expect(hero).toContain('data-graph-detail')
    expect(hero).toContain('data-graph-canvas')
    // Progressive script enhances after render; it never documents-writes copy.
    expect(hero).toContain('hero-enhancement')
    expect(hero).not.toMatch(/document\.write/)
  })
})
