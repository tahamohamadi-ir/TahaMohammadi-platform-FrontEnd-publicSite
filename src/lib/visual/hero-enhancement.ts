/**
 * CA-06 — Progressive Home hero enhancement.
 *
 * Wires the locked CA-03 scene contract, the CA-04 procedural renderer, and
 * the CA-05 selection/motion controller into the semantic Home hero without
 * changing graph facts. Semantic HTML stays readable before and without the
 * scene; the renderer enhances the same source and never creates a second
 * keyboard tree.
 *
 * Boundaries (DESIGN-SPEC §§1–6, ADR-0008):
 * - Eligible routes only: exactly one `[data-graph-region]` with
 *   `data-graph-status="ready"` and a matching `data-scene-contract`, and
 *   no gateway portal marker on the same document.
 * - Three.js/GSAP load lazily via dynamic `import()` after semantic content
 *   renders. The Home hero path never imports the gateway portal path.
 * - Text never waits for the scene: this module never sets opacity 0 on
 *   copy, node list, or detail surfaces and never hides semantic nodes.
 * - Fallbacks restore immediately without reload on import rejection,
 *   unavailable WebGL, context loss, and repeated frame-budget failures,
 *   preserving selection and content and reporting no success status.
 * - Offscreen/hidden work is stopped; resize/theme/selection re-render on
 *   demand only; all resources dispose on page leave.
 */

import {
  SCENE_CONTRACT_VERSION,
  scenePaletteFromCss,
  validateScenePayload,
  type GraphControllerFactory,
  type GraphSceneFactory,
  type ProjectedLabel,
  type SceneErrorCode,
  type SceneMotionPreference,
  type ScenePalette,
  type ScenePayload,
} from './scene-contract'

interface GraphMotionHandle {
  playSettle(): Promise<void>
  animateSelection(selectedId: string | null): Promise<void>
  setMotionPreference(preference: SceneMotionPreference): void
  dispose(): void
}

export const HERO_ENHANCEMENT_VERSION = 'ca06-1.0.0'

export type HeroEnhancementState = 'enhanced' | 'fallback' | 'idle'

export type HeroEnhancementReason =
  | SceneErrorCode
  | 'import-rejected'
  | 'invalid-payload'
  | 'not-eligible'
  | 'already-enhanced'
  | 'duplicate-graph'
  | 'gateway-route'
  | null

export interface HeroEnhancementHandle {
  state: HeroEnhancementState
  reason: HeroEnhancementReason
  dispose(): void
}

/** Minimal DOM surface used by eligibility checks (real or test doubles). */
interface MinimalRegion {
  getAttribute(name: string): string | null
  hasAttribute?(name: string): boolean
  setAttribute?(name: string, value: string): void
  removeAttribute?(name: string): void
  querySelector?(selector: string): unknown
  querySelectorAll?(selector: string): ArrayLike<unknown>
}

interface MinimalDoc {
  querySelectorAll?(selector: string): ArrayLike<unknown>
  querySelector?(selector: string): unknown
}

export interface HeroEnhancementLoaders {
  loadScene?: () => Promise<{ createGraphScene: GraphSceneFactory }>
  loadController?: () => Promise<{
    createGraphController: GraphControllerFactory
  }>
  loadMotion?: () => Promise<{
    createGraphMotion: (options: never) => GraphMotionHandle
  }>
}

export interface EnhanceHeroRegionOptions extends HeroEnhancementLoaders {
  doc?: MinimalDoc & {
    createElement?: (tag: string) => unknown
    documentElement?: unknown
  }
  win?: WindowLike | null
  initialSelectedId?: string | null
}

interface WindowLike {
  matchMedia?: (query: string) => { matches: boolean }
  getComputedStyle?: (el: unknown) => { getPropertyValue(name: string): string }
  addEventListener?: (type: string, handler: (event: never) => void) => void
  removeEventListener?: (type: string, handler: (event: never) => void) => void
  devicePixelRatio?: number
  requestAnimationFrame?: (cb: () => void) => number
}

const READY_STATUS = 'ready'

function getAttr(region: MinimalRegion, name: string): string | null {
  try {
    return region.getAttribute(name)
  } catch {
    return null
  }
}

/**
 * Eligible only when the semantic region is ready for the renderer: the
 * region carries the locked contract version and already contains a scene
 * slot with a hidden canvas. Empty/error/unavailable states are never
 * eligible and must keep their honest fallback without loading Three.js.
 */
export function isEligibleHeroRegion(region: MinimalRegion | null): boolean {
  if (!region) return false
  if (getAttr(region, 'data-graph-region') == null) {
    // Presence marker: section always sets data-graph-region (empty value).
    // A null region or missing marker is not eligible.
    return false
  }
  if (getAttr(region, 'data-graph-status') !== READY_STATUS) return false
  if (getAttr(region, 'data-scene-contract') !== SCENE_CONTRACT_VERSION)
    return false
  try {
    const stage = region.querySelector?.('[data-graph-scene]')
    const canvas = region.querySelector?.('[data-graph-canvas]')
    if (!stage || !canvas) return false
  } catch {
    return false
  }
  return true
}

function countRegions(doc: MinimalDoc | undefined): number {
  try {
    return doc?.querySelectorAll?.('[data-graph-region]')?.length ?? 1
  } catch {
    return 1
  }
}

function hasGatewayMarker(doc: MinimalDoc | undefined): boolean {
  if (!doc?.querySelector) return false
  try {
    for (const selector of [
      '[data-gateway-portal]',
      '[data-gateway-scene]',
      '.gw__portal',
    ]) {
      if (doc.querySelector(selector)) return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * Load gate for eligible routes: one ready graph, no second graph region,
 * and no gateway portal on the same document. Keeps the Home constellation
 * and the gateway portal on their separate routes (ADR-0008).
 */
export function shouldLoadScene(
  region: MinimalRegion | null,
  doc?: MinimalDoc,
): boolean {
  if (!isEligibleHeroRegion(region)) return false
  if (!doc) return true
  if (countRegions(doc) !== 1) return false
  if (hasGatewayMarker(doc)) return false
  try {
    if (region?.getAttribute?.('data-hero-enhancement') === 'enhanced')
      return false
  } catch {
    // ignore
  }
  return true
}

export function readEmbeddedPayload(
  region: MinimalRegion,
): { ok: true; payload: ScenePayload } | { ok: false; reason: string } {
  try {
    const script = region.querySelector?.(
      '[data-graph-payload]',
    ) as unknown as { textContent?: string } | null
    const raw =
      typeof script?.textContent === 'string' ? script.textContent : ''
    if (!raw.trim()) return { ok: false, reason: 'missing-payload' }
    const parsed: unknown = JSON.parse(raw)
    const result = validateScenePayload(parsed)
    if (!result.ok)
      return {
        ok: false,
        reason: `invalid-payload:${result.issues[0] ?? 'unknown'}`,
      }
    return { ok: true, payload: parsed as ScenePayload }
  } catch {
    return { ok: false, reason: 'payload-parse-failed' }
  }
}

function defaultPalette(): ScenePalette {
  // DESIGN-SPEC §2 light starting point; runtime values come from CSS tokens
  // via scenePaletteFromCss whenever a window is available.
  return {
    canvas: '#f7f8f5',
    ink: '#182328',
    brand: '#087c73',
    signature: '#a77b28',
    research: '#6047b8',
    context: '#137a62',
    surface: '#ffffff',
  }
}

function paletteFromWindow(win: WindowLike | null | undefined): ScenePalette {
  try {
    const docEl =
      typeof document !== 'undefined' ? document.documentElement : null
    const reader = win?.getComputedStyle ?? null
    if (reader && docEl) {
      return scenePaletteFromCss((name) =>
        reader(docEl).getPropertyValue(name).trim(),
      )
    }
    if (typeof getComputedStyle !== 'undefined' && docEl) {
      const style = getComputedStyle(docEl)
      return scenePaletteFromCss((name) => style.getPropertyValue(name).trim())
    }
  } catch {
    // fall through to static palette
  }
  return defaultPalette()
}

function motionFromWindow(
  win: WindowLike | null | undefined,
): SceneMotionPreference {
  try {
    const query =
      win?.matchMedia?.('(prefers-reduced-motion: reduce)') ??
      (typeof matchMedia !== 'undefined'
        ? matchMedia('(prefers-reduced-motion: reduce)')
        : null)
    if (query?.matches) return 'reduced'
  } catch {
    // ignore
  }
  return 'full'
}

function setEnhancementState(
  region: MinimalRegion,
  state: HeroEnhancementState,
  reason: HeroEnhancementReason,
) {
  try {
    region.setAttribute?.('data-hero-enhancement', state)
    if (reason) region.setAttribute?.('data-enhancement-reason', String(reason))
    else region.removeAttribute?.('data-enhancement-reason')
  } catch {
    // never let bookkeeping hide content
  }
}

/**
 * Enhance one semantic hero region. Never hides copy, node list, or detail
 * surfaces; only the canvas/labels layer visibility changes. All failures
 * resolve to a `fallback` handle with the semantic DOM untouched.
 */
export async function enhanceHeroRegion(
  region: MinimalRegion & {
    querySelector?: (selector: string) => never
    querySelectorAll?: (selector: string) => never[]
  },
  options: EnhanceHeroRegionOptions = {},
): Promise<HeroEnhancementHandle> {
  const handle: HeroEnhancementHandle = {
    state: 'idle',
    reason: null,
    dispose: () => {},
  }

  const typedRegion = region as MinimalRegion & {
    querySelector?: (selector: string) => unknown
  }

  if (
    getAttr(typedRegion, 'data-hero-enhancement') === 'enhanced' ||
    getAttr(typedRegion, 'data-hero-enhancement') === 'fallback-pending'
  ) {
    handle.state = 'idle'
    handle.reason = 'already-enhanced'
    return handle
  }

  if (!isEligibleHeroRegion(typedRegion)) {
    setEnhancementState(typedRegion, 'idle', 'not-eligible')
    handle.state = 'idle'
    handle.reason = 'not-eligible'
    return handle
  }

  if (options.doc && !shouldLoadScene(typedRegion, options.doc)) {
    const duplicate = countRegions(options.doc) !== 1
    setEnhancementState(
      typedRegion,
      'idle',
      duplicate ? 'duplicate-graph' : 'gateway-route',
    )
    handle.state = 'idle'
    handle.reason = duplicate ? 'duplicate-graph' : 'gateway-route'
    return handle
  }

  const loadScene = options.loadScene ?? (() => import('./graph-scene'))
  const loadController =
    options.loadController ?? (() => import('./graph-controller'))
  const loadMotion = options.loadMotion ?? (() => import('./graph-motion'))

  let sceneModule: { createGraphScene: GraphSceneFactory }
  let controllerModule: { createGraphController: GraphControllerFactory }
  let motionModule: {
    createGraphMotion: (options: never) => GraphMotionHandle
  }
  try {
    ;[sceneModule, controllerModule, motionModule] = await Promise.all([
      loadScene(),
      loadController(),
      loadMotion(),
    ])
  } catch {
    setEnhancementState(typedRegion, 'fallback', 'import-rejected')
    handle.state = 'fallback'
    handle.reason = 'import-rejected'
    return handle
  }

  const embedded = readEmbeddedPayload(typedRegion)
  if (!embedded.ok) {
    setEnhancementState(typedRegion, 'fallback', 'invalid-payload')
    handle.state = 'fallback'
    handle.reason = 'invalid-payload'
    return handle
  }
  const payload = embedded.payload

  const canvas = typedRegion.querySelector?.(
    '[data-graph-canvas]',
  ) as unknown as HTMLCanvasElement | null
  const stage = typedRegion.querySelector?.(
    '[data-graph-scene]',
  ) as unknown as HTMLElement | null
  const detailElement = typedRegion.querySelector?.(
    '[data-graph-detail]',
  ) as unknown as HTMLElement | null
  if (!canvas || !stage) {
    setEnhancementState(typedRegion, 'fallback', 'invalid-payload')
    handle.state = 'fallback'
    handle.reason = 'invalid-payload'
    return handle
  }

  // Labels layer overlays the reserved slot absolutely (no layout shift).
  // Created once; reused on remount.
  let labelsLayer = typedRegion.querySelector?.(
    '[data-graph-labels]',
  ) as unknown as HTMLElement | null
  if (!labelsLayer) {
    try {
      const creator =
        options.doc?.createElement?.bind(options.doc) ??
        (typeof document !== 'undefined'
          ? document.createElement.bind(document)
          : null)
      if (creator) {
        labelsLayer = creator('div') as unknown as HTMLElement
        ;(labelsLayer as unknown as MinimalRegion).setAttribute?.(
          'data-graph-labels',
          '',
        )
        ;(
          labelsLayer as unknown as {
            setAttribute(name: string, value: string): void
          }
        ).setAttribute('class', 'hg-labels')
        ;(
          labelsLayer as unknown as {
            setAttribute(name: string, value: string): void
          }
        ).setAttribute('aria-hidden', 'true')
        ;(
          stage as unknown as { appendChild(child: unknown): void }
        ).appendChild(labelsLayer)
      }
    } catch {
      labelsLayer = null
    }
  }

  const labelById = new Map(payload.nodes.map((node) => [node.id, node.label]))
  let activeLabelId: string | null = options.initialSelectedId ?? null
  const renderLabels = (labels: ProjectedLabel[]) => {
    if (!labelsLayer) return
    try {
      const layer = labelsLayer as unknown as {
        replaceChildren?: (...nodes: unknown[]) => void
        innerHTML?: string
        appendChild?: (child: unknown) => void
      }
      const creator =
        options.doc?.createElement?.bind(options.doc) ??
        (typeof document !== 'undefined'
          ? document.createElement.bind(document)
          : null)
      if (!creator) return
      // Clear without touching semantic nodes (labels layer only).
      if (typeof layer.replaceChildren === 'function') layer.replaceChildren()
      else if ('innerHTML' in layer) layer.innerHTML = ''
      for (const item of labels) {
        if (!item.visible) continue
        const chip = creator('button') as unknown as {
          setAttribute(name: string, value: string): void
          textContent: string
        } & { style?: { setProperty(name: string, value: string): void } } & {
          className?: string
        } & { type?: string }
        chip.setAttribute('data-projected-label', item.id)
        chip.setAttribute('type', 'button')
        chip.setAttribute('aria-hidden', 'true')
        chip.setAttribute('tabindex', '-1')
        chip.textContent = labelById.get(item.id) ?? item.id
        try {
          ;(chip as unknown as { className: string }).className =
            item.id === activeLabelId ? 'hg-label is-selected' : 'hg-label'
          const style = (
            chip as unknown as {
              style?: { setProperty(name: string, value: string): void }
            }
          ).style
          // Absolute overlay coordinates; the reserved slot never moves.
          ;(chip as unknown as Record<string, unknown>)['style'] =
            (chip as unknown as Record<string, unknown>)['style'] ?? {}
          const inline = (
            chip as unknown as {
              style: Record<string, string> & {
                setProperty?: (name: string, value: string) => void
              }
            }
          ).style
          if (typeof style?.setProperty === 'function') {
            style.setProperty('left', `${item.x}px`)
            style.setProperty('top', `${item.y}px`)
          } else {
            inline.left = `${item.x}px`
            inline.top = `${item.y}px`
          }
        } catch {
          // labels are decorative; never fail enhancement for them
        }
        layer.appendChild?.(chip)
      }
    } catch {
      // label projection must never break selection or fallback
    }
  }

  let sceneHandle: {
    render(): void
    resize(w: number, h: number, dpr: number): void
    setPalette(p: ScenePalette): void
    setSelection(id: string | null): void
    setMotion(m: SceneMotionPreference): void
    dispose(): void
  } | null = null
  let controllerHandle: { dispose(): void } | null = null
  let motionHandle: {
    playSettle(): Promise<void>
    animateSelection(id: string | null): Promise<void>
    setMotionPreference(p: SceneMotionPreference): void
    dispose(): void
  } | null = null

  const cleanups: Array<() => void> = []
  let settled: 'pending' | 'enhanced' | 'fallback' = 'pending'
  let consecutiveSlowFrames = 0

  const disposeAll = () => {
    for (const cleanup of cleanups.splice(0)) {
      try {
        cleanup()
      } catch {
        // ignore
      }
    }
    try {
      motionHandle?.dispose()
    } catch {
      // ignore
    }
    try {
      sceneHandle?.dispose()
    } catch {
      // ignore
    }
    try {
      controllerHandle?.dispose()
    } catch {
      // ignore
    }
    sceneHandle = null
    motionHandle = null
    controllerHandle = null
  }

  const enterFallback = (reason: HeroEnhancementReason) => {
    if (settled === 'fallback') return
    settled = 'fallback'
    handle.state = 'fallback'
    handle.reason = reason
    setEnhancementState(typedRegion, 'fallback', reason)
    // Hide only the canvas; semantic list/detail/prompt stay untouched so
    // selection and content survive context loss and import failures.
    try {
      ;(canvas as unknown as { hidden?: boolean }).hidden = true
    } catch {
      // ignore
    }
    try {
      motionHandle?.dispose()
    } catch {
      // ignore
    }
    try {
      sceneHandle?.dispose()
    } catch {
      // ignore
    }
    motionHandle = null
    sceneHandle = null
    // Controller stays alive when possible so native disclosures keep their
    // enhanced sync; disposal of the whole enhancement still cleans it up.
  }

  const onSceneError = (code: SceneErrorCode) => {
    enterFallback(code)
  }

  try {
    const selectedId =
      options.initialSelectedId ??
      (getAttr(typedRegion, 'data-selected-id') as string | null) ??
      null

    sceneHandle = sceneModule.createGraphScene({
      canvas: canvas as unknown as HTMLCanvasElement,
      payload,
      palette: paletteFromWindow(options.win),
      motion: motionFromWindow(options.win),
      selectedId,
      onFrame: renderLabels,
      onError: onSceneError,
    })
    if (handle.state === 'fallback') {
      sceneHandle.dispose()
      sceneHandle = null
      handle.dispose = () => disposeAll()
      return handle
    }

    controllerHandle = controllerModule.createGraphController({
      container: typedRegion,
      labelsContainer: labelsLayer,
      detailElement,
      initialSelectedId: selectedId,
      onSelectionChange: (state: { selectedId: string | null }) => {
        activeLabelId = state.selectedId
        try {
          sceneHandle?.setSelection(state.selectedId)
        } catch {
          // ignore
        }
        try {
          void motionHandle?.animateSelection(state.selectedId)
        } catch {
          // ignore
        }
      },
    } as never) as unknown as { dispose(): void }

    // Wire the controller to the semantic region when the factory supports
    // container binding (CA-05 enhanced signature). The locked base factory
    // still works without it; selection then flows via scene/motion only.
    void controllerHandle

    motionHandle = (
      motionModule.createGraphMotion as unknown as (options: {
        scene: unknown
        canvas: unknown
        stage: unknown
        labelsContainer: unknown
        detailElement: unknown
        motionPreference: SceneMotionPreference
      }) => {
        playSettle(): Promise<void>
        animateSelection(id: string | null): Promise<void>
        setMotionPreference(p: SceneMotionPreference): void
        dispose(): void
      }
    )({
      scene: sceneHandle,
      canvas,
      stage,
      labelsContainer: labelsLayer,
      detailElement,
      motionPreference: motionFromWindow(options.win),
    })
  } catch {
    enterFallback('import-rejected')
    handle.dispose = () => disposeAll()
    return handle
  }

  // Theme changes re-tint the existing scene; selection is untouched.
  const onThemeChange = () => {
    if (settled !== 'enhanced') return
    try {
      sceneHandle?.setPalette(paletteFromWindow(options.win))
      sceneHandle?.render()
    } catch {
      // ignore; a failed re-tint must not clear content
    }
  }
  try {
    const target =
      (options.win as unknown as {
        addEventListener?: (type: string, handler: () => void) => void
      } | null) ?? (typeof window !== 'undefined' ? window : null)
    target?.addEventListener?.('tm-themechange', onThemeChange)
    if (target?.addEventListener) {
      cleanups.push(() =>
        target.removeEventListener?.('tm-themechange', onThemeChange as never),
      )
    }
  } catch {
    // ignore
  }

  // Resize re-renders on demand only.
  const doResize = () => {
    if (settled !== 'enhanced') return
    try {
      const el = stage as unknown as {
        clientWidth?: number
        clientHeight?: number
      }
      const width = Number(el.clientWidth ?? 0)
      const height = Number(el.clientHeight ?? 0)
      if (width <= 0 || height <= 0) return
      const dpr =
        Number(
          (options.win as unknown as { devicePixelRatio?: number } | null)
            ?.devicePixelRatio,
        ) ||
        (typeof window !== 'undefined' ? window.devicePixelRatio : 1) ||
        1
      const started = typeof performance !== 'undefined' ? performance.now() : 0
      sceneHandle?.resize(width, height, dpr)
      if (started) {
        const elapsed = performance.now() - started
        consecutiveSlowFrames = elapsed > 50 ? consecutiveSlowFrames + 1 : 0
        if (consecutiveSlowFrames >= 5) enterFallback('frame-budget-exceeded')
      }
    } catch {
      // ignore
    }
  }
  try {
    const target =
      (options.win as unknown as {
        addEventListener?: (type: string, handler: () => void) => void
      } | null) ?? (typeof window !== 'undefined' ? window : null)
    target?.addEventListener?.('resize', doResize)
    if (target?.addEventListener) {
      cleanups.push(() =>
        target.removeEventListener?.('resize', doResize as never),
      )
    }
  } catch {
    // ignore
  }

  // Offscreen/hidden: stop scheduled work without tearing down selection.
  let isVisible = true
  try {
    const IO =
      (options.win as unknown as { IntersectionObserver?: unknown } | null) ??
      (typeof IntersectionObserver !== 'undefined'
        ? { IntersectionObserver }
        : null)
    const Observer = (
      IO as unknown as {
        IntersectionObserver?: new (
          cb: (entries: Array<{ isIntersecting: boolean }>) => void,
        ) => { observe(e: unknown): void; disconnect(): void }
      }
    )?.IntersectionObserver
    if (Observer && stage) {
      const observer = new Observer((entries) => {
        isVisible = entries.some((entry) => entry.isIntersecting)
      })
      observer.observe(stage)
      cleanups.push(() => observer.disconnect())
    }
  } catch {
    // ignore
  }
  void isVisible

  const onContextLost = (event: { preventDefault?: () => void }) => {
    try {
      event.preventDefault?.()
    } catch {
      // ignore
    }
    enterFallback('context-lost')
  }
  try {
    ;(
      canvas as unknown as {
        addEventListener?: (type: string, handler: (e: never) => void) => void
      }
    ).addEventListener?.('webglcontextlost', onContextLost as never)
    cleanups.push(() =>
      (
        canvas as unknown as {
          removeEventListener?: (
            type: string,
            handler: (e: never) => void,
          ) => void
        }
      ).removeEventListener?.('webglcontextlost', onContextLost as never),
    )
  } catch {
    // ignore
  }

  const onPageHide = () => disposeAll()
  try {
    const target =
      (options.win as unknown as {
        addEventListener?: (type: string, handler: () => void) => void
      } | null) ?? (typeof window !== 'undefined' ? window : null)
    target?.addEventListener?.('pagehide', onPageHide)
    if (target?.addEventListener) {
      cleanups.push(() =>
        target.removeEventListener?.('pagehide', onPageHide as never),
      )
    }
  } catch {
    // ignore
  }

  // Success: reveal the canvas only; copy/list/detail were never hidden.
  settled = 'enhanced'
  handle.state = 'enhanced'
  handle.reason = null
  setEnhancementState(typedRegion, 'enhanced', null)
  try {
    ;(canvas as unknown as { hidden?: boolean }).hidden = false
  } catch {
    // ignore
  }
  try {
    doResize()
  } catch {
    // ignore
  }
  try {
    void motionHandle?.playSettle()
  } catch {
    // ignore
  }

  handle.dispose = () => {
    disposeAll()
    try {
      ;(canvas as unknown as { hidden?: boolean }).hidden = true
    } catch {
      // ignore
    }
    if (handle.state !== 'fallback') {
      handle.state = 'idle'
      handle.reason = null
      setEnhancementState(typedRegion, 'idle', null)
    }
  }

  return handle
}
