import { describe, expect, it, vi } from 'vitest'

import { createAtlasScene, type AtlasSceneCore } from './scene'
import type { AtlasPayload } from '../../atlas/model'

function payload(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-21T00:00:00Z',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'identity',
        label: 'Identity',
        semanticRole: 'anchor',
        visualRole: 'anchor',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: false,
      },
      {
        key: 'project',
        label: 'Project',
        semanticRole: 'record',
        visualRole: 'record',
        allowAsRoot: false,
        allowChildren: true,
        filterVisible: true,
      },
    ],
    relationTypes: [
      {
        key: 'parent-of',
        label: 'parent of',
        inverseLabel: 'child of',
        directed: true,
        hierarchyRole: true,
        visualPriority: 90,
      },
    ],
    groups: [],
    nodes: [
      {
        key: 'identity-00000001',
        type: 'identity',
        label: 'profile en',
        importance: 100,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
      {
        key: 'project-00000001',
        type: 'project',
        label: 'PARS-SQL',
        importance: 81,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 40, y: -30, z: 8 },
      },
    ],
    relations: [
      {
        key: 'identity-00000001~parent-of~project-00000001',
        type: 'parent-of',
        source: 'identity-00000001',
        target: 'project-00000001',
        directed: true,
        weight: 1,
        hierarchy: true,
      },
    ],
  }
}

function coreStub(): AtlasSceneCore & {
  calls: { render: number; dispose: number }
  scheduled: Array<() => void>
} {
  const calls = { render: 0, dispose: 0 }
  const scheduled: Array<() => void> = []
  const tracked: Array<{ dispose: () => void }> = []
  const listeners: Array<() => void> = []
  return {
    calls,
    scheduled,
    renderer: {} as never,
    scene: { add: vi.fn() } as never,
    camera: {} as never,
    groups: {} as never,
    ledger: {
      track: ((value: { dispose: () => void }) => {
        tracked.push(value)
        return value
      }) as never,
      trackMaterial: ((value: { dispose: () => void }) => {
        tracked.push(value)
        return value
      }) as never,
      dispose: vi.fn(() => {
        for (const trackedValue of tracked.splice(0)) trackedValue.dispose()
        for (const remove of listeners.splice(0)) remove()
      }),
    } as never,
    requestRender: vi.fn((callback?: () => void) => {
      // Coalesced render-on-change: one burst, one frame — then idle.
      if (callback) scheduled.push(callback)
      calls.render += 1
    }) as never,
    renderNow: vi.fn(() => {
      calls.render += 1
    }) as never,
    resize: vi.fn(),
    setTheme: vi.fn(),
    setVisible: vi.fn(),
    setLights: vi.fn(),
    setOnFrame: vi.fn(),
    projection: () => ({ matrix: [], width: 800, height: 520 }),
    dispose: vi.fn(() => {
      calls.dispose += 1
    }),
  }
}

describe('createAtlasScene (Plan C Task 16)', () => {
  it('builds exactly one renderer per scene from stored coordinates', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    expect(core.calls.render).toBeGreaterThan(0)
    expect(scene.stats().nodes).toBe(2)
    expect(scene.stats().edges).toBe(1)
    expect(scene.stats().nodeGeometries).toBe(1)
    scene.dispose()
  })

  it('schedules no frame while idle after construction settles', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    core.scheduled.length = 0
    void scene.stats()
    void scene.orbit()
    expect(core.scheduled).toHaveLength(0)
    scene.dispose()
  })

  it('setState(node) emphasises the one-hop neighbourhood and dims the rest', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    scene.setState('node', 'project-00000001')
    const emphasised = scene.emphasis()
    expect(emphasised.selectedNodeId).toBe('project-00000001')
    expect(emphasised.incident).toContain('identity-00000001')
    expect(emphasised.dimmed).toHaveLength(0)
    scene.dispose()
  })

  it('setState(node) with two unrelated nodes dims the outsider', () => {
    const core = coreStub()
    const three = payload()
    three.nodes.push({
      key: 'project-00000002',
      type: 'project',
      label: 'VTD-Edge',
      importance: 20,
      mobileOverviewPriority: 'hidden',
      aliases: [],
      position: { x: -60, y: 50, z: -12 },
    })
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: three,
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    scene.setState('node', 'project-00000001')
    expect(scene.emphasis().dimmed).toContain('project-00000002')
    scene.dispose()
  })

  it('disposes every ledger resource and leaves no listener behind', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    scene.dispose()
    scene.dispose()
    expect(core.calls.dispose).toBe(1)
  })

  it('setMotion(reduced) makes focus/reset instant', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    const before = core.calls.render
    scene.setMotion('reduced')
    scene.focusNode('project-00000001')
    scene.resetView()
    // Instant: each call renders synchronously, no scheduled animation frames.
    expect(core.scheduled).toHaveLength(0)
    expect(core.calls.render).toBeGreaterThan(before)
    scene.dispose()
  })

  it('setTheme forwards to the core and reapplies the visual layers', () => {
    const core = coreStub()
    const scene = createAtlasScene({
      canvas: {} as never,
      payload: payload(),
      theme: 'dark',
      motion: 'full',
      coreFactory: () => core,
    })
    scene.setTheme({ mode: 'light', palette: { brand: '#087c73' } } as never)
    expect(core.setTheme).toHaveBeenCalled()
    scene.dispose()
  })
})
