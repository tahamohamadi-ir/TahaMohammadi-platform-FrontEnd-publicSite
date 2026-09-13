/**
 * RU-04 — About pointer/keyboard controls.
 *
 * Translates raw pointer input into the three things the interactive About
 * universe supports: orbit (drag), constrained zoom (wheel / pinch / buttons),
 * and selection (click without drag). All of it is delegated to real DOM
 * elements so it works with mouse, pen, touch and — for zoom/reset — the
 * keyboard through native buttons.
 *
 * Deliberate boundaries:
 * - the canvas gets no `tabindex`: it is `aria-hidden` and adds no second
 *   keyboard tree. Camera zoom/reset are native `<button>`s in the component;
 * - wheel is captured ONLY while the pointer is over the stage (the surface is a
 *   dedicated 70–85vh viewer), and `touch-action: pan-y` keeps vertical touch
 *   scrolling working, so the page is never scroll-trapped;
 * - a drag is never also a click: gestures are classified by distance + time.
 */

import type { AboutSceneHandle } from './about-scene'

export interface GesturePoint {
  x: number
  y: number
  time: number
}

/** Movement below this many pixels is still a click, not a drag. */
export const CLICK_SLOP_PX = 6
/** Gestures longer than this are drags regardless of distance. */
export const CLICK_MAX_MS = 500

/**
 * Pure gesture classifier, so "drag must not select" is unit-testable.
 */
export function classifyGesture(
  start: GesturePoint,
  end: GesturePoint,
): 'click' | 'drag' {
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const elapsed = Math.abs(end.time - start.time)
  if (distance > CLICK_SLOP_PX && distance > elapsed * 0.05) return 'drag'
  if (elapsed > CLICK_MAX_MS && distance > CLICK_SLOP_PX) return 'drag'
  return distance <= CLICK_SLOP_PX ? 'click' : 'drag'
}

export interface AboutControlsOptions {
  stage: HTMLElement
  canvas: HTMLCanvasElement
  scene: AboutSceneHandle
  onPick: (result: {
    kind: 'node' | 'edge' | 'none'
    id: string | null
  }) => void
}

export interface AboutControlsHandle {
  /** Keyboard/button zoom by a multiplicative factor. */
  zoomBy(factor: number): void
  resetView(): void
  /** Focus the currently selected node, if any. */
  focus(nodeId: string | null): void
  isDragging(): boolean
  dispose(): void
}

/** Radians of rotation per CSS pixel of drag. */
const ROTATE_PER_PX = 0.006
/** Wheel sensitivity; one notch is a ~12% distance change. */
const ZOOM_PER_WHEEL_UNIT = 0.0012

export function createAboutControls(
  options: AboutControlsOptions,
): AboutControlsHandle {
  const { stage, canvas, scene, onPick } = options
  let dragStart: GesturePoint | null = null
  let lastPoint: GesturePoint | null = null
  let dragging = false
  let pointerId: number | null = null
  const cleanups: Array<() => void> = []

  function localPoint(event: {
    clientX: number
    clientY: number
  }): GesturePoint {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const point = localPoint(event)
    dragStart = point
    lastPoint = point
    dragging = false
    pointerId = event.pointerId
    try {
      stage.setPointerCapture?.(event.pointerId)
    } catch {
      // Older browsers: drag still works through window listeners.
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (dragStart == null || lastPoint == null) return
    if (pointerId != null && event.pointerId !== pointerId) return
    const point = localPoint(event)
    const dx = point.x - lastPoint.x
    const dy = point.y - lastPoint.y
    lastPoint = point
    if (!dragging) {
      if (
        Math.hypot(point.x - dragStart.x, point.y - dragStart.y) <=
        CLICK_SLOP_PX
      )
        return
      dragging = true
    }
    // Horizontal drag orbits; vertical drag tilts, within the scene's clamps.
    scene.rotateBy(dx * ROTATE_PER_PX, dy * ROTATE_PER_PX)
    event.preventDefault()
  }

  function resolveTap(event: PointerEvent) {
    const point = localPoint(event)
    const start = dragStart
    const verdict =
      start == null
        ? { kind: 'none' as const, id: null }
        : classifyGesture(start, point) === 'click'
          ? scene.selectAt(point.x, point.y)
          : { kind: 'none' as const, id: null }
    if (start != null && classifyGesture(start, point) === 'click')
      onPick(verdict)
  }

  function onPointerUp(event: PointerEvent) {
    if (dragStart == null) return
    if (pointerId != null && event.pointerId !== pointerId) return
    resolveTap(event)
    dragStart = null
    lastPoint = null
    dragging = false
    pointerId = null
    try {
      stage.releasePointerCapture?.(event.pointerId)
    } catch {
      // Nothing to release.
    }
  }

  function onWheel(event: WheelEvent) {
    // Trackpad pinch arrives as ctrlKey+wheel; both zoom.
    event.preventDefault()
    const factor = Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT)
    scene.zoomBy(Math.max(0.6, Math.min(1.6, factor)))
  }

  function onDoubleClick(event: MouseEvent) {
    const point = localPoint(event)
    const picked = scene.selectAt(point.x, point.y)
    onPick(picked)
    // Double-click focuses only when it landed on a node, and never throws.
    if (picked.kind === 'node' && picked.id) scene.focusNode(picked.id)
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerUp)
  stage.addEventListener('wheel', onWheel, { passive: false })
  stage.addEventListener('dblclick', onDoubleClick)
  cleanups.push(() => {
    stage.removeEventListener('pointerdown', onPointerDown)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerup', onPointerUp)
    stage.removeEventListener('pointercancel', onPointerUp)
    stage.removeEventListener('wheel', onWheel)
    stage.removeEventListener('dblclick', onDoubleClick)
  })

  return {
    zoomBy(factor) {
      scene.zoomBy(factor)
    },
    resetView() {
      scene.resetView(true)
    },
    focus(nodeId) {
      if (nodeId) scene.focusNode(nodeId)
      else scene.resetView(true)
    },
    isDragging() {
      return dragging
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup()
      dragStart = null
      lastPoint = null
    },
  }
}
