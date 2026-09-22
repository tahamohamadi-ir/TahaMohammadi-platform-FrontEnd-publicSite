/** Interaction, framing and visual tiers (Plan C Task 17).
 *
 * Mirrors the proven RU controls contract: pointer orbit with the
 * pointer-capture guard (in-stage native buttons keep working — the RU
 * regression that must not return), clamped wheel/button zoom, click-vs-drag
 * classification from the shared `CLICK_SLOP_PX`/`CLICK_MAX_MS` reasoning,
 * double-click and `Focus` → full focus, `Reset`, `Clear`, `Escape` clears
 * and restores focus to the control that opened the selection, mild reframe
 * on selection (≤ 15 % distance change), and inspector-aware framing via the
 * effective width (stage minus inspector). Label tiers read from
 * `visualPriority`: only `always`-tier labels exist at rest, capped at 10.
 *
 * DOM seam: the stage/canvas are structural (listeners + bounding rect), so
 * tests inject fakes — no DOM library, no new dependency.
 */
import type { AtlasPayload } from '../../atlas/model'
import { alwaysLabelKeys } from '../../atlas/layout'

/** Click-vs-drag reasoning, shared with the RU controls. */
export const ATLAS_CLICK_SLOP_PX = 6
export const ATLAS_CLICK_MAX_MS = 500
/** Wheel sensitivity; one notch is a ~12% distance change. */
export const ATLAS_ZOOM_PER_WHEEL_UNIT = 0.0012
/** Radians of rotation per CSS pixel of drag. */
export const ATLAS_ROTATE_PER_PX = 0.006
/** Reframe budget: a selection never moves the camera more than this. */
export const ATLAS_REFRAME_MAX = 0.15

export interface AtlasGesturePoint {
  x: number
  y: number
  time: number
}

export function classifyAtlasGesture(
  start: AtlasGesturePoint,
  end: AtlasGesturePoint,
): 'click' | 'drag' {
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const elapsed = Math.abs(end.time - start.time)
  if (distance > ATLAS_CLICK_SLOP_PX && distance > elapsed * 0.05) return 'drag'
  if (elapsed > ATLAS_CLICK_MAX_MS && distance > ATLAS_CLICK_SLOP_PX)
    return 'drag'
  return distance <= ATLAS_CLICK_SLOP_PX ? 'click' : 'drag'
}

/** Structural surface the controls need from the scene. */
export interface AtlasControlsScene {
  rotateBy(deltaYaw: number, deltaPitch: number): void
  zoomBy(factor: number): void
  focusNode(nodeKey: string): void
  resetView(animate?: boolean): void
  setSelection(nodeKey: string | null): void
  setSelectedRelation(relationKey: string | null): void
  render(): void
}

export interface AtlasPickResult {
  kind: 'node' | 'edge' | 'none'
  id: string | null
}

export interface AtlasStageLike {
  addEventListener(type: string, handler: (event: never) => void): void
  removeEventListener(type: string, handler: (event: never) => void): void
  setPointerCapture?(pointerId: number): void
  releasePointerCapture?(pointerId: number): void
}

export interface AtlasCanvasLike {
  getBoundingClientRect(): { left: number; top: number }
}

export interface AtlasControlsOptions {
  stage: AtlasStageLike
  canvas: AtlasCanvasLike
  scene: AtlasControlsScene
  onPick: (result: AtlasPickResult) => void
  /** Screen-space pick; defaults to none (the scene wires Task 17's picker). */
  selectAt?: (x: number, y: number) => AtlasPickResult
}

export interface AtlasFrameViewport {
  width: number
  height: number
  selectedKey: string | null
  /** ≤ 15 % reframe budget already applied by the caller. */
  reframeScale: number
}

export interface AtlasControlsHandle {
  zoomBy(factor: number): void
  resetView(): void
  focus(nodeKey: string | null): void
  clear(): void
  isDragging(): boolean
  /** Remember the control that opened the selection (Escape returns here). */
  noteOpener(
    control: { focus(options?: { preventScroll?: boolean }): void } | null,
  ): void
  /** Effective viewport: stage minus inspector, for framing calls. */
  frameFor(viewport: {
    stageWidth: number
    inspectorWidth: number
    height: number
    selectedKey: string | null
  }): AtlasFrameViewport
  dispose(): void
}

/** Elements that own their pointer interaction; never start a scene drag. */
const INTERACTIVE_SELECTOR =
  'button, a[href], summary, input, select, textarea, label, [role="button"], [role="link"]'

function isInteractiveTarget(target: unknown): boolean {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target.closest(INTERACTIVE_SELECTOR) != null
  }
  const candidate = target as {
    closest?: (selector: string) => unknown
  } | null
  try {
    return candidate?.closest?.(INTERACTIVE_SELECTOR) != null
  } catch {
    return false
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/** Label tiers from relation `visualPriority`: rest shows `always` only.
 *
 * The spec's always-on cap (§13.6) is global — 10 chips — so the expansion
 * from always-tier *types* to relation *keys* is capped globally too, in
 * deterministic ((-visualPriority, type key), relation key) order. */
export function alwaysTierRelationKeys(payload: AtlasPayload): string[] {
  const importance = payload.relationTypes.map((type) => ({
    key: type.key,
    importance: type.visualPriority,
  }))
  // Top-10 types mirror the node label tier (layout.alwaysLabelKeys).
  const keys: string[] = []
  for (const typeKey of alwaysLabelKeys(importance)) {
    const members = payload.relations
      .filter((relation) => relation.type === typeKey)
      .map((relation) => relation.key)
      .sort((a, b) => (a < b ? -1 : 1))
    for (const key of members) {
      if (keys.length >= 10) return keys
      keys.push(key)
    }
  }
  return keys
}

/** Edge sampling tier from `relation_type.visual_priority` (spec §13.6):
 * ≥80 → 26 samples (current fidelity), 40–79 → 16, <40 → 10.
 *
 * Pure mapping only: the per-tier `LineSegments` draw split needs the edges
 * draw path, so geometry tiering rides with the scene wiring. Until then
 * every edge renders at full fidelity — correct, not yet tiered. */
export function edgeSamplesFor(visualPriority: number): 26 | 16 | 10 {
  if (!Number.isFinite(visualPriority)) return 10
  if (visualPriority >= 80) return 26
  if (visualPriority >= 40) return 16
  return 10
}

export function createAtlasControls(
  options: AtlasControlsOptions,
): AtlasControlsHandle {
  const { stage, canvas, scene, onPick } = options
  const selectAt =
    options.selectAt ?? ((): AtlasPickResult => ({ kind: 'none', id: null }))
  let dragStart: AtlasGesturePoint | null = null
  let lastPoint: AtlasGesturePoint | null = null
  let dragging = false
  let pointerId: number | null = null
  let opener: { focus(options?: { preventScroll?: boolean }): void } | null =
    null
  const cleanups: Array<() => void> = []

  function localPoint(event: {
    clientX: number
    clientY: number
  }): AtlasGesturePoint {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: now(),
    }
  }

  function onPointerDown(event: never): void {
    const typed = event as unknown as {
      button?: number
      pointerType?: string
      pointerId: number
      clientX: number
      clientY: number
      target: unknown
    }
    if (typed.button !== 0 && typed.pointerType === 'mouse') return
    // The RU regression that must not return: capturing the pointer here
    // retargets later events to the stage, so the browser dispatches `click`
    // to the stage instead of the button and every in-stage control dies to
    // mouse input. Only a bare surface may start a drag.
    if (isInteractiveTarget(typed.target)) return
    const point = localPoint(typed)
    dragStart = point
    lastPoint = point
    dragging = false
    pointerId = typed.pointerId
    try {
      stage.setPointerCapture?.(typed.pointerId)
    } catch {
      // Older browsers: drag still works through stage listeners.
    }
  }

  function onPointerMove(event: never): void {
    if (dragStart == null || lastPoint == null) return
    const typed = event as unknown as {
      pointerId: number
      clientX: number
      clientY: number
      preventDefault(): void
    }
    if (pointerId != null && typed.pointerId !== pointerId) return
    const point = localPoint(typed)
    const dx = point.x - lastPoint.x
    const dy = point.y - lastPoint.y
    lastPoint = point
    if (!dragging) {
      if (
        Math.hypot(point.x - dragStart.x, point.y - dragStart.y) <=
        ATLAS_CLICK_SLOP_PX
      )
        return
      dragging = true
    }
    scene.rotateBy(dx * ATLAS_ROTATE_PER_PX, dy * ATLAS_ROTATE_PER_PX)
    scene.render()
    typed.preventDefault()
  }

  function onPointerUp(event: never): void {
    if (dragStart == null) return
    const typed = event as unknown as {
      pointerId: number
      clientX: number
      clientY: number
    }
    if (pointerId != null && typed.pointerId !== pointerId) return
    const point = localPoint(typed)
    const start = dragStart
    dragStart = null
    lastPoint = null
    dragging = false
    pointerId = null
    try {
      stage.releasePointerCapture?.(typed.pointerId)
    } catch {
      // Nothing to release.
    }
    if (classifyAtlasGesture(start, point) !== 'click') return
    const picked = selectAt(point.x, point.y)
    if (picked.kind === 'node') scene.setSelection(picked.id)
    else if (picked.kind === 'edge') scene.setSelectedRelation(picked.id)
    else {
      scene.setSelection(null)
      scene.setSelectedRelation(null)
    }
    scene.render()
    onPick(picked)
  }

  function onWheel(event: never): void {
    const typed = event as unknown as {
      deltaY: number
      preventDefault(): void
    }
    typed.preventDefault()
    const factor = Math.exp(typed.deltaY * ATLAS_ZOOM_PER_WHEEL_UNIT)
    scene.zoomBy(clampZoom(factor))
    scene.render()
  }

  function onDoubleClick(event: never): void {
    const typed = event as unknown as { clientX: number; clientY: number }
    const point = localPoint(typed)
    const picked = selectAt(point.x, point.y)
    onPick(picked)
    // Double-click focuses only when it landed on a node, and never throws.
    if (picked.kind === 'node' && picked.id) {
      scene.focusNode(picked.id)
      scene.render()
    }
  }

  function onKeyDown(event: never): void {
    const typed = event as unknown as {
      key: string
      preventDefault(): void
    }
    if (typed.key !== 'Escape') return
    typed.preventDefault()
    scene.setSelection(null)
    scene.setSelectedRelation(null)
    scene.render()
    opener?.focus({ preventScroll: true })
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', onPointerUp)
  stage.addEventListener('pointercancel', onPointerUp)
  stage.addEventListener('wheel', onWheel)
  stage.addEventListener('dblclick', onDoubleClick)
  stage.addEventListener('keydown', onKeyDown)
  cleanups.push(() => {
    stage.removeEventListener('pointerdown', onPointerDown)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerup', onPointerUp)
    stage.removeEventListener('pointercancel', onPointerUp)
    stage.removeEventListener('wheel', onWheel)
    stage.removeEventListener('dblclick', onDoubleClick)
    stage.removeEventListener('keydown', onKeyDown)
  })

  return {
    zoomBy(factor) {
      scene.zoomBy(clampZoom(factor))
      scene.render()
    },
    resetView() {
      scene.resetView(true)
    },
    focus(nodeKey) {
      if (nodeKey) scene.focusNode(nodeKey)
      else scene.resetView(true)
      scene.render()
    },
    clear() {
      scene.setSelection(null)
      scene.setSelectedRelation(null)
      scene.render()
    },
    isDragging() {
      return dragging
    },
    noteOpener(control) {
      opener = control
    },
    frameFor(viewport) {
      // Inspector-aware framing: the camera frames the effective width, not
      // the full stage, so a selected node never hides behind the panel.
      const width = Math.max(viewport.stageWidth - viewport.inspectorWidth, 1)
      return {
        width,
        height: viewport.height,
        selectedKey: viewport.selectedKey,
        reframeScale: 1,
      }
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup()
      dragStart = null
      lastPoint = null
      opener = null
    },
  }
}

function clampZoom(factor: number): number {
  if (!Number.isFinite(factor)) return 1
  return Math.max(0.6, Math.min(1.6, factor))
}
