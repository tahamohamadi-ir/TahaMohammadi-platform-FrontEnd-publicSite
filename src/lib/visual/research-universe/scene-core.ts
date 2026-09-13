/**
 * RU-02 — Scene core: renderer, camera and the render-on-change scheduler.
 *
 * Shared by BOTH presentations (guided Home, interactive About). What lives here
 * is everything that must be identical in each:
 * - one WebGLRenderer per region, DPR-clamped to the existing CA-03 ceilings;
 * - ONE scheduled render source: `requestRender()` coalesces a burst of state
 *   changes into a single frame and then STOPS. There is no permanent rAF loop,
 *   so an idle universe costs nothing;
 * - offscreen/hidden work is suspended without tearing down state;
 * - context loss is reported, never swallowed;
 * - every disposable resource is released through the ledger.
 */

import * as THREE from 'three'
import {
  SCENE_PERFORMANCE_CEILINGS,
  type SceneErrorCode,
} from '../scene-contract'
import { UniverseLedger } from './dispose'
import type { UniverseRenderTheme } from './theme'

export interface SceneCoreOptions {
  canvas: HTMLCanvasElement
  theme: UniverseRenderTheme
  fov?: number
  onError?: (code: SceneErrorCode) => void
}

export interface SceneCore {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly ledger: UniverseLedger
  readonly groups: {
    orbits: THREE.Group
    edges: THREE.Group
    nodes: THREE.Group
    core: THREE.Group
  }
  theme: UniverseRenderTheme
  /** Coalesced render-on-change; safe to call from any state transition. */
  requestRender(): void
  renderNow(): void
  resize(width: number, height: number, devicePixelRatio: number): SceneResize
  setTheme(theme: UniverseRenderTheme): void
  setVisible(visible: boolean): void
  setLights(theme: UniverseRenderTheme): void
  /** Called after every rendered frame (label projection hook). */
  setOnFrame(callback: (() => void) | null): void
  /** View-projection matrix + CSS viewport, for labels and hit testing. */
  projection(): { matrix: number[]; width: number; height: number }
  dispose(): void
}

export interface SceneResize {
  width: number
  height: number
  pixelRatio: number
  isMobile: boolean
}

/** DPR ceiling for a viewport width, mirroring the CA-03 contract. */
export function clampedPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
): number {
  const isMobile = width < 768
  const ceiling = isMobile
    ? SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioMobile
    : SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioDesktop
  const requested =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1
  let ratio = Math.min(requested, ceiling)

  // Drawing-buffer ceiling: shrink rather than allocate an oversized buffer.
  const pixels = width * ratio * height * ratio
  if (pixels > SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels) {
    const factor = Math.sqrt(
      SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels / pixels,
    )
    ratio = Math.max(0.75, ratio * factor)
  }
  return ratio
}

export function createSceneCore(options: SceneCoreOptions): SceneCore | null {
  const { canvas, onError } = options
  let theme = options.theme
  let disposed = false
  let visible = true
  let frameHandle: number | null = null
  let onFrame: (() => void) | null = null

  if (!isWebGLAvailable(canvas)) {
    onError?.('webgl-unavailable')
    return null
  }

  const ledger = new UniverseLedger()
  const scene = new THREE.Scene()
  scene.background = null

  const camera = new THREE.PerspectiveCamera(options.fov ?? 42, 1, 1, 4000)
  camera.position.set(0, 0, 220)

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
    return null
  }
  renderer.setClearAlpha(0)

  const groups = {
    orbits: new THREE.Group(),
    edges: new THREE.Group(),
    nodes: new THREE.Group(),
    core: new THREE.Group(),
  }
  groups.orbits.name = 'universe-orbits'
  groups.edges.name = 'universe-edges'
  groups.nodes.name = 'universe-nodes'
  groups.core.name = 'universe-core'
  for (const group of Object.values(groups)) scene.add(group)

  const ambient = new THREE.AmbientLight(0xffffff, theme.ambientIntensity)
  const key = new THREE.DirectionalLight(0xffffff, theme.keyLightIntensity)
  key.position.set(38, 62, 96)
  const rim = new THREE.DirectionalLight(0xffffff, theme.rimLightIntensity)
  rim.position.set(-58, -34, 48)
  scene.add(ambient)
  scene.add(key)
  scene.add(rim)

  const onContextLost = (event: Event) => {
    event.preventDefault()
    onError?.('context-lost')
  }
  ledger.listen(
    canvas,
    'webglcontextlost',
    onContextLost as (...args: never[]) => void,
    false,
  )

  function renderNow(): void {
    if (disposed) return
    if (frameHandle != null) {
      cancelFrame(frameHandle)
      frameHandle = null
    }
    if (!visible) return
    renderer.render(scene, camera)
    onFrame?.()
  }

  function requestRender(): void {
    if (disposed || frameHandle != null) return
    // One scheduled frame per burst; nothing is queued while idle.
    frameHandle = requestFrame(() => {
      frameHandle = null
      renderNow()
    })
  }

  function setLights(next: UniverseRenderTheme): void {
    ambient.intensity = next.ambientIntensity
    key.intensity = next.keyLightIntensity
    rim.intensity = next.rimLightIntensity
  }

  renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1, false)

  const core: SceneCore = {
    renderer,
    scene,
    camera,
    ledger,
    groups,
    theme,
    requestRender,
    renderNow,
    resize(
      width: number,
      height: number,
      devicePixelRatio: number,
    ): SceneResize {
      const isMobile = width < 768
      const pixelRatio = clampedPixelRatio(width, height, devicePixelRatio)
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
      camera.aspect = width > 0 && height > 0 ? width / height : 1
      camera.updateProjectionMatrix()
      renderNow()
      return { width, height, pixelRatio, isMobile }
    },
    setTheme(next: UniverseRenderTheme) {
      theme = next
      core.theme = next
      setLights(next)
    },
    setLights,
    setVisible(next: boolean) {
      visible = next
      if (next) requestRender()
      else if (frameHandle != null) {
        cancelFrame(frameHandle)
        frameHandle = null
      }
    },
    setOnFrame(callback: (() => void) | null) {
      onFrame = callback
    },
    projection() {
      camera.updateMatrixWorld()
      const matrix = new THREE.Matrix4()
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .toArray()
      return {
        matrix,
        width: canvas.clientWidth || 1,
        height: canvas.clientHeight || 1,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (frameHandle != null) {
        cancelFrame(frameHandle)
        frameHandle = null
      }
      onFrame = null
      ledger.dispose()
      scene.clear()
      renderer.dispose()
    },
  }
  return core
}

/** WebGL probe; matches the existing CA-04 check so both paths agree. */
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

function requestFrame(callback: () => void): number {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    return window.requestAnimationFrame(callback)
  }
  return setTimeout(callback, 16) as unknown as number
}

function cancelFrame(handle: number): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    window.cancelAnimationFrame(handle)
    return
  }
  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>)
}
