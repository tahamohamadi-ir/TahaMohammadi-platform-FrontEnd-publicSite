import { describe, expect, it } from 'vitest'

import {
  clamp01,
  CROSSFADE_STRATEGY,
  FRAME_COUNT,
  frameOpacities,
  frameOpacitiesWindowed,
  progressForScroll,
  REDUCED_MOTION_FRAME_INDEX,
  staticFrameIndex,
} from './hero-sequence'

describe('hero sequence progress mapping', () => {
  it('clamps progress to 0..1', () => {
    expect(clamp01(-5)).toBe(0)
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.42)).toBe(0.42)
    expect(clamp01(1)).toBe(1)
    expect(clamp01(7)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0)
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('keeps 0 before the travel, reaches 1 after it', () => {
    expect(progressForScroll(0, 0, 1200)).toBe(0)
    expect(progressForScroll(600, 0, 1200)).toBe(0.5)
    expect(progressForScroll(1200, 0, 1200)).toBe(1)
    expect(progressForScroll(5000, 0, 1200)).toBe(1)
    expect(progressForScroll(100, 400, 1200)).toBe(0)
  })

  it('does not divide by a zero travel', () => {
    expect(progressForScroll(500, 0, 0)).toBe(0)
    expect(progressForScroll(500, 0, -10)).toBe(0)
  })
})

describe('frame opacity distribution', () => {
  it('lands exactly on the authored states', () => {
    expect(frameOpacities(0)).toEqual([1, 0, 0, 0])
    expect(frameOpacities(1)).toEqual([0, 0, 0, 1])
    expect(frameOpacities(1 / 3)[1]).toBeCloseTo(1, 6)
    expect(frameOpacities(2 / 3)[2]).toBeCloseTo(1, 6)
  })

  it('crossfades only the two frames adjacent to the progress', () => {
    const half = frameOpacities(1 / 6)
    expect(half[0]).toBeCloseTo(0.5, 6)
    expect(half[1]).toBeCloseTo(0.5, 6)
    expect(half[2]).toBe(0)
    expect(half[3]).toBe(0)
  })

  // This is the card's rule: "Never keep all four at visible opacity."
  it('never leaves more than two frames visible, and they sum to one', () => {
    for (let step = 0; step <= 100; step += 1) {
      const opacities = frameOpacities(step / 100)
      const visible = opacities.filter((value) => value > 0)
      expect(visible.length).toBeLessThanOrEqual(2)
      const total = opacities.reduce((sum, value) => sum + value, 0)
      expect(total).toBeCloseTo(1, 6)
      opacities.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })
    }
  })

  it('moves forward monotonically from frame 01 to frame 04', () => {
    const leadingFrame = (progress: number) =>
      frameOpacities(progress).reduce(
        (best, value, index) =>
          value > frameOpacities(progress)[best] ? index : best,
        0,
      )
    const trail = [0, 0.2, 0.4, 0.6, 0.8, 1].map(leadingFrame)
    expect(trail).toEqual([...trail].sort((a, b) => a - b))
  })

  it('always returns one opacity per authored state', () => {
    expect(frameOpacities(0.5)).toHaveLength(FRAME_COUNT)
  })
})

describe('reduced motion', () => {
  it('resolves to a single representative authored frame', () => {
    const index = staticFrameIndex()
    expect(index).toBe(REDUCED_MOTION_FRAME_INDEX)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(FRAME_COUNT)
    // The static state is one frame fully visible, never a crossfade.
    const progress = index / (FRAME_COUNT - 1)
    expect(frameOpacities(progress).filter((value) => value > 0)).toHaveLength(
      1,
    )
  })
})

describe('windowed crossfade (strategy B)', () => {
  it('ships one of the two reviewed strategies', () => {
    expect(['linear', 'window']).toContain(CROSSFADE_STRATEGY)
  })

  it('holds each authored state outside the blend window', () => {
    expect(frameOpacitiesWindowed(1 / 3, 0.2)[1]).toBe(1)
    expect(frameOpacitiesWindowed(1 / 3 - 0.05, 0.2)[1]).toBe(1)
    expect(frameOpacitiesWindowed(1 / 3 - 0.05, 0.2)[2]).toBe(0)
  })

  it('blends only inside the window, with two frames summing to one', () => {
    // The window is centred on the segment midpoint: for segment 1 that is p = 1/6.
    const centre = 1 / 6
    const opacities = frameOpacitiesWindowed(centre, 0.2)
    expect(opacities.filter((value) => value > 0)).toHaveLength(2)
    expect(opacities[0]).toBeCloseTo(0.5, 6)
    expect(opacities[1]).toBeCloseTo(0.5, 6)
    expect(opacities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
  })

  it('never leaves more than two frames visible', () => {
    for (let step = 0; step <= 200; step += 1) {
      const opacities = frameOpacitiesWindowed(step / 200, 0.2)
      expect(opacities.filter((value) => value > 0).length).toBeLessThanOrEqual(
        2,
      )
      expect(opacities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    }
  })

  // The whole point of B: just before the boundary the blend is already finished, where the
  // linear mapping would still show two half-visible frames.
  it('differs from the linear mapping exactly where it is meant to', () => {
    const progress = 1 / 3 - 0.06
    const linear = frameOpacities(progress)
    const windowed = frameOpacitiesWindowed(progress, 0.2)
    expect(linear[1]).toBeGreaterThan(0.5)
    expect(linear[1]).toBeLessThan(1)
    expect(windowed[1]).toBe(1)
    expect(windowed[2]).toBe(0)
  })
})
