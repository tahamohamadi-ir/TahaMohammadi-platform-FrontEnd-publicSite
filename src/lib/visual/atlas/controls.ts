import type { AtlasSelectionState, SelectionModel } from '../../atlas/selection'
import type { AtlasOrbitPose } from './scene'

export interface GesturePoint {
  x: number
  y: number
  time: number
}

export const CLICK_SLOP_PX = 6
export const CLICK_MAX_MS = 500
export const MIN_DISTANCE_SCALE = 0.55
export const MAX_DISTANCE_SCALE = 2.1
export const ATLAS_EFFECTIVE_WIDTH_PROPERTY = '--atlas-effective-viewport-width'
export const ATLAS_PICK_EVENT = 'atlas:pick-request'

const ROTATE_PER_PX = 0.006
const ZOOM_PER_WHEEL_UNIT = 0.0012
const BUTTON_ZOOM_IN = 0.84
const BUTTON_ZOOM_OUT = 1.19
const INTERACTIVE_SELECTOR =
  'button, a[href], summary, input, select, textarea, label, [role="button"], [role="link"], [data-atlas-control]'

export interface AtlasControlScene {
  orbit(deltaYaw?: number, deltaPitch?: number): AtlasOrbitPose
  zoomBy(factor: number): void
  focusNode(nodeKey: string, effectiveWidth?: number): void
  focusRelation?(relationKey: string, effectiveWidth?: number): void
  resetView(animate?: boolean): void
  render(): void
}

export interface AtlasControlsOptions {
  region: HTMLElement
  scene: AtlasControlScene
  selection: SelectionModel
  onClear?: () => void
}

export interface AtlasControlsHandle {
  zoomBy(factor: number): void
  resetView(): void
  focusSelection(): void
  isDragging(): boolean
  dispose(): void
}

interface Focusable {
  focus(): void
}

interface ClearableSelection {
  clear(): void
}

interface PickRequestDetail {
  x: number
  y: number
  fullFocus: boolean
  effectiveWidth: number
  opener: HTMLElement | null
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

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

export function clampedZoomScale(current: number, factor: number): number {
  return clamp(current * factor, MIN_DISTANCE_SCALE, MAX_DISTANCE_SCALE)
}

export function clearSelectionAndRestoreFocus(
  selection: ClearableSelection,
  opener: Focusable | null,
): void {
  selection.clear()
  try {
    opener?.focus()
  } catch {
    // A detached opener must not prevent Escape from clearing selection.
  }
}

export function effectiveViewportWidth(
  stage: HTMLElement,
  inspector: HTMLElement | null,
): number {
  const stageWidth = stage.getBoundingClientRect().width
  const inspectorWidth = inspector?.getBoundingClientRect().width ?? 0
  return Math.max(1, stageWidth - inspectorWidth)
}

export function focusAtlasSelection(
  scene: AtlasControlScene,
  state: AtlasSelectionState,
  effectiveWidth: number,
): void {
  if (state.mode === 'node') scene.focusNode(state.key, effectiveWidth)
  else if (state.mode === 'relation') {
    scene.focusRelation?.(state.key, effectiveWidth)
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest(INTERACTIVE_SELECTOR) != null
  )
}

function focusableTarget(target: EventTarget | null): HTMLElement | null {
  if (typeof Element === 'undefined' || !(target instanceof Element))
    return null
  const selected = target.closest<HTMLElement>(
    '[data-atlas-node], [data-atlas-relation]',
  )
  if (!selected) return null
  if (typeof selected.focus === 'function') return selected
  return null
}

function dispatchPick(region: HTMLElement, detail: PickRequestDetail): void {
  if (typeof CustomEvent === 'function') {
    region.dispatchEvent(
      new CustomEvent<PickRequestDetail>(ATLAS_PICK_EVENT, { detail }),
    )
    return
  }
  const event = new Event(ATLAS_PICK_EVENT) as Event & {
    detail?: PickRequestDetail
  }
  event.detail = detail
  region.dispatchEvent(event)
}

export function createAtlasControls(
  options: AtlasControlsOptions,
): AtlasControlsHandle {
  const { region, scene, selection } = options
  const stage =
    region.querySelector<HTMLElement>('[data-atlas-stage]') ?? region
  const canvas =
    stage.querySelector<HTMLCanvasElement>('[data-atlas-canvas]') ?? stage
  const inspector = region.querySelector<HTMLElement>('[data-atlas-inspector]')
  const doc = region.ownerDocument
  let dragStart: GesturePoint | null = null
  let lastPoint: GesturePoint | null = null
  let dragging = false
  let pointerId: number | null = null
  let selectionOpener: HTMLElement | null = null
  const cleanups: Array<() => void> = []

  function now(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now()
  }

  function localPoint(event: {
    clientX: number
    clientY: number
  }): GesturePoint {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: now(),
    }
  }

  function updateEffectiveWidth(): number {
    const width = effectiveViewportWidth(stage, inspector)
    try {
      stage.style.setProperty(ATLAS_EFFECTIVE_WIDTH_PROPERTY, `${width}px`)
    } catch {
      // Geometry still uses the calculated width when styles are unavailable.
    }
    return width
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    if (isInteractiveTarget(event.target)) return
    const point = localPoint(event)
    dragStart = point
    lastPoint = point
    dragging = false
    pointerId = event.pointerId
    try {
      stage.setPointerCapture?.(event.pointerId)
    } catch {
      // Window-level pointer delivery remains a functional fallback.
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragStart || !lastPoint) return
    if (pointerId != null && event.pointerId !== pointerId) return
    const point = localPoint(event)
    const dx = point.x - lastPoint.x
    const dy = point.y - lastPoint.y
    lastPoint = point
    if (
      !dragging &&
      Math.hypot(point.x - dragStart.x, point.y - dragStart.y) <= CLICK_SLOP_PX
    ) {
      return
    }
    dragging = true
    scene.orbit(dx * ROTATE_PER_PX, dy * ROTATE_PER_PX)
    scene.render()
    event.preventDefault()
  }

  function finishPointer(event: PointerEvent): void {
    if (!dragStart) return
    if (pointerId != null && event.pointerId !== pointerId) return
    const point = localPoint(event)
    if (classifyGesture(dragStart, point) === 'click') {
      dispatchPick(region, {
        x: point.x,
        y: point.y,
        fullFocus: false,
        effectiveWidth: updateEffectiveWidth(),
        opener: focusableTarget(event.target),
      })
    }
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

  function cancelPointer(event: PointerEvent): void {
    if (pointerId != null && event.pointerId !== pointerId) return
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

  function onWheel(event: WheelEvent): void {
    if (isInteractiveTarget(event.target)) return
    event.preventDefault()
    const factor = Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT)
    scene.zoomBy(clamp(factor, 0.6, 1.6))
    scene.render()
  }

  function onDoubleClick(event: MouseEvent): void {
    if (isInteractiveTarget(event.target)) return
    const point = localPoint(event)
    dispatchPick(region, {
      x: point.x,
      y: point.y,
      fullFocus: true,
      effectiveWidth: updateEffectiveWidth(),
      opener: focusableTarget(event.target),
    })
  }

  function focusSelection(): void {
    const width = updateEffectiveWidth()
    focusAtlasSelection(scene, selection.state, width)
    scene.render()
  }

  function onClick(event: MouseEvent): void {
    const opener = focusableTarget(event.target)
    if (opener) selectionOpener = opener
    if (typeof Element === 'undefined' || !(event.target instanceof Element)) {
      return
    }
    const control = event.target.closest<HTMLElement>('[data-atlas-control]')
    const action = control?.getAttribute('data-atlas-control')
    if (!action) return
    if (action === 'zoom-in') {
      scene.zoomBy(BUTTON_ZOOM_IN)
      scene.render()
    } else if (action === 'zoom-out') {
      scene.zoomBy(BUTTON_ZOOM_OUT)
      scene.render()
    } else if (action === 'focus') {
      selectionOpener = control
      focusSelection()
    } else if (action === 'reset') {
      scene.resetView(true)
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || selection.state.mode === 'overview') return
    clearSelectionAndRestoreFocus(selection, selectionOpener)
    options.onClear?.()
  }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('pointermove', onPointerMove)
  stage.addEventListener('pointerup', finishPointer)
  stage.addEventListener('pointercancel', cancelPointer)
  stage.addEventListener('wheel', onWheel, { passive: false })
  stage.addEventListener('dblclick', onDoubleClick)
  region.addEventListener('click', onClick)
  doc?.addEventListener('keydown', onKeyDown)
  updateEffectiveWidth()

  cleanups.push(() => {
    stage.removeEventListener('pointerdown', onPointerDown)
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerup', finishPointer)
    stage.removeEventListener('pointercancel', cancelPointer)
    stage.removeEventListener('wheel', onWheel)
    stage.removeEventListener('dblclick', onDoubleClick)
    region.removeEventListener('click', onClick)
    doc?.removeEventListener('keydown', onKeyDown)
  })

  return {
    zoomBy(factor) {
      scene.zoomBy(factor)
      scene.render()
    },
    resetView() {
      scene.resetView(true)
    },
    focusSelection,
    isDragging() {
      return dragging
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup()
      dragStart = null
      lastPoint = null
      pointerId = null
    },
  }
}
