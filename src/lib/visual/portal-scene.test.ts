import { expect, test, vi } from 'vitest'
import {
  PORTAL_ASSETS,
  PORTAL_COMPOSITION,
  PORTAL_ENTRY,
  PORTAL_PART_NAMES,
  createPortalScene,
  portalEntryGeometry,
  portalFrame,
  portalThemeFromPalette,
  portalThresholdAnchor,
  portalWidthFraction,
} from './portal-scene'
import type { ScenePalette } from './scene-contract'

const lightPalette: ScenePalette = {
  canvas: '#f7f8f5',
  ink: '#182328',
  brand: '#087c73',
  signature: '#a77b28',
  surface: '#ffffff',
  research: '#6047b8',
  context: '#137a62',
}

const darkPalette: ScenePalette = {
  ...lightPalette,
  canvas: '#071225',
  ink: '#f7f3ea',
  surface: '#0b1630',
}

test('theme follows the resolved canvas luminance', () => {
  expect(portalThemeFromPalette(lightPalette)).toBe('light')
  expect(portalThemeFromPalette(darkPalette)).toBe('dark')
})

test('composition framing keeps the portal dominant on desktop and crops on mobile', () => {
  const desktop = portalFrame(16 / 9)
  // Desktop: portal body occupies ~50% of the frame width (50–62% target),
  // with the gable apex still inside the top edge.
  expect(desktop.widthFraction).toBeGreaterThan(0.49)
  expect(desktop.widthFraction).toBeLessThan(0.62)
  // Threshold line anchored around two thirds down the viewport.
  const vFov = (PORTAL_COMPOSITION.verticalFovDeg * Math.PI) / 180
  const visibleHeightAtPortal = 2 * desktop.distance * Math.tan(vFov / 2)
  const thresholdFraction = 0.5 + desktop.centerY / visibleHeightAtPortal
  expect(thresholdFraction).toBeGreaterThan(0.69)
  expect(thresholdFraction).toBeLessThan(0.76)

  const mobile = portalFrame(390 / 844)
  // Mobile: portal reaches the frame width while the body stays between
  // 34% and 40% of the frame height (controls live over the lower world).
  expect(mobile.widthFraction).toBeGreaterThan(0.9)
  const mobilePortion =
    PORTAL_COMPOSITION.top / (2 * mobile.distance * Math.tan(vFov / 2))
  expect(mobilePortion).toBeGreaterThan(0.3)
  expect(mobilePortion).toBeLessThanOrEqual(0.41)
  expect(mobile.distance).toBeGreaterThan(desktop.distance)

  // Ultrawide frames cap the portal height so the brand keeps headroom.
  const ultrawide = portalFrame(2.4)
  const ultrawidePortion =
    PORTAL_COMPOSITION.top / (2 * ultrawide.distance * Math.tan(vFov / 2))
  expect(ultrawidePortion).toBeLessThanOrEqual(0.705)
})

test('width fraction grows toward narrow viewports and anchors stay low', () => {
  expect(portalWidthFraction(2)).toBe(0.52)
  expect(portalWidthFraction(0.75)).toBeGreaterThan(0.68)
  expect(portalWidthFraction(0.4)).toBeLessThanOrEqual(0.95)
  expect(portalWidthFraction(1)).toBeGreaterThan(portalWidthFraction(1.4))
  expect(portalThresholdAnchor(1.6)).toBeCloseTo(0.72, 2)
  expect(portalThresholdAnchor(0.46)).toBeGreaterThan(0.73)
})

test('runtime assets are the frozen PW-1 export files', () => {
  expect(PORTAL_ASSETS.glb).toBe('/portal/tahamohammadi-portal-v1.4.glb')
  expect(PORTAL_ASSETS.lightMap).toBe(
    '/portal/portal_stone_basecolor_light.jpg',
  )
})

test('entry reads the frozen runtime hierarchy by exact name', () => {
  // Names verified against the frozen GLB's node table; the entry must do typed
  // lookup and degrade gracefully when a name is missing.
  expect(PORTAL_PART_NAMES).toEqual({
    threshold: 'HM_ARCHITECTURE',
    diagram: 'HM_DIAGRAM',
    diagramPrimary: 'Diag_Primary',
    diagramSecondary: 'Diag_Secondary',
    beacon: 'HM_BEACON',
    glowSquare: 'Core_GlowSquare',
    streak: 'Core_LightStreak',
    depthFrame: 'HM_Passage_DepthFrame_A',
    depthFrames: 'HM_Passage_DepthFrames',
    passage: 'HM_PASSAGE',
  })
})

test('entry path derives forward from world positions and stops short of the beacon', () => {
  // Real frozen-GLB world positions: threshold at the origin, first passage
  // depth frame at z = -7.40, beacon core at z = -25.00.
  const geometry = portalEntryGeometry({
    threshold: [0, 0, 0],
    depthFrame: [0, 0, -7.4],
    beacon: [0, 3.6, -25],
    camera: [0, 1.2, 58],
    mobile: false,
  })

  // Forward comes from the hierarchy (threshold -> first depth frame): -Z and
  // horizontal only, so the camera never pitches or rolls.
  expect(geometry.forward[0]).toBeCloseTo(0, 6)
  expect(geometry.forward[1]).toBe(0)
  expect(geometry.forward[2]).toBeCloseTo(-1, 6)

  // Crosses the threshold but never reaches the frame share or the beacon.
  expect(geometry.end[2]).toBeLessThan(0)
  expect(geometry.end[2]).toBeGreaterThanOrEqual(
    PORTAL_ENTRY.depthFrameShare * -7.4 - 1e-6,
  )
  expect(geometry.end[2]).toBeGreaterThan(-25)
  // Eye height is preserved: no vertical drift, no FOV trick.
  expect(geometry.end[1]).toBeCloseTo(1.2, 6)
  expect(geometry.target[2]).toBeLessThan(geometry.end[2])
  expect(geometry.target[1]).toBeCloseTo(1.2, 6)
  // Total travel is the distance from the composed frame, so it is real.
  expect(geometry.distance).toBeGreaterThan(58)
  expect(geometry.distance).toBeLessThanOrEqual(58 + PORTAL_ENTRY.maxTravel)
})

test('mobile entry travels less than desktop and a degenerate hierarchy stays stable', () => {
  const base = {
    threshold: [0, 0, 0] as const,
    depthFrame: [0, 0, -7.4] as const,
    beacon: [0, 3.6, -25] as const,
    camera: [0, 1.2, 58] as const,
  }
  const desktop = portalEntryGeometry({ ...base, mobile: false })
  const mobile = portalEntryGeometry({ ...base, mobile: true })
  expect(mobile.distance).toBeLessThan(desktop.distance)
  expect(mobile.distance).toBeGreaterThan(58)

  // No passage frames (absent geometry) must not divide by zero or fly away.
  const degenerate = portalEntryGeometry({
    threshold: [0, 0, 0],
    depthFrame: [0, 0, 0],
    beacon: [0, 0, 0],
    camera: [0, 1.2, 40],
    mobile: false,
  })
  expect(degenerate.forward[2]).toBeCloseTo(-1, 6)
  expect(Number.isFinite(degenerate.distance)).toBe(true)
  expect(degenerate.distance).toBeGreaterThan(0)
})

test('unavailable WebGL reports the error and rejects instead of rendering', async () => {
  const onError = vi.fn()
  const canvas = {
    getContext: () => null,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLCanvasElement
  await expect(
    createPortalScene({
      canvas,
      palette: darkPalette,
      motion: 'reduced',
      onError,
    }),
  ).rejects.toThrow('webgl-unavailable')
  expect(onError).toHaveBeenCalledWith('webgl-unavailable')
})
