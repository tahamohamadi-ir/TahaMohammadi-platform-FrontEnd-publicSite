import { describe, expect, it, vi } from 'vitest'

import {
  CLICK_SLOP_PX,
  classifyGesture,
  clearSelectionAndRestoreFocus,
  clampedZoomScale,
  effectiveViewportWidth,
  focusAtlasSelection,
} from './controls'

describe('Atlas controls', () => {
  it('classifies a drag so it can never select', () => {
    expect(
      classifyGesture(
        { x: 20, y: 20, time: 0 },
        { x: 20 + CLICK_SLOP_PX + 1, y: 20, time: 80 },
      ),
    ).toBe('drag')
  })

  it('classifies a click below the movement slop', () => {
    expect(
      classifyGesture(
        { x: 20, y: 20, time: 0 },
        { x: 20 + CLICK_SLOP_PX - 1, y: 20, time: 120 },
      ),
    ).toBe('click')
  })

  it('clamps zoom at both ends', () => {
    expect(clampedZoomScale(0.55, 0.1)).toBe(0.55)
    expect(clampedZoomScale(2.1, 10)).toBe(2.1)
  })

  it('Escape clears selection and restores the opening control', () => {
    const selection = { clear: vi.fn() }
    const opener = { focus: vi.fn() }

    clearSelectionAndRestoreFocus(selection, opener)

    expect(selection.clear).toHaveBeenCalledOnce()
    expect(opener.focus).toHaveBeenCalledOnce()
  })

  it('frames against stage width minus the inspector', () => {
    const stage = {
      getBoundingClientRect: () => ({ width: 1200 }),
    }
    const inspector = {
      getBoundingClientRect: () => ({ width: 320 }),
    }

    const width = effectiveViewportWidth(
      stage as unknown as HTMLElement,
      inspector as unknown as HTMLElement,
    )
    const scene = {
      orbit: vi.fn(),
      zoomBy: vi.fn(),
      focusNode: vi.fn(),
      resetView: vi.fn(),
      render: vi.fn(),
    }

    focusAtlasSelection(scene, { mode: 'node', key: 'node-12345678' }, width)

    expect(scene.focusNode).toHaveBeenCalledWith('node-12345678', 880)
  })
})
