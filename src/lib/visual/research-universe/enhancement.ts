/**
 * RU-05 — Progressive enhancement for both Research Universe presentations.
 *
 * One wiring path, two modes. It follows the same contract the Home hero already
 * ships (CA-06 `hero-enhancement.ts`) so the accessibility and failure behaviour
 * of the site does not change:
 *
 * - semantic HTML renders first and stays the source of truth; this module only
 *   ENHANCES it. It never sets opacity 0 on copy, never hides the native list,
 *   never creates a second keyboard tree (every interactive control is a real
 *   `<button>`/`<summary>` in the markup);
 * - exactly one canvas per route: a second region, or a gateway portal on the
 *   same document, keeps this path inert;
 * - three.js is loaded lazily through a dynamic import after content renders, and
 *   an import rejection, missing WebGL, context loss or a repeated frame-budget
 *   overshoot restores the semantic presentation without a reload;
 * - rendering is on demand only (scroll pose, resize, theme, selection). There is
 *   no permanent rAF loop while idle;
 * - everything disposes on page leave.
 *
 * Selection model: the native controls own it. Clicking a semantic node control
 * or relationship control updates the scene AND the panels; the canvas hit test
 * routes through the same `applyNodeSelection` / `applyEdgeSelection` functions,
 * so a pointer pick and a keyboard pick are the same state transition.
 */

import {
  SCENE_CONTRACT_VERSION,
  scenePaletteFromCss,
  type ProjectedLabel,
  type SceneErrorCode,
  type SceneMotionPreference,
  type ScenePalette,
} from '../scene-contract'
import {
  UNIVERSE_MODEL_VERSION,
  findDanglingEdges,
  type UniverseRendererPayload,
} from '../../research-universe/model'
import {
  resolveThemeMode,
  buildUniverseTheme,
  type UniverseRenderTheme,
} from './theme'
import type { ProjectedNode3D } from './hit-testing'

export const UNIVERSE_ENHANCEMENT_VERSION = 'ru05-1.0.0'

export type UniverseMode = 'home' | 'about'

export type UniverseEnhancementState = 'enhanced' | 'fallback' | 'idle'

export type UniverseEnhancementReason =
  | SceneErrorCode
  | 'import-rejected'
  | 'scene-init-failed'
  | 'invalid-payload'
  | 'not-eligible'
  | 'already-enhanced'
  | 'duplicate-canvas'
  | 'gateway-route'
  | null

export interface UniverseEnhancementHandle {
  state: UniverseEnhancementState
  reason: UniverseEnhancementReason
  dispose(): void
}

export interface UniverseEnhancementOptions {
  mode: UniverseMode
  doc?: Document
  win?: Window
  initialSelectedId?: string | null
  /** Test seam: replaces the lazy scene import. */
  loadScene?: () => Promise<unknown>
  loadControls?: () => Promise<unknown>
  loadLabels?: () => Promise<unknown>
  loadMotion?: () => Promise<unknown>
}

interface UniverseSceneHandle {
  setProgress(progress: number): void
  setSelection(selectedId: string | null): void
  setSelectedEdge?(edgeId: string | null): void
  selectAt?(
    x: number,
    y: number,
  ): { kind: 'node' | 'edge' | 'none'; id: string | null }
  orbit?(): { yaw: number; pitch: number; distanceScale: number }
  zoomBy?(factor: number): void
  resetView?(animate?: boolean): void
  focusNode?(nodeId: string): void
  setTheme(theme: UniverseRenderTheme): void
  setMotion(motion: SceneMotionPreference): void
  setVisible(visible: boolean): void
  resize(width: number, height: number, devicePixelRatio: number): void
  render(): void
  stats(): { triangles: number; drawCalls: number; pixelRatio: number }
  dispose(): void
}

const READY = 'ready'

function attr(
  element: Element | null | undefined,
  name: string,
): string | null {
  try {
    return element?.getAttribute(name) ?? null
  } catch {
    return null
  }
}

function setState(
  region: HTMLElement,
  state: UniverseEnhancementState,
  reason: UniverseEnhancementReason,
  detail?: string,
): void {
  try {
    region.setAttribute('data-universe-enhancement', state)
    if (reason) region.setAttribute('data-enhancement-reason', String(reason))
    else region.removeAttribute('data-enhancement-reason')
    // The failure cause is written into the DOM (bounded) rather than only to the
    // console: a fallback the visitor sees should be diagnosable from the markup
    // the browser actually served, including from a headless QA run.
    if (detail)
      region.setAttribute('data-enhancement-detail', detail.slice(0, 180))
    else region.removeAttribute('data-enhancement-detail')
  } catch {
    // Bookkeeping must never break the page.
  }
}

function scenePaletteFromDocument(doc: Document): ScenePalette {
  try {
    const style = doc.defaultView?.getComputedStyle(doc.documentElement)
    if (style) {
      return scenePaletteFromCss((name) => style.getPropertyValue(name).trim())
    }
  } catch {
    // fall through
  }
  return {
    canvas: '#071225',
    ink: '#f7f3ea',
    brand: '#16b8a6',
    signature: '#c89b3c',
    research: '#8b75dc',
    context: '#42a98c',
    surface: '#0b1630',
  }
}

function motionFromDocument(
  doc: Document,
  win?: Window,
): SceneMotionPreference {
  try {
    const query = (win ?? doc.defaultView)?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )
    if (query?.matches) return 'reduced'
  } catch {
    // ignore
  }
  return 'full'
}

function themeFor(doc: Document): UniverseRenderTheme {
  return buildUniverseTheme(
    scenePaletteFromDocument(doc),
    resolveThemeMode(doc.documentElement),
  )
}

/**
 * Validate the embedded renderer payload.
 *
 * Returns the payload UNCHANGED on success — deliberately. A validator that
 * rebuilt a reduced copy would silently drop fields the renderer depends on
 * (`anchor`, positions), and the scene would then fail at construction while the
 * semantic HTML looked perfectly fine. Validate, never reshape.
 */
export function validateUniversePayload(
  raw: unknown,
):
  | { ok: true; payload: UniverseRendererPayload }
  | { ok: false; reason: string } {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, reason: 'payload-not-object' }
  const payload = raw as {
    contractVersion?: unknown
    anchor?: unknown
    nodes?: unknown
    edges?: unknown
  }
  if (payload.contractVersion !== UNIVERSE_MODEL_VERSION) {
    return { ok: false, reason: 'contract-version-mismatch' }
  }
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return { ok: false, reason: 'nodes-and-edges-must-be-arrays' }
  }
  if (typeof payload.anchor !== 'object' || payload.anchor === null) {
    // The presentation anchor is part of the renderer contract: without it the
    // scene has no core identity, so the honest answer is the semantic fallback.
    return { ok: false, reason: 'anchor-missing' }
  }
  const nodes = payload.nodes as Array<{ id?: unknown }>
  const edges = payload.edges as Array<{
    id?: unknown
    source?: unknown
    target?: unknown
  }>
  for (const node of nodes) {
    if (typeof node?.id !== 'string' || !node.id.trim())
      return { ok: false, reason: 'node-missing-id' }
  }
  for (const edge of edges) {
    if (typeof edge?.id !== 'string' || !edge.id.trim())
      return { ok: false, reason: 'edge-missing-id' }
    if (typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      return { ok: false, reason: 'edge-missing-endpoints' }
    }
  }
  const typedNodes = nodes as Array<{ id: string }>
  const typedEdges = edges as Array<{
    id: string
    source: string
    target: string
  }>
  if (findDanglingEdges(typedNodes, typedEdges).length > 0) {
    return { ok: false, reason: 'dangling-edge' }
  }
  return { ok: true, payload: payload as unknown as UniverseRendererPayload }
}

function hasGatewayMarker(doc: Document): boolean {
  try {
    return Boolean(
      doc.querySelector(
        '[data-gateway-portal], [data-gateway-scene], .gw__portal',
      ),
    )
  } catch {
    return false
  }
}

export async function enhanceUniverseRegion(
  region: HTMLElement,
  options: UniverseEnhancementOptions,
): Promise<UniverseEnhancementHandle> {
  const handle: UniverseEnhancementHandle = {
    state: 'idle',
    reason: null,
    dispose: () => {},
  }
  const doc = options.doc ?? region.ownerDocument ?? document
  const win = options.win ?? doc.defaultView ?? window

  if (attr(region, 'data-universe-enhancement') === 'enhanced') {
    handle.reason = 'already-enhanced'
    return handle
  }

  const eligible =
    attr(region, 'data-universe-region') != null &&
    attr(region, 'data-universe-status') === READY &&
    attr(region, 'data-universe-contract') === UNIVERSE_MODEL_VERSION &&
    attr(region, 'data-universe-mode') === options.mode &&
    // The CA-03 scene contract is a Home-hero artefact; requiring it on About
    // would make the interactive universe permanently inert.
    (options.mode !== 'home' ||
      attr(region, 'data-scene-contract') === SCENE_CONTRACT_VERSION) &&
    region.querySelector('[data-universe-scene]') != null &&
    region.querySelector('[data-universe-canvas]') != null

  if (!eligible) {
    setState(region, 'idle', 'not-eligible')
    handle.reason = 'not-eligible'
    return handle
  }

  if (hasGatewayMarker(doc)) {
    setState(region, 'idle', 'gateway-route')
    handle.reason = 'gateway-route'
    return handle
  }

  let scene: UniverseSceneHandle | null = null
  let controls: {
    dispose(): void
    zoomBy?(f: number): void
    resetView?(): void
    focus?(id: string | null): void
  } | null = null
  let labelLayer: {
    render(
      l: ReadonlyArray<ProjectedLabel>,
      m: ReadonlyMap<string, string>,
      p?: ReadonlyArray<ProjectedNode3D>,
    ): void
    setSelected(i: string | null): void
    clear(): void
  } | null = null
  let scrollDriver: { dispose(): void } | null = null
  let observer: { disconnect(): void } | null = null
  let settled: 'pending' | 'enhanced' | 'fallback' = 'pending'

  const cleanups: Array<() => void> = []
  const canvasFound = region.querySelector<HTMLCanvasElement>(
    '[data-universe-canvas]',
  )
  const stageFound = region.querySelector<HTMLElement>('[data-universe-scene]')
  if (!canvasFound || !stageFound) {
    setState(region, 'idle', 'not-eligible')
    handle.reason = 'not-eligible'
    return handle
  }
  // Non-null aliases: the builders below are nested functions, and TypeScript
  // does not carry a closure-scope narrowing of the nullable originals into them.
  const canvas: HTMLCanvasElement = canvasFound
  const stage: HTMLElement = stageFound
  const track =
    region.querySelector<HTMLElement>('[data-universe-track]') ?? stage

  const payloadScript = region.querySelector<HTMLElement>(
    '[data-universe-payload]',
  )
  let payload: UniverseRendererPayload | null = null
  try {
    const raw = payloadScript?.textContent
      ? JSON.parse(payloadScript.textContent)
      : null
    const validated = validateUniversePayload(raw)
    if (!validated.ok) {
      setState(region, 'fallback', 'invalid-payload')
      handle.state = 'fallback'
      handle.reason = 'invalid-payload'
      return handle
    }
    payload = validated.payload
  } catch {
    setState(region, 'fallback', 'invalid-payload')
    handle.state = 'fallback'
    handle.reason = 'invalid-payload'
    return handle
  }
  if (!payload) {
    setState(region, 'fallback', 'invalid-payload')
    handle.state = 'fallback'
    handle.reason = 'invalid-payload'
    return handle
  }

  const disposeAll = () => {
    for (const cleanup of cleanups.splice(0)) {
      try {
        cleanup()
      } catch {
        // ignore
      }
    }
    try {
      controls?.dispose()
    } catch {
      // ignore
    }
    try {
      scrollDriver?.dispose()
    } catch {
      // ignore
    }
    try {
      observer?.disconnect()
    } catch {
      // ignore
    }
    try {
      scene?.dispose()
    } catch {
      // ignore
    }
    controls = null
    scrollDriver = null
    observer = null
    scene = null
  }

  const enterFallback = (
    reason: UniverseEnhancementReason,
    detail?: string,
  ) => {
    if (settled === 'fallback') return
    settled = 'fallback'
    handle.state = 'fallback'
    handle.reason = reason
    setState(region, 'fallback', reason, detail)
    // Only the canvas layer is withdrawn; every semantic control stays.
    try {
      canvas.hidden = true
    } catch {
      // ignore
    }
    try {
      scene?.dispose()
    } catch {
      // ignore
    }
    scene = null
  }

  // -------------------------------------------------------------------------
  // Semantic selection: the native controls own the state.
  // -------------------------------------------------------------------------
  let selectedNodeId: string | null = options.initialSelectedId ?? null
  let selectedEdgeId: string | null = null
  const labelById = new Map<string, string>()
  const nodeElements = Array.from(
    region.querySelectorAll<HTMLElement>('[data-universe-node]'),
  )
  const edgeElements = Array.from(
    region.querySelectorAll<HTMLElement>('[data-universe-edge]'),
  )
  for (const element of [...nodeElements, ...edgeElements]) {
    const id =
      attr(element, 'data-universe-node') ?? attr(element, 'data-universe-edge')
    const label = attr(element, 'data-universe-label')
    if (id && label) labelById.set(id, label)
  }

  function incidentNodeIds(id: string | null): Set<string> | null {
    if (id == null) return null
    const incident = new Set<string>([id])
    for (const edge of payload?.edges ?? []) {
      if (edge.source === id) incident.add(edge.target)
      if (edge.target === id) incident.add(edge.source)
    }
    return incident
  }

  function syncNodeDom(): void {
    const incident = incidentNodeIds(selectedNodeId)
    for (const element of nodeElements) {
      const id = attr(element, 'data-universe-node')
      const isSelected = id != null && id === selectedNodeId
      const isDimmed =
        selectedNodeId != null &&
        incident != null &&
        id != null &&
        !incident.has(id)
      element.setAttribute('data-selected', isSelected ? 'true' : 'false')
      element.setAttribute('data-dimmed', isDimmed ? 'true' : 'false')
      const details = element.matches('details')
        ? (element as HTMLDetailsElement)
        : element.querySelector<HTMLDetailsElement>('details')
      if (details && isSelected) details.open = true
      else if (details && selectedNodeId == null) details.open = false
      const summary =
        element.querySelector('summary') ?? element.querySelector('button')
      if (summary)
        summary.setAttribute('aria-expanded', isSelected ? 'true' : 'false')
    }
    for (const element of edgeElements) {
      const source = attr(element, 'data-source')
      const target = attr(element, 'data-target')
      const isSelectedEdge =
        attr(element, 'data-universe-edge') === selectedEdgeId
      const isEmphasized =
        isSelectedEdge ||
        (selectedNodeId != null &&
          (source === selectedNodeId || target === selectedNodeId))
      const isDimmed =
        !isSelectedEdge && activeSelectionExists() && !isEmphasized
      element.setAttribute('data-emphasized', isEmphasized ? 'true' : 'false')
      element.setAttribute('data-dimmed', isDimmed ? 'true' : 'false')
      element.setAttribute('data-selected', isSelectedEdge ? 'true' : 'false')
      const control = element.querySelector('button')
      if (control)
        control.setAttribute('aria-pressed', isSelectedEdge ? 'true' : 'false')
    }
    region.setAttribute(
      'data-universe-selection',
      activeSelectionExists() ? 'true' : 'false',
    )
    syncPanels()
  }

  function activeSelectionExists(): boolean {
    return selectedNodeId != null || selectedEdgeId != null
  }

  /**
   * Panels mirror the semantic selection with an index built once, so syncing is
   * O(changed) rather than a nested scan on every click.
   */
  const nodeDetailBlocks = new Map<string, HTMLElement>()
  for (const block of Array.from(
    region.querySelectorAll<HTMLElement>('[data-universe-node-detail]'),
  )) {
    const id = attr(block, 'data-universe-node-detail')
    if (id) nodeDetailBlocks.set(id, block)
  }
  const edgeDetailBlocks = new Map<string, HTMLElement>()
  for (const block of Array.from(
    region.querySelectorAll<HTMLElement>('[data-universe-edge-detail]'),
  )) {
    const id = attr(block, 'data-universe-edge-detail')
    if (id) edgeDetailBlocks.set(id, block)
  }

  function syncPanels(): void {
    for (const [id, block] of nodeDetailBlocks) {
      const isActive = id === selectedNodeId
      block.hidden = !isActive
      block.setAttribute('data-active', isActive ? 'true' : 'false')
    }
    for (const [id, block] of edgeDetailBlocks) {
      const isActive = id === selectedEdgeId
      block.hidden = !isActive
      block.setAttribute('data-active', isActive ? 'true' : 'false')
    }
    for (const nodePanel of Array.from(
      region.querySelectorAll<HTMLElement>('[data-universe-node-panel]'),
    )) {
      nodePanel.setAttribute(
        'data-has-selection',
        selectedNodeId != null ? 'true' : 'false',
      )
      nodePanel
        .querySelector<HTMLElement>('[data-universe-node-prompt]')
        ?.toggleAttribute('hidden', selectedNodeId != null)
    }
    for (const edgePanel of Array.from(
      region.querySelectorAll<HTMLElement>('[data-universe-edge-panel]'),
    )) {
      edgePanel.setAttribute(
        'data-has-selection',
        selectedEdgeId != null ? 'true' : 'false',
      )
      edgePanel
        .querySelector<HTMLElement>('[data-universe-edge-prompt]')
        ?.toggleAttribute('hidden', selectedEdgeId != null)
    }
  }

  function applyNodeSelection(id: string | null): void {
    selectedNodeId = id
    if (id != null) selectedEdgeId = null
    syncNodeDom()
    labelLayer?.setSelected(id)
    try {
      scene?.setSelection(id)
      if (id == null) scene?.setSelectedEdge?.(null)
    } catch {
      // A scene in fallback must not block the semantic state change.
    }
  }

  function applyEdgeSelection(id: string | null): void {
    selectedEdgeId = id
    if (id != null) selectedNodeId = null
    syncNodeDom()
    labelLayer?.setSelected(null)
    try {
      scene?.setSelectedEdge?.(id)
      if (id == null) scene?.setSelection(null)
    } catch {
      // ignore
    }
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    // Follow real links normally.
    if (target.closest('a')) return

    const edgeControl = target.closest<HTMLElement>('[data-universe-edge]')
    if (edgeControl) {
      const id = attr(edgeControl, 'data-universe-edge')
      if (!id) return
      event.preventDefault()
      applyEdgeSelection(id === selectedEdgeId ? null : id)
      return
    }

    const nodeControl = target.closest<HTMLElement>('[data-universe-node]')
    if (nodeControl) {
      const id = attr(nodeControl, 'data-universe-node')
      if (!id) return
      if (target.closest('summary')) {
        // Let the native disclosure work, but keep the scene in step.
        applyNodeSelection(id === selectedNodeId ? null : id)
      }
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (!activeSelectionExists()) return
    event.preventDefault()
    const returnTo = region.querySelector<HTMLElement>(
      selectedNodeId != null
        ? '[data-universe-node][data-selected="true"] summary'
        : '[data-universe-edge][data-selected="true"] button',
    )
    applyNodeSelection(null)
    applyEdgeSelection(null)
    returnTo?.focus?.({ preventScroll: true })
  }

  region.addEventListener('click', onClick)
  region.addEventListener('keydown', onKeyDown)
  cleanups.push(() => {
    region.removeEventListener('click', onClick)
    region.removeEventListener('keydown', onKeyDown)
  })

  // Initial semantic state, valid with or without the canvas.
  syncNodeDom()

  // -------------------------------------------------------------------------
  // Lazy graphics
  // -------------------------------------------------------------------------
  let sceneModule: {
    createHomeScene?: unknown
    createAboutScene?: unknown
  }
  let labelsModule: { createLabelLayer?: unknown }
  let motionModule: { createScrollPoseDriver?: unknown }
  let controlsModule: { createAboutControls?: unknown }
  try {
    const loaders: Array<Promise<unknown>> = [
      options.loadScene
        ? options.loadScene()
        : options.mode === 'home'
          ? import('./home-scene')
          : import('./about-scene'),
      options.loadLabels ? options.loadLabels() : import('./labels'),
    ]
    if (options.mode === 'home') {
      loaders.push(
        options.loadMotion ? options.loadMotion() : import('./home-motion'),
      )
    } else {
      loaders.push(
        options.loadControls
          ? options.loadControls()
          : import('./about-controls'),
      )
    }
    const [sceneLoaded, labelsLoaded, extraLoaded] = (await Promise.all(
      loaders,
    )) as [
      { createHomeScene?: unknown; createAboutScene?: unknown },
      { createLabelLayer?: unknown },
      { createScrollPoseDriver?: unknown; createAboutControls?: unknown },
    ]
    sceneModule = sceneLoaded
    labelsModule = labelsLoaded
    motionModule = extraLoaded
    controlsModule = extraLoaded
  } catch {
    setState(region, 'fallback', 'import-rejected')
    handle.state = 'fallback'
    handle.reason = 'import-rejected'
    return handle
  }

  const labelsContainer = region.querySelector<HTMLElement>(
    '[data-universe-labels]',
  )
  if (labelsContainer && typeof labelsModule.createLabelLayer === 'function') {
    try {
      labelLayer = (
        labelsModule.createLabelLayer as (o: {
          container: HTMLElement
        }) => typeof labelLayer
      )({ container: labelsContainer })
    } catch {
      labelLayer = null
    }
  }

  const initialTheme = themeFor(doc)
  const initialMotion = motionFromDocument(doc, win)

  try {
    const factory = (
      options.mode === 'home'
        ? sceneModule.createHomeScene
        : sceneModule.createAboutScene
    ) as ((o: never) => UniverseSceneHandle | null) | undefined
    if (typeof factory !== 'function') throw new Error('scene factory missing')
    scene = factory({
      canvas,
      universe: payload,
      theme: initialTheme,
      motion: initialMotion,
      onFrame: (
        labels: ReadonlyArray<ProjectedLabel>,
        projected: ReadonlyArray<ProjectedNode3D>,
      ) => labelLayer?.render(labels, labelById, projected),
      onError: (code: SceneErrorCode) => enterFallback(code),
    } as never)
  } catch (error) {
    // Never swallow a construction failure silently: the semantic fallback is
    // correct for the visitor, but the cause must be recoverable by whoever
    // debugs the scene.
    console.warn(
      `[research-universe] ${options.mode} scene init failed:`,
      error,
    )
    enterFallback(
      'scene-init-failed',
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    )
    handle.dispose = disposeAll
    return handle
  }

  if (!scene) {
    // createSceneCore reported webgl-unavailable through onError.
    enterFallback(handle.reason ?? 'webgl-unavailable')
    handle.dispose = disposeAll
    return handle
  }

  const liveScene = scene

  function applySize(): void {
    if (settled !== 'enhanced' && settled !== 'pending') return
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (width <= 0 || height <= 0) return
    try {
      liveScene.resize(width, height, win.devicePixelRatio || 1)
    } catch {
      // ignore
    }
  }

  if (
    options.mode === 'about' &&
    typeof controlsModule.createAboutControls === 'function'
  ) {
    try {
      controls = (
        controlsModule.createAboutControls as (o: {
          stage: HTMLElement
          canvas: HTMLCanvasElement
          scene: unknown
          onPick: (r: {
            kind: 'node' | 'edge' | 'none'
            id: string | null
          }) => void
        }) => typeof controls
      )({
        stage,
        canvas,
        scene: liveScene,
        onPick: (picked) => {
          if (picked.kind === 'node') applyNodeSelection(picked.id)
          else if (picked.kind === 'edge') applyEdgeSelection(picked.id)
          else {
            applyNodeSelection(null)
            applyEdgeSelection(null)
          }
        },
      })
    } catch {
      controls = null
    }
  }

  // Native buttons drive camera actions, so zoom/reset are keyboard-reachable
  // without making the canvas focusable.
  for (const button of Array.from(
    region.querySelectorAll<HTMLButtonElement>('[data-universe-action]'),
  )) {
    const action = attr(button, 'data-universe-action')
    const handler = (event: Event) => {
      event.preventDefault()
      const selected =
        attr(region, 'data-universe-selected-node') ?? selectedNodeId
      if (action === 'zoom-in') controls?.zoomBy?.(0.82)
      else if (action === 'zoom-out') controls?.zoomBy?.(1.22)
      else if (action === 'reset') controls?.resetView?.()
      else if (action === 'focus') controls?.focus?.(selected ?? null)
      else if (action === 'clear') {
        applyNodeSelection(null)
        applyEdgeSelection(null)
      }
    }
    button.addEventListener('click', handler)
    cleanups.push(() => button.removeEventListener('click', handler))
  }

  if (
    options.mode === 'home' &&
    typeof motionModule.createScrollPoseDriver === 'function'
  ) {
    try {
      scrollDriver = (
        motionModule.createScrollPoseDriver as (o: {
          track: HTMLElement
          reducedMotion: boolean
          onProgress: (progress: number, state: number) => void
        }) => typeof scrollDriver
      )({
        track: track ?? stage,
        reducedMotion: initialMotion !== 'full',
        onProgress: (progress, state) => {
          region.setAttribute('data-universe-progress', progress.toFixed(3))
          region.setAttribute('data-universe-state', String(state))
          try {
            liveScene.setProgress(progress)
          } catch {
            // ignore
          }
        },
      })
    } catch {
      scrollDriver = null
    }
  }

  const onThemeChange = () => {
    if (settled !== 'enhanced') return
    try {
      liveScene.setTheme(themeFor(doc))
      liveScene.render()
    } catch {
      // A failed re-tint must not clear content.
    }
  }
  win.addEventListener?.('tm-themechange', onThemeChange)
  cleanups.push(() =>
    win.removeEventListener?.('tm-themechange', onThemeChange),
  )

  win.addEventListener?.('resize', applySize)
  cleanups.push(() => win.removeEventListener?.('resize', applySize))

  try {
    const Observer =
      (win as unknown as { IntersectionObserver?: typeof IntersectionObserver })
        .IntersectionObserver ??
      (typeof IntersectionObserver !== 'undefined'
        ? IntersectionObserver
        : undefined)
    if (Observer && stage) {
      const created = new Observer((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting)
        try {
          liveScene.setVisible(visible)
        } catch {
          // ignore
        }
      })
      created.observe(stage)
      observer = created
    }
  } catch {
    observer = null
  }

  const onPageHide = () => disposeAll()
  win.addEventListener?.('pagehide', onPageHide)
  cleanups.push(() => win.removeEventListener?.('pagehide', onPageHide))

  // Success: reveal the canvas layer only.
  settled = 'enhanced'
  handle.state = 'enhanced'
  handle.reason = null
  setState(region, 'enhanced', null)
  canvas.hidden = false
  applySize()
  try {
    liveScene.render()
  } catch {
    // ignore
  }

  handle.dispose = () => {
    disposeAll()
    canvas.hidden = true
    if (handle.state !== 'fallback') {
      handle.state = 'idle'
      handle.reason = null
      setState(region, 'idle', null)
    }
  }

  return handle
}
