import { afterEach, expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { createGraphScene } from './graph-scene'
import { SCENE_CONTRACT_VERSION, type ScenePalette } from './scene-contract'

const captures = vi.hoisted(() => ({ scenes: [] as unknown[] }))
vi.mock('three', async (original) => {
  const real = await original<typeof import('three')>()
  return {
    ...real,
    WebGLRenderer: class {
      shadowMap = { enabled: false, type: 0 }
      setClearColor() {}
      setSize() {}
      setPixelRatio() {}
      dispose() {}
      render(scene: unknown) {
        captures.scenes.push(scene)
      }
    },
  }
})
const light: ScenePalette = {
  canvas: '#f7f8f5',
  ink: '#182328',
  brand: '#087c73',
  signature: '#a77b28',
  surface: '#ffffff',
  research: '#6047b8',
  context: '#137a62',
}
const dark: ScenePalette = {
  ...light,
  canvas: '#071225',
  ink: '#f7f3ea',
  brand: '#16b8a6',
  signature: '#c89b3c',
  surface: '#0b1630',
}
function canvas() {
  vi.stubGlobal('window', { WebGLRenderingContext: class {} })
  return {
    getContext: () => ({}),
    addEventListener() {},
    removeEventListener() {},
    clientWidth: 600,
    clientHeight: 520,
  } as unknown as HTMLCanvasElement
}
function resources(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material)
    }
  })
  return { geometries, materials }
}
function graph() {
  return createGraphScene({
    canvas: canvas(),
    palette: light,
    selectedId: null,
    motion: 'reduced',
    payload: {
      contractVersion: SCENE_CONTRACT_VERSION,
      locale: 'en',
      nodes: [
        {
          id: 'a',
          label: 'A',
          x: 20,
          y: 10,
          z: 0,
          colorRole: 'brand',
          weight: 2,
          selected: false,
          dimmed: false,
        },
      ],
      edges: [],
    },
  })
}
afterEach(() => {
  vi.unstubAllGlobals()
  captures.scenes.length = 0
  vi.restoreAllMocks()
})
test('same-breakpoint resize reuses GPU geometry instead of accumulating resources', () => {
  const handle = graph()
  handle.resize(600, 520, 1)
  const scene = captures.scenes.at(-1) as THREE.Scene
  const before = resources(scene)
  handle.resize(610, 520, 1)
  expect(resources(scene).geometries).toEqual(before.geometries)
  handle.dispose()
})
test('breakpoint rebuild disposes replaced GPU resources immediately', () => {
  const handle = graph()
  handle.resize(600, 520, 1)
  const before = resources(captures.scenes.at(-1) as THREE.Scene)
  const spies = new Map(
    [...before.geometries].map((g) => [g, vi.spyOn(g, 'dispose')]),
  )
  handle.resize(900, 520, 1)
  const after = resources(captures.scenes.at(-1) as THREE.Scene)
  for (const [geometry, spy] of spies)
    if (!after.geometries.has(geometry)) expect(spy).toHaveBeenCalledOnce()
  handle.dispose()
})
test('theme change retints the decorative nucleus as well as data nodes', () => {
  const handle = graph()
  handle.render()
  const scene = captures.scenes.at(-1) as THREE.Scene
  handle.setPalette(dark)
  const colors = [...resources(scene).materials]
    .filter((m) => 'color' in m)
    .map((m) => (m as THREE.MeshBasicMaterial).color.getHexString())
  expect(colors).not.toContain('087c73')
  expect(colors).not.toContain('a77b28')
  handle.dispose()
})
test('50 nodes and 100 real input edges use bounded instanced rendering', () => {
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    id: `test-${i}`,
    label: `Test ${i}`,
    x: 0,
    y: 0,
    z: 0,
    colorRole: 'brand',
    weight: 2,
    selected: false,
    dimmed: false,
  }))
  const edges = Array.from({ length: 100 }, (_, i) => ({
    id: `edge-${i}`,
    source: nodes[i % 50].id,
    target: nodes[(i + 1) % 50].id,
    directed: false,
    emphasized: false,
  }))
  const handle = createGraphScene({
    canvas: canvas(),
    palette: light,
    selectedId: null,
    motion: 'reduced',
    payload: {
      contractVersion: SCENE_CONTRACT_VERSION,
      locale: 'en',
      nodes,
      edges,
    },
  })
  handle.resize(900, 520, 1)
  handle.setSelection('test-0')
  let draws = 0,
    triangles = 0,
    instances = 0
  ;(captures.scenes.at(-1) as THREE.Scene).traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) draws++
    if (object instanceof THREE.Mesh) {
      const count = object instanceof THREE.InstancedMesh ? object.count : 1
      if (object instanceof THREE.InstancedMesh) instances += count
      triangles +=
        ((object.geometry.index?.count ??
          object.geometry.attributes.position.count) /
          3) *
        count
    }
  })
  expect(instances).toBe(50)
  expect(draws).toBeLessThanOrEqual(60)
  expect(triangles).toBeLessThanOrEqual(50000)
  handle.dispose()
})
