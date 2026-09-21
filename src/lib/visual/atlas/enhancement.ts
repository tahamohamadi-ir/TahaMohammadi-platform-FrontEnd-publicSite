/**
 * Progressive enhancement for the public Knowledge Atlas.
 *
 * The server-rendered index remains the source of truth. This module reserves
 * at most one Atlas region per document, starts the conditional refresh
 * without delaying graphics, and only then lazily loads the optional 3D path.
 */

import type { AtlasPayload } from '../../atlas/model'
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
}

interface SceneModule {
  createAtlasScene?: (options: {
    region: HTMLElement
    payload: AtlasPayload
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
  }) => Disposable | void
}

interface PickingModule {
  createAtlasPicking?: (options: {
    region: HTMLElement
    scene: AtlasSceneHandle
    selection: SelectionModel
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

function lazyRelative(specifier: string): Promise<unknown> {
  return import(/* @vite-ignore */ specifier)
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

  if (!hasWebGl(win)) return listHandle(region, 'webgl-unavailable')
  if (!hasDesktopViewport(win)) return listHandle(region, 'viewport-2d')

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
        options.loadScene?.() ?? lazyRelative('./scene'),
        options.loadControls?.() ?? lazyRelative('./controls'),
        options.loadPicking?.() ?? lazyRelative('./picking'),
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
    scene = await sceneModule.createAtlasScene({
      region,
      payload,
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
        controlsModule.createAtlasControls({ region, scene, selection }) ?? null
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
        pickingModule.createAtlasPicking({ region, scene, selection }) ?? null
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
