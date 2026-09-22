/** Enhancement orchestrator + capability detection (Plan C Task 15).
 *
 * Mirrors the proven RU orchestration pattern: single-flight, per-failure
 * reasons, dispose-all, no permanent loop. Decides 3D vs 2D from
 * `WebGLRenderingContext` availability + `matchMedia('(min-width: 1024px)')`.
 * The runtime refresh runs before scene construction and never blocks the
 * first paint (the server-rendered list is already on screen).
 *
 * DOM seam: the region is structural (`getAttribute`/`setAttribute`/
 * `querySelector`), so tests inject fakes — no DOM library, no new dependency.
 */
import { refreshAtlas, type AtlasRefreshOutcome } from '../../atlas/refresh'
import { parseFocus } from '../../atlas/url-state'
import type { AtlasFocus } from '../../atlas/selection'
import { ATLAS_CONTRACT_VERSION } from '../../atlas/model'

export type AtlasPresentation = 'enhanced' | 'fallback' | 'list'
export type AtlasEnhancementReason =
  | 'webgl-unavailable'
  | 'narrow-viewport'
  | 'import-rejected'
  | 'already-enhanced'
  | 'not-eligible'
  | null

export interface AtlasRegionLike {
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  querySelector(selector: string): unknown
}

export interface AtlasWindowLike {
  WebGLRenderingContext?: unknown
  matchMedia?: (query: string) => { matches: boolean }
}

export interface EnhanceAtlasOptions {
  win?: AtlasWindowLike
  matchMedia?: (query: string) => { matches: boolean }
  webgl?: (region: AtlasRegionLike) => boolean
  /** Test seam: replaces the lazy scene import. Defaults to capable. */
  loadScene?: () => Promise<unknown>
  refresh?: (args: {
    locale: 'en' | 'fa'
    embedded: { revision: string; etag: string }
  }) => Promise<AtlasRefreshOutcome>
  location?: { search: string }
  onSelection?: (focus: AtlasFocus | null) => void
  /** Test seam: pretend `WebGLRenderingContext` exists without a window. */
  assumeWebgl?: boolean
  /**
   * Reduced-motion subscription (Task 21): the page script owns the
   * `matchMedia('(prefers-reduced-motion: reduce)')` change listener and
   * forwards through `onMotionChange`; the scene applies it via `setMotion`
   * with no rebuild. The seam stays a plain value so tests need no DOM.
   */
  reducedMotion?: {
    matches: boolean
  }
  onMotionChange?: (motion: 'reduced' | 'full') => void
}

export interface AtlasEnhancementHandle {
  state: AtlasPresentation
  reason: AtlasEnhancementReason
  dispose: () => void
}

let enhancedRegion: AtlasRegionLike | null = null

function webglAvailable(
  region: AtlasRegionLike,
  win?: AtlasWindowLike,
): boolean {
  try {
    if (!win?.WebGLRenderingContext) return false
    return region.querySelector('[data-atlas-canvas]') != null
  } catch {
    return false
  }
}

function wideViewport(
  matchMedia: ((query: string) => { matches: boolean }) | undefined,
  win?: AtlasWindowLike,
): boolean {
  const fn = matchMedia ?? win?.matchMedia
  if (!fn) return true
  try {
    return fn('(min-width: 1024px)').matches
  } catch {
    return true
  }
}

export async function enhanceAtlasRegion(
  region: AtlasRegionLike,
  options: EnhanceAtlasOptions = {},
): Promise<AtlasEnhancementHandle> {
  const noop = () => {}
  if (enhancedRegion === region || enhancedRegion != null) {
    region.setAttribute('data-atlas-presentation', '2d')
    return { state: 'fallback', reason: 'already-enhanced', dispose: noop }
  }
  const status = region.getAttribute('data-atlas-status')
  const contract = region.getAttribute('data-atlas-contract')
  const hasScene = region.querySelector('[data-atlas-scene]') != null
  if (status !== 'ready' || contract !== ATLAS_CONTRACT_VERSION || !hasScene) {
    return { state: 'list', reason: 'not-eligible', dispose: noop }
  }

  const webglOk =
    options.assumeWebgl === true
      ? true
      : options.webgl
        ? options.webgl(region)
        : webglAvailable(region, options.win)
  if (!webglOk) {
    region.setAttribute('data-atlas-presentation', '2d')
    return { state: 'fallback', reason: 'webgl-unavailable', dispose: noop }
  }
  if (!wideViewport(options.matchMedia, options.win)) {
    region.setAttribute('data-atlas-presentation', '2d')
    return { state: 'fallback', reason: 'narrow-viewport', dispose: noop }
  }

  // Refresh first, scene second — the list paint never waits for either.
  const revision = region.getAttribute('data-atlas-revision') ?? ''
  const etag = region.getAttribute('data-atlas-etag') ?? ''
  const locale: 'en' | 'fa' =
    region.getAttribute('data-atlas-locale') === 'fa' ? 'fa' : 'en'
  if (options.refresh) {
    try {
      const outcome = await options.refresh({
        locale,
        embedded: { revision, etag },
      })
      region.setAttribute('data-atlas-refresh', outcome)
    } catch {
      region.setAttribute('data-atlas-refresh', 'kept-error')
    }
  } else {
    try {
      const outcome = await refreshAtlas({
        locale,
        embedded: { revision, etag: etag || '', publishedAt: '', id: 0 },
        fetchFn: fetch,
        onAdopt: noop as never,
        onKeep: noop as never,
      })
      region.setAttribute('data-atlas-refresh', outcome)
    } catch {
      // Refresh never blocks enhancement; the snapshot stays.
    }
  }

  // Selection from the URL, resolved grammar-first (the selection model owns
  // membership; the scene task wires it to the DOM in Task 15's page script).
  const search = options.location?.search ?? ''
  const initial: AtlasFocus | null = search ? parseFocus(search) : null
  options.onSelection?.(initial)
  region.setAttribute('data-atlas-state', initial ? initial.kind : 'overview')

  try {
    await (options.loadScene ? options.loadScene() : Promise.resolve({}))
  } catch {
    region.setAttribute('data-atlas-presentation', '2d')
    return { state: 'fallback', reason: 'import-rejected', dispose: noop }
  }

  enhancedRegion = region
  region.setAttribute('data-atlas-presentation', '3d')
  // Labels module wiring lands with the scene (Task 16); the import seam is
  // proven here so the orchestrator never grows a second lazy path.
  // Reduced-motion live subscription (Task 21): the scene applies it via
  // `setMotion` with no rebuild; the page script owns the `change` listener
  // and forwards through `onMotionChange` (the orchestrator never touches
  // the DOM event bus, so the seam stays unit-testable without a DOM).
  if (options.reducedMotion && options.onMotionChange) {
    try {
      const initial = options.reducedMotion.matches
      options.onMotionChange(initial ? 'reduced' : 'full')
    } catch {
      // Bookkeeping must never break enhancement.
    }
  }
  return {
    state: 'enhanced',
    reason: null,
    dispose: () => {
      if (enhancedRegion === region) enhancedRegion = null
    },
  }
}

/** Test seam: release the process-wide single-flight flag. */
export function resetAtlasEnhancementForTests(): void {
  enhancedRegion = null
}
