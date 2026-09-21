/**
 * Progressive enhancement for the public Knowledge Atlas.
 *
 * The server-rendered index remains the source of truth. This module reserves
 * at most one Atlas region per document, starts the conditional refresh
 * without delaying graphics, and only then lazily loads the optional 3D path.
 */

import type { AtlasPayload } from '../../atlas/model'
import {
  scenePaletteFromCss,
  type SceneMotionPreference,
} from '../scene-contract'
import {
  buildUniverseTheme,
  resolveThemeMode,
  type UniverseRenderTheme,
} from '../research-universe/theme'
import {
  refreshAtlas,
  type AtlasAdoptDetail,
  type AtlasRefreshOutcome,
  type RefreshAtlasOptions,
} from '../../atlas/refresh'
import {
  createSelectionModel,
  type SelectionModel,
} from '../../atlas/selection'
import { project2d, type Projection2dViewMode } from '../../atlas/projection-2d'
import { subscribeReducedMotion } from './motion-preference'
import {
  applyFocus,
  parseFocus,
  readFocusFromLocation,
  type AtlasFocus,
} from '../../atlas/url-state'

export type AtlasEnhancementState = 'enhanced' | 'fallback' | 'list'

export type AtlasEnhancementReason =
  | 'already-enhanced'
  | 'import-rejected'
  | 'invalid-payload'
  | 'not-eligible'
  | 'scene-init-failed'
  | 'controls-init-failed'
  | 'picking-init-failed'
  | 'viewport-2d'
  | 'webgl-unavailable'
  | null

export interface AtlasEnhancementHandle {
  state: AtlasEnhancementState
  reason: AtlasEnhancementReason
  dispose(): void
}

type ModuleLoader = () => Promise<unknown>
type RefreshRunner = (
  options: RefreshAtlasOptions,
) => Promise<AtlasRefreshOutcome>

export interface AtlasEnhancementOptions {
  doc?: Document
  win?: Window
  /** Test seams for modules supplied by Task 16 and later tasks. */
  loadScene?: ModuleLoader
  loadControls?: ModuleLoader
  loadPicking?: ModuleLoader
  loadLabels?: ModuleLoader
  /** Test seam; the default is the Task-7 public refresh API. */
  refreshAtlas?: RefreshRunner
}

interface Disposable {
  dispose(): void
}

interface AtlasSceneHandle extends Partial<Disposable> {
  setSelection?(focus: AtlasFocus | null): void
  setPayload?(payload: AtlasPayload): void
  setMotion?(motion: SceneMotionPreference): void
}

interface SceneModule {
  createAtlasScene?: (options: {
    canvas: HTMLCanvasElement
    region: HTMLElement
    payload: AtlasPayload
    theme: UniverseRenderTheme
    motion: SceneMotionPreference
    selection: SelectionModel
    labels: unknown
    onError: (reason: AtlasEnhancementReason) => void
  }) => AtlasSceneHandle | null | Promise<AtlasSceneHandle | null>
}

interface ControlsModule {
  createAtlasControls?: (options: {
    region: HTMLElement
    scene: AtlasSceneHandle
    selection: SelectionModel
    onClear: () => void
  }) => Disposable | void
}

interface PickingModule {
  createAtlasPicking?: (options: {
    region: HTMLElement
    scene: AtlasSceneHandle
    selection: SelectionModel
    onSelect: (focus: AtlasFocus | null, opener: HTMLElement | null) => void
  }) => Disposable | void
}

interface LabelsModule {
  createLabelLayer?: (options: {
    container: HTMLElement
    className: string
  }) => unknown
}

const regionFlights = new WeakMap<
  HTMLElement,
  Promise<AtlasEnhancementHandle>
>()
const documentRegions = new WeakMap<Document, HTMLElement>()

function attribute(element: Element, name: string): string | null {
  try {
    return element.getAttribute(name)
  } catch {
    return null
  }
}

function writePresentation(
  region: HTMLElement,
  state: AtlasEnhancementState,
  reason: AtlasEnhancementReason,
  presentation: '2d' | '3d',
  selectionState = 'overview',
): void {
  try {
    region.setAttribute('data-atlas-presentation', presentation)
    region.setAttribute('data-atlas-enhancement', state)
    region.setAttribute('data-atlas-state', selectionState)
    if (reason) region.setAttribute('data-atlas-reason', reason)
    else region.removeAttribute('data-atlas-reason')
  } catch {
    // Diagnostics must never be able to break the semantic index.
  }
}

function listHandle(
  region: HTMLElement,
  reason: Exclude<AtlasEnhancementReason, null>,
): AtlasEnhancementHandle {
  writePresentation(region, 'list', reason, '2d')
  return { state: 'list', reason, dispose: () => {} }
}

function hasWebGl(win: Window): boolean {
  try {
    return (
      'WebGLRenderingContext' in win &&
      typeof win.WebGLRenderingContext !== 'undefined'
    )
  } catch {
    return false
  }
}

function hasDesktopViewport(win: Window): boolean {
  try {
    return win.matchMedia('(min-width: 1024px)').matches
  } catch {
    return false
  }
}

function sceneTheme(doc: Document): UniverseRenderTheme {
  let palette = {
    canvas: '#071225',
    ink: '#f7f3ea',
    brand: '#16b8a6',
    signature: '#c89b3c',
    research: '#8b75dc',
    context: '#42a98c',
    surface: '#0b1630',
  }
  try {
    const style = doc.defaultView?.getComputedStyle(doc.documentElement)
    if (style) {
      palette = scenePaletteFromCss((name) =>
        style.getPropertyValue(name).trim(),
      )
    }
  } catch {
    // Use the dark-first token fallback.
  }
  return buildUniverseTheme(palette, resolveThemeMode(doc.documentElement))
}

function sceneMotion(win: Window): SceneMotionPreference {
  try {
    return win.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'reduced'
      : 'full'
  } catch {
    return 'full'
  }
}

function ensureSceneCanvas(
  region: HTMLElement,
  doc: Document,
): HTMLCanvasElement | null {
  const existing = region.querySelector<HTMLCanvasElement>(
    'canvas[data-atlas-canvas]',
  )
  if (existing) return existing
  if (typeof doc.createElement !== 'function') return null
  const canvas = doc.createElement('canvas')
  canvas.setAttribute('data-atlas-canvas', '')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('tabindex', '-1')
  canvas.className = 'atlas__canvas'
  const stage =
    region.querySelector<HTMLElement>('[data-atlas-stage]') ?? region
  stage.append(canvas)
  return canvas
}

function readPayload(region: HTMLElement): AtlasPayload | null {
  try {
    const script = region.querySelector('#atlas-payload, [data-atlas-payload]')
    if (!script?.textContent) return null
    const parsed = JSON.parse(script.textContent) as AtlasPayload
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.relations) ||
      typeof parsed.locale !== 'string' ||
      typeof parsed.version !== 'object'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function focusFromSelection(selection: SelectionModel): AtlasFocus | null {
  const state = selection.state
  return state.mode === 'overview' ? null : { kind: state.mode, key: state.key }
}

function selectedKey(selection: SelectionModel): string | null {
  const state = selection.state
  return state.mode === 'overview' ? null : state.key
}

function applySelection(
  selection: SelectionModel,
  focus: AtlasFocus | null,
): void {
  if (!focus) selection.clear()
  else if (focus.kind === 'node') selection.selectNode(focus.key)
  else selection.selectRelation(focus.key)
}

function syncSelectionDom(
  region: HTMLElement,
  selection: SelectionModel,
  scene: AtlasSceneHandle | null,
): void {
  const focus = focusFromSelection(selection)
  const state = selection.state
  region.setAttribute('data-atlas-state', state.mode)

  for (const element of Array.from(
    region.querySelectorAll<HTMLElement>('[data-atlas-node]'),
  )) {
    element.setAttribute(
      'data-selected',
      focus?.kind === 'node' &&
        attribute(element, 'data-atlas-node') === focus.key
        ? 'true'
        : 'false',
    )
  }
  for (const element of Array.from(
    region.querySelectorAll<HTMLElement>('[data-atlas-relation]'),
  )) {
    element.setAttribute(
      'data-selected',
      focus?.kind === 'relation' &&
        attribute(element, 'data-atlas-relation') === focus.key
        ? 'true'
        : 'false',
    )
  }
  for (const panel of Array.from(
    region.querySelectorAll<HTMLElement>('[data-atlas-inspector-node]'),
  )) {
    panel.hidden =
      focus?.kind !== 'node' ||
      attribute(panel, 'data-atlas-inspector-node') !== focus.key
  }
  for (const panel of Array.from(
    region.querySelectorAll<HTMLElement>('[data-atlas-inspector-relation]'),
  )) {
    panel.hidden =
      focus?.kind !== 'relation' ||
      attribute(panel, 'data-atlas-inspector-relation') !== focus.key
  }
  region
    .querySelector<HTMLElement>('[data-atlas-inspector-prompt]')
    ?.toggleAttribute('hidden', focus != null)
  try {
    scene?.setSelection?.(focus)
  } catch {
    // The semantic selection remains usable if scene synchronization fails.
  }
}

function renderProjection2d(
  region: HTMLElement,
  payload: AtlasPayload,
  focusKey: string | null,
  viewMode: Projection2dViewMode,
  doc: Document,
): void {
  const svg = region.querySelector<SVGSVGElement>('[data-atlas-projection]')
  if (!svg || typeof doc.createElementNS !== 'function') return
  const width = Number(attribute(svg, 'data-atlas-viewport-width')) || 390
  const height = Number(attribute(svg, 'data-atlas-viewport-height')) || 520
  const mode =
    attribute(svg, 'data-atlas-projection') === 'about-preview'
      ? 'about-preview'
      : attribute(svg, 'data-atlas-projection') === 'webgl-fallback'
        ? 'webgl-fallback'
        : 'mobile-overview'
  const projection = project2d(payload, {
    mode,
    viewport: { width, height },
    focusKey,
    viewMode,
  })
  const edgeLayer = svg.querySelector<SVGGElement>('.atlas-projection__edges')
  const nodeLayer = svg.querySelector<SVGGElement>('.atlas-projection__nodes')
  if (!edgeLayer || !nodeLayer) return

  edgeLayer.replaceChildren()
  nodeLayer.replaceChildren()
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.removeAttribute('tabindex')
  const labels = new Map(payload.nodes.map((node) => [node.key, node.label]))
  const namespace = 'http://www.w3.org/2000/svg'
  for (const edge of projection.edges) {
    const path = doc.createElementNS(namespace, 'path')
    path.setAttribute('class', 'atlas-projection__edge')
    path.setAttribute('data-atlas-edge', edge.key)
    path.setAttribute('d', edge.path)
    edgeLayer.append(path)
  }
  for (const node of projection.nodes) {
    const group = doc.createElementNS(namespace, 'g')
    group.setAttribute('class', 'atlas-projection__node')
    group.setAttribute('data-atlas-node', node.key)
    group.setAttribute('data-atlas-tier', node.tier)
    group.setAttribute('transform', `translate(${node.cx} ${node.cy})`)

    const hitTarget = doc.createElementNS(namespace, 'circle')
    hitTarget.setAttribute('class', 'atlas-projection__hit-target')
    hitTarget.setAttribute('cx', '0')
    hitTarget.setAttribute('cy', '0')
    hitTarget.setAttribute('r', String(Math.max(22, node.r)))
    group.append(hitTarget)

    const circle = doc.createElementNS(namespace, 'circle')
    circle.setAttribute('cx', '0')
    circle.setAttribute('cy', '0')
    circle.setAttribute('r', String(node.r))
    group.append(circle)

    const text = doc.createElementNS(namespace, 'text')
    text.setAttribute('x', String(node.labelOffset.dx))
    text.setAttribute('y', String(node.labelOffset.dy))
    text.textContent = labels.get(node.key) ?? node.key
    group.append(text)
    nodeLayer.append(group)
  }
  svg.setAttribute('data-atlas-view', viewMode)
}

function createProjection2dHandle(
  region: HTMLElement,
  payload: AtlasPayload,
  selection: SelectionModel,
  reason: 'viewport-2d' | 'webgl-unavailable',
  doc: Document,
  win: Window,
): AtlasEnhancementHandle {
  let viewMode: Projection2dViewMode = 'overview'
  let disposed = false

  const syncView = () => {
    const focus = focusFromSelection(selection)
    if (focus?.kind !== 'node' && viewMode === 'neighborhood') {
      viewMode = 'overview'
    }
    syncSelectionDom(region, selection, null)
    renderProjection2d(
      region,
      payload,
      focus?.kind === 'node' ? focus.key : null,
      viewMode,
      doc,
    )
    const neighborhoodControl = region.querySelector<HTMLButtonElement>(
      '[data-atlas-control="view-neighborhood"]',
    )
    const overviewControl = region.querySelector<HTMLButtonElement>(
      '[data-atlas-control="back-to-overview"]',
    )
    neighborhoodControl?.toggleAttribute(
      'hidden',
      focus?.kind !== 'node' || viewMode === 'neighborhood',
    )
    overviewControl?.toggleAttribute('hidden', viewMode !== 'neighborhood')
    region.setAttribute('data-atlas-view', viewMode)
  }

  const commitSelection = (focus: AtlasFocus | null) => {
    applySelection(selection, focus)
    applyFocus(win.history, win.location.href, focusFromSelection(selection))
  }

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element) || target.closest('a')) return
    const control = target.closest<HTMLElement>('[data-atlas-control]')
    const action = control ? attribute(control, 'data-atlas-control') : null
    if (action === 'view-neighborhood') {
      if (selection.state.mode !== 'node') return
      viewMode = 'neighborhood'
      syncView()
      return
    }
    if (action === 'back-to-overview' || action === 'clear') {
      viewMode = 'overview'
      commitSelection(null)
      return
    }

    const node = target.closest<HTMLElement>('[data-atlas-node]')
    const relation = target.closest<HTMLElement>('[data-atlas-relation]')
    if (node) {
      const key = attribute(node, 'data-atlas-node')
      if (key) commitSelection({ kind: 'node', key })
    } else if (relation) {
      const key = attribute(relation, 'data-atlas-relation')
      if (key) commitSelection({ kind: 'relation', key })
    }
  }
  const onPopState = () => {
    const focus = parseFocus(win.location.search)
    applySelection(selection, focus ? selection.resolve(focus).selected : null)
  }
  const unsubscribe = selection.subscribe(syncView)
  region.addEventListener('click', onClick)
  win.addEventListener('popstate', onPopState)
  writePresentation(region, 'list', reason, '2d', selection.stateAttr())
  syncView()

  return {
    state: 'list',
    reason,
    dispose: () => {
      if (disposed) return
      disposed = true
      unsubscribe()
      region.removeEventListener('click', onClick)
      win.removeEventListener('popstate', onPopState)
      if (documentRegions.get(doc) === region) documentRegions.delete(doc)
      regionFlights.delete(region)
    },
  }
}

async function runEnhancement(
  region: HTMLElement,
  options: AtlasEnhancementOptions,
): Promise<AtlasEnhancementHandle> {
  const doc = options.doc ?? region.ownerDocument ?? document
  const win = options.win ?? doc.defaultView ?? window
  const eligible =
    attribute(region, 'data-atlas-region') != null &&
    attribute(region, 'data-atlas-status') === 'ready'

  if (!eligible) return listHandle(region, 'not-eligible')
  if (attribute(region, 'data-atlas-enhancement') === 'enhanced') {
    return listHandle(region, 'already-enhanced')
  }

  const reserved = documentRegions.get(doc)
  if (reserved && reserved !== region) {
    return listHandle(region, 'already-enhanced')
  }
  documentRegions.set(doc, region)

  const projectionReason = !hasWebGl(win)
    ? 'webgl-unavailable'
    : !hasDesktopViewport(win)
      ? 'viewport-2d'
      : null

  let payload = readPayload(region)
  if (!payload) {
    const handle: AtlasEnhancementHandle = {
      state: 'fallback',
      reason: 'invalid-payload',
      dispose: () => {},
    }
    writePresentation(region, handle.state, handle.reason, '2d')
    return handle
  }

  let selection: SelectionModel
  try {
    selection = createSelectionModel(payload)
  } catch {
    const handle: AtlasEnhancementHandle = {
      state: 'fallback',
      reason: 'invalid-payload',
      dispose: () => {},
    }
    writePresentation(region, handle.state, handle.reason, '2d')
    return handle
  }
  const initialFocus = readFocusFromLocation(win.location)
  if (initialFocus) {
    const resolved = selection.resolve(initialFocus)
    applySelection(selection, resolved.selected)
  }
  if (projectionReason) {
    return createProjection2dHandle(
      region,
      payload,
      selection,
      projectionReason,
      doc,
      win,
    )
  }

  let scene: AtlasSceneHandle | null = null
  let controls: Disposable | null = null
  let picking: Disposable | null = null
  let labels: unknown = null
  let unsubscribe = selection.subscribe(() =>
    syncSelectionDom(region, selection, scene),
  )
  const cleanups: Array<() => void> = [unsubscribe]
  let disposed = false
  let liveHandle: AtlasEnhancementHandle | null = null

  const disposeAll = () => {
    if (disposed) return
    disposed = true
    for (const cleanup of cleanups.splice(0)) {
      try {
        cleanup()
      } catch {
        // Continue disposing the remaining resources.
      }
    }
    for (const resource of [picking, controls, scene]) {
      try {
        resource?.dispose?.()
      } catch {
        // Continue disposing the remaining resources.
      }
    }
    const clearable = labels as { clear?: () => void } | null
    try {
      clearable?.clear?.()
    } catch {
      // Ignore label cleanup failure.
    }
    if (documentRegions.get(doc) === region) documentRegions.delete(doc)
    regionFlights.delete(region)
  }

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element) || target.closest('a')) return
    const node = target.closest<HTMLElement>('[data-atlas-node]')
    const relation = target.closest<HTMLElement>('[data-atlas-relation]')
    const control = target.closest<HTMLElement>('[data-atlas-control]')
    let focus: AtlasFocus | null | undefined
    if (node) {
      const key = attribute(node, 'data-atlas-node')
      if (key) focus = { kind: 'node', key }
    } else if (relation) {
      const key = attribute(relation, 'data-atlas-relation')
      if (key) focus = { kind: 'relation', key }
    } else if (
      control &&
      ['clear', 'back-to-overview'].includes(
        attribute(control, 'data-atlas-control') ?? '',
      )
    ) {
      focus = null
    }
    if (focus === undefined) return
    applySelection(selection, focus)
    applyFocus(win.history, win.location.href, focusFromSelection(selection))
  }
  const onPopState = () => {
    const focus = parseFocus(win.location.search)
    applySelection(selection, focus ? selection.resolve(focus).selected : null)
  }
  region.addEventListener('click', onClick)
  win.addEventListener('popstate', onPopState)
  cleanups.push(() => region.removeEventListener('click', onClick))
  cleanups.push(() => win.removeEventListener('popstate', onPopState))

  const commitSelection = (focus: AtlasFocus | null) => {
    applySelection(selection, focus)
    applyFocus(win.history, win.location.href, focusFromSelection(selection))
  }

  // Start Task-7 refresh before constructing the scene, but deliberately do
  // not await it: conditional network I/O must never delay first paint.
  const runRefresh = options.refreshAtlas ?? refreshAtlas
  const etag = attribute(region, 'data-atlas-etag')
  if (etag) {
    try {
      void runRefresh({
        locale: payload.locale,
        embedded: {
          revision: payload.version.revision,
          etag,
          publishedAt: payload.version.publishedAt,
          id: payload.version.id,
        },
        selectedKey: selectedKey(selection),
        onAdopt: (detail: AtlasAdoptDetail) => {
          if (disposed) return
          payload = detail.payload
          unsubscribe()
          selection = createSelectionModel(payload)
          if (detail.selection.key) {
            const adoptedFocus = payload.nodes.some(
              (node) => node.key === detail.selection.key,
            )
              ? {
                  kind: 'node' as const,
                  key: detail.selection.key,
                }
              : {
                  kind: 'relation' as const,
                  key: detail.selection.key,
                }
            applySelection(selection, adoptedFocus)
          }
          unsubscribe = selection.subscribe(() =>
            syncSelectionDom(region, selection, scene),
          )
          cleanups.push(unsubscribe)
          region.setAttribute('data-atlas-refresh', 'adopted')
          region.setAttribute('data-atlas-revision', payload.version.revision)
          if (detail.etag) {
            region.setAttribute('data-atlas-etag', detail.etag)
          }
          scene?.setPayload?.(payload)
          syncSelectionDom(region, selection, scene)
        },
        onKeep: (outcome) => {
          if (!disposed) region.setAttribute('data-atlas-refresh', outcome)
        },
      }).catch(() => {
        if (!disposed) {
          region.setAttribute('data-atlas-refresh', 'kept-error')
        }
      })
    } catch {
      region.setAttribute('data-atlas-refresh', 'kept-error')
    }
  }

  let sceneModule: SceneModule
  let controlsModule: ControlsModule
  let pickingModule: PickingModule
  let labelsModule: LabelsModule
  try {
    ;[sceneModule, controlsModule, pickingModule, labelsModule] =
      (await Promise.all([
        options.loadScene?.() ?? import('./scene'),
        options.loadControls?.() ?? import('./controls'),
        options.loadPicking?.() ?? import('./picking'),
        options.loadLabels?.() ?? import('../research-universe/labels'),
      ])) as [SceneModule, ControlsModule, PickingModule, LabelsModule]
  } catch {
    disposeAll()
    const handle: AtlasEnhancementHandle = {
      state: 'fallback',
      reason: 'import-rejected',
      dispose: disposeAll,
    }
    writePresentation(region, handle.state, handle.reason, '2d')
    return handle
  }

  const labelContainer = region.querySelector<HTMLElement>(
    '[data-atlas-labels]',
  )
  if (labelContainer && typeof labelsModule.createLabelLayer === 'function') {
    try {
      labels = labelsModule.createLabelLayer({
        container: labelContainer,
        className: 'atlas-label',
      })
    } catch {
      labels = null
    }
  }

  let constructionReason: AtlasEnhancementReason = null
  try {
    if (typeof sceneModule.createAtlasScene !== 'function') {
      throw new Error('Atlas scene factory missing')
    }
    const canvas = ensureSceneCanvas(region, doc)
    if (!canvas && !options.loadScene) {
      throw new Error('Atlas scene canvas unavailable')
    }
    scene = await sceneModule.createAtlasScene({
      canvas: canvas ?? (region as unknown as HTMLCanvasElement),
      region,
      payload,
      theme: sceneTheme(doc),
      motion: sceneMotion(win),
      selection,
      labels,
      onError: (reason) => {
        constructionReason = reason
        if (liveHandle) {
          liveHandle.state = 'fallback'
          liveHandle.reason = reason ?? 'scene-init-failed'
          writePresentation(
            region,
            liveHandle.state,
            liveHandle.reason,
            '2d',
            selection.stateAttr(),
          )
          disposeAll()
        }
      },
    })
    if (!scene) throw new Error('Atlas scene unavailable')
  } catch {
    disposeAll()
    const handle: AtlasEnhancementHandle = {
      state: 'fallback',
      reason: constructionReason ?? 'scene-init-failed',
      dispose: disposeAll,
    }
    writePresentation(region, handle.state, handle.reason, '2d')
    return handle
  }

  if (typeof controlsModule.createAtlasControls === 'function') {
    try {
      controls =
        controlsModule.createAtlasControls({
          region,
          scene,
          selection,
          onClear: () =>
            applyFocus(
              win.history,
              win.location.href,
              focusFromSelection(selection),
            ),
        }) ?? null
    } catch {
      disposeAll()
      const handle: AtlasEnhancementHandle = {
        state: 'fallback',
        reason: 'controls-init-failed',
        dispose: disposeAll,
      }
      writePresentation(region, handle.state, handle.reason, '2d')
      return handle
    }
  }
  if (typeof pickingModule.createAtlasPicking === 'function') {
    try {
      picking =
        pickingModule.createAtlasPicking({
          region,
          scene,
          selection,
          onSelect: (focus) => commitSelection(focus),
        }) ?? null
    } catch {
      disposeAll()
      const handle: AtlasEnhancementHandle = {
        state: 'fallback',
        reason: 'picking-init-failed',
        dispose: disposeAll,
      }
      writePresentation(region, handle.state, handle.reason, '2d')
      return handle
    }
  }

  cleanups.push(
    subscribeReducedMotion(win, (motion) => {
      try {
        scene?.setMotion?.(motion)
      } catch {
        // Motion preference must never break the semantic index.
      }
    }),
  )

  const onPageHide = () => disposeAll()
  win.addEventListener('pagehide', onPageHide)
  cleanups.push(() => win.removeEventListener('pagehide', onPageHide))

  const handle: AtlasEnhancementHandle = {
    state: 'enhanced',
    reason: null,
    dispose: () => {
      disposeAll()
      writePresentation(region, 'list', null, '2d')
    },
  }
  liveHandle = handle
  writePresentation(region, handle.state, handle.reason, '3d')
  syncSelectionDom(region, selection, scene)
  return handle
}

export function enhanceAtlasRegion(
  region: HTMLElement,
  options: AtlasEnhancementOptions = {},
): Promise<AtlasEnhancementHandle> {
  const inFlight = regionFlights.get(region)
  if (inFlight) return inFlight
  const flight = runEnhancement(region, options)
  regionFlights.set(region, flight)
  return flight
}
