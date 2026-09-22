import { describe, expect, it, vi } from 'vitest'

import {
  alwaysTierRelationKeys,
  createAtlasControls,
  edgeSamplesFor,
  type AtlasControlsScene,
} from './controls'
import type { AtlasPayload } from '../../atlas/model'

function sceneStub(): AtlasControlsScene & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    rotateBy: vi.fn((dx: number, dy: number) => {
      calls.push(`rotate:${dx},${dy}`)
    }),
    zoomBy: vi.fn((factor: number) => {
      calls.push(`zoom:${factor}`)
    }),
    focusNode: vi.fn((key: string) => {
      calls.push(`focus:${key}`)
    }),
    resetView: vi.fn(() => {
      calls.push('reset')
    }),
    setSelection: vi.fn(),
    setSelectedRelation: vi.fn(),
    render: vi.fn(() => {
      calls.push('render')
    }),
  }
}

interface FakeStage {
  listeners: Map<string, Array<(event: never) => void>>
  rect: { left: number; top: number }
  addEventListener(type: string, handler: (event: never) => void): void
  removeEventListener(type: string, handler: (event: never) => void): void
  setPointerCapture(): void
  releasePointerCapture(): void
}

function stage(): FakeStage {
  const listeners = new Map<string, Array<(event: never) => void>>()
  return {
    listeners,
    rect: { left: 10, top: 20 },
    addEventListener(type, handler) {
      const list = listeners.get(type) ?? []
      list.push(handler)
      listeners.set(type, list)
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type) ?? []
      listeners.set(
        type,
        list.filter((entry) => entry !== handler),
      )
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  }
}

function pointer(
  type: string,
  x: number,
  y: number,
  extra: Record<string, unknown> = {},
): never {
  return {
    type,
    clientX: x,
    clientY: y,
    pointerId: 1,
    button: 0,
    pointerType: 'mouse',
    preventDefault: () => {},
    target: { closest: () => null },
    ...extra,
  } as never
}

function fire(fake: FakeStage, type: string, event: never): void {
  for (const handler of fake.listeners.get(type) ?? []) handler(event)
}

describe('createAtlasControls (Plan C Task 17)', () => {
  it('a drag never selects — only a click below the slop does', () => {
    const fake = stage()
    const scene = sceneStub()
    const onPick = vi.fn()
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 10, top: 20 }),
      } as never,
      scene,
      onPick,
    })
    // Drag: down, move far, up — no pick.
    fire(fake, 'pointerdown', pointer('pointerdown', 100, 100))
    fire(fake, 'pointermove', pointer('pointermove', 140, 130))
    fire(fake, 'pointerup', pointer('pointerup', 140, 130))
    expect(onPick).not.toHaveBeenCalled()
    expect(
      scene.calls.filter((call) => call.startsWith('rotate:')),
    ).not.toHaveLength(0)
    // Click: down, tiny move, up — one pick.
    fire(fake, 'pointerdown', pointer('pointerdown', 50, 50))
    fire(fake, 'pointermove', pointer('pointermove', 51, 52))
    fire(fake, 'pointerup', pointer('pointerup', 51, 52))
    expect(onPick).toHaveBeenCalledTimes(1)
    controls.dispose()
  })

  it('zoom is clamped at both ends', () => {
    const fake = stage()
    const scene = sceneStub()
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      } as never,
      scene,
      onPick: vi.fn(),
    })
    controls.zoomBy(100)
    controls.zoomBy(0.0001)
    const zoomMock = scene.zoomBy as unknown as { mock: { calls: number[][] } }
    const factors = zoomMock.mock.calls.map((call) => call[0] as number)
    expect(Math.max(...factors)).toBeLessThanOrEqual(1.6)
    expect(Math.min(...factors)).toBeGreaterThanOrEqual(0.6)
    controls.dispose()
  })

  it('Escape restores focus to the control that opened the selection', () => {
    const fake = stage()
    const scene = sceneStub()
    const opener = { focus: vi.fn() }
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      } as never,
      scene,
      onPick: vi.fn(),
    })
    controls.noteOpener(opener as never)
    fire(fake, 'keydown', { key: 'Escape', preventDefault: () => {} } as never)
    expect(scene.setSelection).toHaveBeenCalledWith(null)
    expect(scene.setSelectedRelation).toHaveBeenCalledWith(null)
    expect(opener.focus).toHaveBeenCalled()
    controls.dispose()
  })

  it('framing receives the effective width, stage minus inspector', () => {
    const fake = stage()
    const scene = sceneStub()
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      } as never,
      scene,
      onPick: vi.fn(),
    })
    const frame = controls.frameFor({
      stageWidth: 900,
      inspectorWidth: 320,
      height: 520,
      selectedKey: null,
    })
    expect(frame.width).toBe(580)
    expect(frame.height).toBe(520)
    controls.dispose()
  })

  it('in-stage native buttons keep working (pointer-capture guard)', () => {
    const fake = stage()
    const scene = sceneStub()
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 10, top: 20 }),
      } as never,
      scene,
      onPick: vi.fn(),
    })
    const buttonTarget = {
      closest: (selector: string) =>
        selector.includes('button') ? buttonTarget : null,
    }
    fire(
      fake,
      'pointerdown',
      pointer('pointerdown', 100, 100, { target: buttonTarget }),
    )
    fire(fake, 'pointermove', pointer('pointermove', 140, 130))
    expect(
      scene.calls.filter((call) => call.startsWith('rotate:')),
    ).toHaveLength(0)
    controls.dispose()
  })

  it('dispose removes every listener', () => {
    const fake = stage()
    const scene = sceneStub()
    const controls = createAtlasControls({
      stage: fake as never,
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      } as never,
      scene,
      onPick: vi.fn(),
    })
    controls.dispose()
    for (const handlers of fake.listeners.values()) {
      expect(handlers).toHaveLength(0)
    }
  })

  it('only always-tier (visualPriority >= 80) labels exist at rest, capped at 10', () => {
    const payload = benchmarkPayload()
    const keys = alwaysTierRelationKeys(payload)
    const priorityByKey = new Map(
      payload.relationTypes.map((type) => [type.key, type.visualPriority]),
    )
    const typeOf = new Map(
      payload.relations.map((relation) => [relation.key, relation.type]),
    )
    expect(keys.length).toBeLessThanOrEqual(10)
    for (const key of keys) {
      expect(
        priorityByKey.get(typeOf.get(key) ?? '') ?? 0,
      ).toBeGreaterThanOrEqual(80)
    }
    // Deterministic: the same payload always yields the same keys.
    expect(alwaysTierRelationKeys(payload)).toEqual(keys)
  })

  it('maps visualPriority to the spec edge-sampling tiers', () => {
    expect(edgeSamplesFor(90)).toBe(26)
    expect(edgeSamplesFor(80)).toBe(26)
    expect(edgeSamplesFor(79)).toBe(16)
    expect(edgeSamplesFor(40)).toBe(16)
    expect(edgeSamplesFor(39)).toBe(10)
    expect(edgeSamplesFor(Number.NaN)).toBe(10)
  })
})

function benchmarkPayload(): AtlasPayload {
  const types = [
    { key: 'parent-of', visualPriority: 90 },
    { key: 'implements', visualPriority: 60 },
    { key: 'cites', visualPriority: 55 },
    { key: 'uses', visualPriority: 50 },
    { key: 'related-to', visualPriority: 40 },
  ]
  const counts: Record<string, number> = {
    uses: 48,
    'parent-of': 36,
    implements: 24,
    cites: 20,
    'related-to': 8,
  }
  const relations: AtlasPayload['relations'] = []
  for (const [type, count] of Object.entries(counts)) {
    for (let index = 0; index < count; index += 1) {
      const key = `rel-${type}-${String(index).padStart(3, '0')}`
      relations.push({
        key,
        type,
        source: 'a',
        target: 'b',
        directed: true,
        weight: 1,
        hierarchy: type === 'parent-of',
      })
    }
  }
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: 'rev-1',
      publishedAt: '2026-09-21T00:00:00Z',
      nodeCount: 2,
      relationCount: relations.length,
      layoutRevision: 1,
    },
    nodeTypes: [],
    relationTypes: types.map((type) => ({
      key: type.key,
      label: type.key,
      inverseLabel: type.key,
      directed: true,
      hierarchyRole: type.key === 'parent-of',
      visualPriority: type.visualPriority,
    })),
    groups: [],
    nodes: [],
    relations,
  }
}
