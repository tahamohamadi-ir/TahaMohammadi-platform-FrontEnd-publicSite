/**
 * CA-07 — Original procedural gateway portal renderer.
 *
 * Rebuilds the language-gateway portal from Three.js geometry primitives:
 * one centered tall arch, a shallow stepped threshold, a restrained halo
 * and orbital detailing. No raster-on-a-plane, no baked text, no external
 * models. The approved `portal-centered-*` raster stays in the page as the
 * static fallback until this scene succeeds (DESIGN-SPEC §6).
 *
 * Boundaries (DESIGN-SPEC §§5–7, ADR-0008):
 * - Gateway-only path: this module never imports the Home graph modules
 *   (`graph-scene`, `graph-layout`, `graph-controller`, `hero-enhancement`).
 * - Palette roles come from the authored CSS tokens at runtime; no second
 *   palette. Light reads mineral/ivory structure with teal/gold detail;
 *   dark reads navy structure with teal interior light and gold edges.
 * - Demand-driven rendering: mount, resize, palette change, entrance ticks.
 *   No endless RAF loop. One canvas per route.
 * - Performance ceilings shared with CA-04/06: DPR clamped (mobile ≤1,
 *   desktop ≤1.5), drawing buffer ≤1.5M px, ≤60 draw calls, ≤50k triangles.
 */

import * as THREE from 'three'
import {
  SCENE_PERFORMANCE_CEILINGS,
  type SceneMotionPreference,
  type ScenePalette,
} from './scene-contract'

/** Increment when this gateway contract changes. */
export const GATEWAY_CONTRACT_VERSION = 'ca07-1.0.0'

export type GatewayErrorCode =
  'webgl-unavailable' | 'import-rejected' | 'context-lost'

export interface GatewaySceneOptions {
  canvas: HTMLCanvasElement
  palette: ScenePalette
  motion: SceneMotionPreference
  onError?: (code: GatewayErrorCode) => void
}

export interface GatewaySceneHandle {
  render(): void
  resize(width: number, height: number, pixelRatio: number): void
  setPalette(palette: ScenePalette): void
  setMotion(motion: SceneMotionPreference): void
  dispose(): void
}

/** Check whether WebGL context creation is supported here. */
export function isWebGLAvailable(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

function resolveColor(
  palette: ScenePalette,
  role: keyof ScenePalette,
): THREE.Color {
  return new THREE.Color(palette[role] ?? palette.brand ?? '#087c73')
}

/** Centered tall arch outline with an inner opening (no text, no texture). */
function buildArchGeometry(): THREE.ExtrudeGeometry {
  const outer = new THREE.Shape()
  outer.moveTo(-30, -40)
  outer.lineTo(-30, 8)
  outer.absarc(0, 8, 30, Math.PI, 0, true)
  outer.lineTo(30, -40)
  outer.closePath()

  const inner = new THREE.Path()
  inner.moveTo(-21, -40)
  inner.lineTo(-21, 8)
  inner.absarc(0, 8, 21, Math.PI, 0, true)
  inner.lineTo(21, -40)
  inner.closePath()
  outer.holes.push(inner)

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: 6,
    bevelEnabled: false,
    curveSegments: 48,
  })
  geometry.center()
  return geometry
}

function ellipsePoints(
  radiusX: number,
  radiusY: number,
  segments: number,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radiusX,
        Math.sin(angle) * radiusY,
        0,
      ),
    )
  }
  return points
}

/** Procedural gateway portal factory. Exactly one active scene per route. */
export function createGatewayScene(
  options: GatewaySceneOptions,
): GatewaySceneHandle {
  const { canvas, onError } = options
  let currentPalette = { ...options.palette }
  let currentMotion: SceneMotionPreference = options.motion ?? 'full'
  void currentMotion
  let isDisposed = false

  if (!isWebGLAvailable(canvas)) {
    onError?.('webgl-unavailable')
    return createNoopHandle()
  }

  const scene = new THREE.Scene()
  scene.background = null // Transparent: integrates with the page canvas.

  const camera = new THREE.PerspectiveCamera(40, 1, 1, 600)
  camera.position.set(0, 2, 150)
  camera.lookAt(0, -4, 0)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
  } catch {
    onError?.('webgl-unavailable')
    return createNoopHandle()
  }

  const onContextLost = (event: Event) => {
    event.preventDefault()
    onError?.('context-lost')
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  // Quiet lighting: ambient wash plus a soft frontal key.
  const ambient = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xffffff, 0.45)
  key.position.set(15, 30, 120)
  scene.add(key)

  const portalGroup = new THREE.Group()
  scene.add(portalGroup)

  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const trackGeo = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.push(geometry)
    return geometry
  }
  const trackMat = <T extends THREE.Material>(material: T): T => {
    materials.push(material)
    return material
  }

  // Structural arch + restrained gold edges.
  const structuralMat = trackMat(
    new THREE.MeshLambertMaterial({
      color: resolveColor(currentPalette, 'surface'),
    }),
  )
  const edgeMat = trackMat(
    new THREE.LineBasicMaterial({
      color: resolveColor(currentPalette, 'signature'),
      transparent: true,
      opacity: 0.85,
    }),
  )
  const archGeo = trackGeo(buildArchGeometry())
  const arch = new THREE.Mesh(archGeo, structuralMat)
  portalGroup.add(arch)
  const archEdges = new THREE.LineSegments(
    trackGeo(new THREE.EdgesGeometry(archGeo, 24)),
    edgeMat,
  )
  portalGroup.add(archEdges)

  // Shallow stepped threshold below the arch base.
  const stepWidths = [76, 64, 52]
  stepWidths.forEach((width, index) => {
    const stepGeo = trackGeo(new THREE.BoxGeometry(width, 5, 16))
    const step = new THREE.Mesh(stepGeo, structuralMat)
    step.position.set(0, -46.5 - index * 5.5, -2 - index)
    portalGroup.add(step)
  })

  // Interior light: a calm translucent teal plane inside the opening.
  const interiorMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: resolveColor(currentPalette, 'brand'),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  )
  const interior = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(40, 72)),
    interiorMat,
  )
  interior.position.set(0, -3, -3)
  portalGroup.add(interior)

  // Restrained halo ring behind the arch crown.
  const haloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: resolveColor(currentPalette, 'signature'),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  )
  const halo = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(40, 41.6, 72)),
    haloMat,
  )
  halo.position.set(0, 2, -8)
  portalGroup.add(halo)

  // Orbital detailing: two tilted ellipses with cardinal glow points.
  const orbitMat = trackMat(
    new THREE.LineBasicMaterial({
      color: resolveColor(currentPalette, 'brand'),
      transparent: true,
      opacity: 0.35,
    }),
  )
  const orbitDefs = [
    { rx: 54, ry: 42, tiltX: 0.14, tiltY: 0.1, segments: 72 },
    { rx: 68, ry: 52, tiltX: -0.12, tiltY: 0.14, segments: 80 },
  ]
  for (const def of orbitDefs) {
    const orbit = new THREE.LineLoop(
      trackGeo(
        new THREE.BufferGeometry().setFromPoints(
          ellipsePoints(def.rx, def.ry, def.segments),
        ),
      ),
      orbitMat,
    )
    orbit.rotation.x = def.tiltX
    orbit.rotation.y = def.tiltY
    orbit.position.y = -4
    portalGroup.add(orbit)
  }
  const glowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: resolveColor(currentPalette, 'brand'),
    }),
  )
  const glowGeo = trackGeo(new THREE.SphereGeometry(1.8, 12, 12))
  for (const [x, y] of [
    [-54, -4],
    [54, -4],
    [0, 38],
    [0, -46],
  ] as const) {
    const dot = new THREE.Mesh(glowGeo, glowMat)
    dot.position.set(x, y, 0)
    portalGroup.add(dot)
  }

  function applyPalette() {
    structuralMat.color = resolveColor(currentPalette, 'surface')
    edgeMat.color = resolveColor(currentPalette, 'signature')
    interiorMat.color = resolveColor(currentPalette, 'brand')
    haloMat.color = resolveColor(currentPalette, 'signature')
    orbitMat.color = resolveColor(currentPalette, 'brand')
    glowMat.color = resolveColor(currentPalette, 'brand')
  }
  applyPalette()

  function renderScene() {
    if (isDisposed) return
    renderer.render(scene, camera)
  }

  if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
  }

  return {
    render() {
      renderScene()
    },

    resize(width: number, height: number, pixelRatio: number) {
      if (isDisposed || width <= 0 || height <= 0) return
      const isMobile = width < 768
      const maxDpr = isMobile
        ? SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioMobile
        : SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioDesktop
      let clampedDpr = Math.min(pixelRatio, maxDpr)
      const totalPixels = width * clampedDpr * height * clampedDpr
      if (totalPixels > SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels) {
        const factor = Math.sqrt(
          SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels / totalPixels,
        )
        clampedDpr = Math.max(0.75, clampedDpr * factor)
      }
      // Narrow slots get a flatter, farther camera so the arch never clips.
      camera.aspect = width / height
      camera.position.set(0, 2, width / height < 1 ? 190 : 150)
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(clampedDpr)
      renderer.setSize(width, height, false)
      renderScene()
    },

    setPalette(palette: ScenePalette) {
      if (isDisposed) return
      currentPalette = { ...palette }
      applyPalette()
      renderScene()
    },

    setMotion(motion: SceneMotionPreference) {
      currentMotion = motion
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true
      canvas.removeEventListener('webglcontextlost', onContextLost, false)
      for (const geometry of geometries.splice(0)) geometry.dispose()
      for (const material of materials.splice(0)) material.dispose()
      scene.clear()
      renderer.dispose()
    },
  }
}

function createNoopHandle(): GatewaySceneHandle {
  return {
    render() {},
    resize() {},
    setPalette() {},
    setMotion() {},
    dispose() {},
  }
}
