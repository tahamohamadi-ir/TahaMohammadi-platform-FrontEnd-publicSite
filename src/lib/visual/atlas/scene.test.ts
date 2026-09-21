import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AtlasPayload } from '../../atlas/model'
import { UniverseLedger } from '../research-universe/dispose'
import {
  sharedFineSphereGeometry,
  sharedSphereGeometry,
} from '../research-universe/spheres'
import { buildUniverseTheme } from '../research-universe/theme'

const rendererCreations = vi.hoisted(() => vi.fn())
const cores = vi.hoisted(() => [] as Array<Record<string, unknown>>)

vi.mock('../research-universe/scene-core', async () => {
  // Vitest hoists this factory above static imports; dynamic imports are
  // required here so the stub uses the real Three and ledger implementations.
  const THREE = await import('three')
  const { UniverseLedger } = await import('../research-universe/dispose')

  return {
    createSceneCore: vi.fn(
      (options: {
        canvas: HTMLCanvasElement
        theme: unknown
        onError?: (code: string) => void
      }) => {
        rendererCreations()
        const ledger = new UniverseLedger()
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, 1, 1, 4000)
        const groups = {
          edges: new THREE.Group(),
          nodes: new THREE.Group(),
          core: new THREE.Group(),
        }
        Object.values(groups).forEach((group) => scene.add(group))
        const renderer = {
          info: { render: { triangles: 0, calls: 0 } },
          getPixelRatio: () => 1,
        }
        let onFrame: (() => void) | null = null
        const core = {
          renderer,
          scene,
          camera,
          ledger,
          groups,
          theme: options.theme,
          requestRender: vi.fn(),
          renderNow: vi.fn(() => onFrame?.()),
          resize: vi.fn((width: number, height: number) => {
            camera.aspect = width / Math.max(height, 1)
            camera.updateProjectionMatrix()
            return { width, height, pixelRatio: 1, isMobile: false }
          }),
          setTheme: vi.fn((theme: unknown) => {
            core.theme = theme
          }),
          setVisible: vi.fn(),
          setLights: vi.fn(),
          setOnFrame: vi.fn((callback: (() => void) | null) => {
            onFrame = callback
          }),
          projection: () => ({
            matrix: new THREE.Matrix4().toArray(),
            width: 800,
            height: 600,
          }),
          dispose: vi.fn(() => {
            ledger.dispose()
            scene.clear()
          }),
        }
        ledger.listen(options.canvas, 'webglcontextlost', vi.fn())
        cores.push(core)
        return core
      },
    ),
  }
})

import { createAtlasScene } from './scene'

const theme = buildUniverseTheme(
  {
    canvas: '#071225',
    ink: '#f7f3ea',
    brand: '#16b8a6',
    signature: '#c89b3c',
    research: '#8b75dc',
    context: '#42a98c',
    surface: '#0b1630',
  },
  'dark',
)

function payload(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-20T00:00:00.000Z',
      nodeCount: 3,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'alpha-node',
        type: 'topic',
        label: 'Alpha',
        importance: 90,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: -40, y: 0, z: 0 },
      },
      {
        key: 'beta-node',
        type: 'project',
        label: 'Beta',
        importance: 60,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 0, y: 25, z: 4 },
      },
      {
        key: 'gamma-node',
        type: 'publication',
        label: 'Gamma',
        importance: 50,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 48, y: -8, z: -3 },
      },
    ],
    relations: [
      {
        key: 'alpha-node~supports~beta-node',
        type: 'supports',
        source: 'alpha-node',
        target: 'beta-node',
        directed: true,
        weight: 1,
        hierarchy: false,
      },
    ],
  }
}

class FakeCanvas extends EventTarget {
  clientWidth = 800
  clientHeight = 600
}

function create() {
  return createAtlasScene({
    canvas: new FakeCanvas() as unknown as HTMLCanvasElement,
    payload: payload(),
    theme,
    motion: 'full',
  })
}

beforeEach(() => {
  rendererCreations.mockClear()
  cores.splice(0)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 17),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('createAtlasScene', () => {
  it('creates exactly one renderer per scene', () => {
    const scene = create()

    expect(scene).not.toBeNull()
    expect(rendererCreations).toHaveBeenCalledOnce()
  })

  it('does not leave an animation frame running while idle', () => {
    const scene = create()

    expect(scene).not.toBeNull()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('uses both process-wide shared geometry tiers', () => {
    const scene = create()
    if (!scene) throw new Error('scene unavailable')

    expect(scene.stats().nodeGeometries).toBe(2)
    expect(sharedSphereGeometry()).toBe(sharedSphereGeometry())
    expect(sharedFineSphereGeometry()).toBe(sharedFineSphereGeometry())
    expect(sharedFineSphereGeometry()).not.toBe(sharedSphereGeometry())
  })

  it('dims only outside the selected one-hop neighbourhood', () => {
    const scene = create()
    if (!scene) throw new Error('scene unavailable')
    const before = scene.stats()

    scene.setSelection({ kind: 'node', key: 'alpha-node' })
    scene.setState('node')

    const after = scene.stats()
    expect(after.nodes).toBe(before.nodes)
    expect(after.emphasizedNodeKeys).toEqual(['alpha-node', 'beta-node'])
    expect(after.dimmedNodeKeys).toEqual(['gamma-node'])
  })

  it('releases every ledger resource and listener', () => {
    const scene = create()
    if (!scene) throw new Error('scene unavailable')
    const ledger = cores[0]?.ledger as UniverseLedger
    expect(ledger.counts.materials).toBeGreaterThan(0)
    expect(ledger.counts.listeners).toBeGreaterThan(0)

    scene.dispose()

    expect(ledger.isDisposed).toBe(true)
    expect(ledger.counts).toEqual({
      geometries: 0,
      materials: 0,
      listeners: 0,
    })
  })

  it('makes focus and reset instant under reduced motion', () => {
    const scene = create()
    if (!scene) throw new Error('scene unavailable')

    scene.setMotion('reduced')
    scene.focusNode('gamma-node')
    expect(scene.orbit()).not.toEqual({
      yaw: 0.22,
      pitch: 0.24,
      distanceScale: 1,
    })
    scene.resetView()

    expect(scene.orbit()).toEqual({
      yaw: 0.22,
      pitch: 0.24,
      distanceScale: 1,
    })
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
