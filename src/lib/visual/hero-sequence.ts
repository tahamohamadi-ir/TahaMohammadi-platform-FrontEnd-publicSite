/**
 * Hero v2 — Home scroll sequence controller (Stage 4).
 *
 * The four authored Stage 3 states are crossfaded by scroll progress only. There is no idle
 * loop, no autoplay, no video, no WebGL and no CSS rotation: if the user does not scroll, the
 * visual does not move, and scroll progress is the single motion driver.
 *
 * The mapping is deliberately boring, because boring is what "calm and editorial" means here:
 * progress is linear in scroll distance, the two frames adjacent to the current progress are
 * the only ones with non-zero opacity, and their opacities sum to 1. Nothing snaps, nothing
 * overshoots, nothing eases harder than the interpolation the browser can already do.
 *
 * Pure functions first (progress mapping, opacity distribution, direction), so the behaviour
 * is testable without a browser; the DOM mount at the bottom is a thin shell over them.
 */

export const FRAME_COUNT = 4

/**
 * Static frame for `prefers-reduced-motion`. Chosen from real browser captures of the full
 * hero (see the Stage 4 report): frame 02 keeps the health companion clear of the desktop copy
 * column while still reading as a settled, slightly-rotated state rather than the plain rest
 * pose; frame 03 pushes it far enough left to crowd the copy gutter at 1280px.
 */
export const REDUCED_MOTION_FRAME_INDEX = 1

/**
 * Effective scroll transition space. The plan's restraint rules out scroll-jacking, so this is
 * the height the hero holds for while the sequence advances: ~120vh on desktop, ~90vh on
 * mobile where long holds feel worse. It is CSS-driven (`--hero-sequence-travel`) and the
 * controller reads the measured travel, so layout stays the source of truth.
 */
export const DEFAULT_TRAVEL_FRACTION = 1.2

/**
 * Share of the viewport the scrub spans while the hero is still in frame. Measured evidence in
 * the Stage 4 report: with 0.7 all four states play while the hero remains visible; larger
 * values push the last states off-screen because the hero cannot be pinned in this template.
 */
export const VISIBLE_TRAVEL_FRACTION = 0.7

/**
 * Stage 4.1 pinning bands (card §3): desktop 0.50-0.70 viewport heights of scrub travel, mobile
 * 0.45-0.60. The chosen fractions sit inside both bands, so the pin is a short, controlled
 * interval rather than a theatrical scroll.
 */
export const PIN_TRAVEL_FRACTION = 0.6
export const PIN_TRAVEL_FRACTION_MOBILE = 0.55
export const PIN_TRAVEL_MIN_FRACTION = 0.5
export const PIN_TRAVEL_MIN_FRACTION_MOBILE = 0.45
export const PIN_TRAVEL_MAX_FRACTION = 0.7
export const PIN_TRAVEL_MAX_FRACTION_MOBILE = 0.6
/** Breathing room under the sticky header before a hero is judged unable to pin safely (card §4). */
export const PIN_HEADER_SAFETY_PX = 24
export const PIN_MIN_TRAVEL_PX = 220

/**
 * Crossfade strategy (card §6). 'linear' spreads the blend across the whole segment; 'window'
 * holds each authored state and blends only inside a short window centred on the boundary. The
 * card makes this a screenshot decision, so both mappings exist and QA captures them side by side.
 */
export const CROSSFADE_STRATEGY: 'linear' | 'window' = 'window'
/** Share of one segment occupied by the crossfade in the windowed strategy. */
export const CROSSFADE_WINDOW = 0.2

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

/** Opacities for the four frames at a given progress. Only adjacent frames are visible. */
export function frameOpacities(progress: number): number[] {
  const scaled = clamp01(progress) * (FRAME_COUNT - 1)
  const lower = Math.floor(scaled)
  const upper = Math.min(lower + 1, FRAME_COUNT - 1)
  const local = scaled - lower
  const opacities = new Array<number>(FRAME_COUNT).fill(0)
  if (lower === upper || local === 0) {
    opacities[lower] = 1
    return opacities
  }
  opacities[lower] = 1 - local
  opacities[upper] = local
  return opacities
}

/**
 * Progress from the hero's own position: 0 while the hero still sits at its resting offset and
 * 1 once the authored travel has been scrolled. Measured values in, no globals.
 */
export function progressForScroll(
  scrollY: number,
  scopeTop: number,
  travel: number,
): number {
  if (travel <= 0) return 0
  return clamp01((scrollY - scopeTop) / travel)
}

/** Which frame should lead when motion is not available. */
/**
 * Strategy B: hold the dominant authored state and crossfade only inside a short window centred
 * on the boundary. The window is a share of one segment (0.2 = the middle fifth by default), and
 * it can never leave more than two frames visible.
 */
export function frameOpacitiesWindowed(
  progress: number,
  window_: number,
): number[] {
  const scaled = clamp01(progress) * (FRAME_COUNT - 1)
  const lower = Math.min(Math.floor(scaled), FRAME_COUNT - 2)
  const local = scaled - lower
  const half = Math.min(0.49, Math.max(0.01, window_ / 2))
  const start = 0.5 - half
  const end = 0.5 + half
  if (local <= start) {
    return Array.from({ length: FRAME_COUNT }, (_, i) => (i === lower ? 1 : 0))
  }
  if (local >= end) {
    return Array.from({ length: FRAME_COUNT }, (_, i) =>
      i === lower + 1 ? 1 : 0,
    )
  }
  const t = (local - start) / (end - start)
  return Array.from({ length: FRAME_COUNT }, (_, i) => {
    if (i === lower) return 1 - t
    if (i === lower + 1) return t
    return 0
  })
}

export function staticFrameIndex(): number {
  return REDUCED_MOTION_FRAME_INDEX
}

export interface SequenceElements {
  scope: HTMLElement
  frames: HTMLElement[]
  travel: number
  reducedMotion: boolean
}

export interface SequenceController {
  update: () => void
  start: () => void
  stop: () => void
  destroy: () => void
}

/**
 * Mount the scrubber. Work happens only while the hero is in view: an IntersectionObserver
 * gates the rAF loop, scroll events are coalesced into one animation frame, and nothing runs
 * once the hero has left the viewport or reduced motion has been requested.
 */
export function mountHeroSequence(
  root: HTMLElement,
  options: {
    themeChangeEvent?: string
    matchMedia?: (q: string) => MediaQueryList
  } = {},
): SequenceController | null {
  // The caller passes the SCOPE element: the block that owns the scroll travel.
  //
  // Frames are queried inside it and grouped by authored theme: the markup ships one set per
  // theme (the inactive one hidden), so a valid scope holds a whole multiple of FRAME_COUNT
  // frames. Every group gets the same opacities, which is what makes a theme switch keep the
  // state the reader is already at instead of jumping back to frame 01.
  const scope = root
  // The visible readback lives on the sequence element; the scope is only measured.
  const progressTarget =
    root.querySelector<HTMLElement>('[data-hero-sequence]') ?? root
  const groups = Array.from(
    root.querySelectorAll<HTMLElement>('[data-hero-sequence-theme]'),
  )
  const frames = (groups.length ? groups : [root]).flatMap((group) =>
    Array.from(
      group.querySelectorAll<HTMLElement>('[data-hero-sequence-frame]'),
    ),
  )
  if (frames.length === 0 || frames.length % FRAME_COUNT !== 0) return null
  // Frames per authored set (one set per theme), used to index every group identically.
  const groupSize = groups.length
    ? frames.length / groups.length
    : frames.length

  const match =
    options.matchMedia ??
    (typeof window !== 'undefined' ? window.matchMedia.bind(window) : undefined)
  if (!match) return null
  const reduced = match('(prefers-reduced-motion: reduce)')

  let travel = 0
  let progress = -1
  let raf = 0
  let visible = true
  let stopped = true

  const measure = () => {
    const viewport = scope.querySelector<HTMLElement>(
      '[data-hero-sticky-viewport]',
    )
    const stage = viewport ?? (scope.firstElementChild as HTMLElement | null)
    const header = document.querySelector<HTMLElement>('.site-header')
    const headerHeight = header
      ? Math.round(header.getBoundingClientRect().height)
      : 0
    const mobile = window.matchMedia('(max-width: 767px)').matches
    const fraction = mobile ? PIN_TRAVEL_FRACTION_MOBILE : PIN_TRAVEL_FRACTION
    const minFraction = mobile
      ? PIN_TRAVEL_MIN_FRACTION_MOBILE
      : PIN_TRAVEL_MIN_FRACTION
    const maxFraction = mobile
      ? PIN_TRAVEL_MAX_FRACTION_MOBILE
      : PIN_TRAVEL_MAX_FRACTION
    const viewportHeight = window.innerHeight
    const stageHeight = stage
      ? Math.round(stage.getBoundingClientRect().height)
      : 0

    if (reduced.matches) {
      // Card §11: no shell travel, no sticky travel, normal flow.
      scope.dataset.heroSequenceMode = 'reduced'
      delete scope.dataset.heroSequencePinned
      scope.style.removeProperty('--hero-scroll-travel')
      scope.style.removeProperty('--hero-scroll-shell-height')
      travel = Math.max(PIN_MIN_TRAVEL_PX, viewportHeight * fraction)
      return
    }

    // Capability guard (card §4): pin only when the hero really fits under the sticky header.
    // Otherwise this viewport keeps the non-pinned scrub - a genuine capability fallback, not a
    // blanket "mobile is static" rule.
    const available = viewportHeight - headerHeight - PIN_HEADER_SAFETY_PX
    const eligible = stageHeight > 0 && stageHeight <= available
    if (!eligible) {
      const doc = document.scrollingElement ?? document.documentElement
      const shellTop = scope.getBoundingClientRect().top + window.scrollY
      const remaining = doc.scrollHeight - viewportHeight - shellTop
      const designed = Math.max(
        PIN_MIN_TRAVEL_PX,
        viewportHeight * PIN_TRAVEL_MAX_FRACTION,
      )
      travel = remaining > 120 ? Math.min(designed, remaining) : designed
      scope.dataset.heroSequenceMode = 'fallback'
      delete scope.dataset.heroSequencePinned
      scope.style.removeProperty('--hero-scroll-travel')
      scope.style.removeProperty('--hero-scroll-shell-height')
      return
    }

    // Pinned travel inside the card's band, bounded by measured geometry.
    const bandFloor = viewportHeight * minFraction
    const bandCeil = viewportHeight * maxFraction
    travel = Math.min(
      bandCeil,
      Math.max(
        Math.max(bandFloor, PIN_MIN_TRAVEL_PX),
        viewportHeight * fraction,
      ),
    )
    scope.dataset.heroSequenceMode = 'sticky'
    scope.dataset.heroSequencePinned = String(Math.round(travel))
    // Shell height = sticky viewport height + travel; the pin sits under the measured header.
    scope.style.setProperty('--hero-scroll-travel', `${Math.round(travel)}px`)
    scope.style.setProperty(
      '--hero-scroll-shell-height',
      `${Math.round(stageHeight + travel)}px`,
    )
    scope.style.setProperty('--hero-sequence-sticky-top', `${headerHeight}px`)
  }

  const apply = (value: number) => {
    if (value === progress) return
    progress = value
    const opacities =
      CROSSFADE_STRATEGY === 'window'
        ? frameOpacitiesWindowed(value, CROSSFADE_WINDOW)
        : frameOpacities(value)
    frames.forEach((frame, index) => {
      // Index within the authored set, so every theme group shows the same state.
      const state = index % groupSize
      frame.style.opacity = String(opacities[state] ?? 0)
      frame.dataset.frameVisible = opacities[state] > 0 ? 'true' : 'false'
    })
    progressTarget.dataset.heroSequenceProgress = value.toFixed(4)
    // Observable so QA can compare the scrub's own divisor with the viewport it measured.
    progressTarget.dataset.heroSequenceTravel = String(Math.round(travel))
    progressTarget.dataset.heroSequenceMode =
      scope.dataset.heroSequenceMode ?? ''
    progressTarget.dataset.heroSequenceFade = CROSSFADE_STRATEGY
  }

  const update = () => {
    if (reduced.matches) {
      // One representative static frame: no scrubbing, no work while scrolling.
      apply(staticFrameIndex() / (FRAME_COUNT - 1))
      return
    }
    measure()
    // card §5: progress = clamp01((scrollY - shellStart) / shellTravel) - the shell's own travel,
    // never the page's remaining height, so document length cannot alter the authored mapping.
    const shellStart = scope.getBoundingClientRect().top + window.scrollY
    apply(progressForScroll(window.scrollY, shellStart, travel))
  }

  const onScroll = () => {
    if (stopped || !visible) return
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      raf = 0
      update()
    })
  }

  const onResize = () => {
    measure()
    onScroll()
  }

  const start = () => {
    if (!stopped) return
    stopped = false
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    reduced.addEventListener?.('change', onResize)
    measure()
    update()
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    reduced.removeEventListener?.('change', onResize)
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
  }

  const destroy = () => {
    stop()
    observer?.disconnect()
  }

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            visible = entries.some((entry) => entry.isIntersecting)
            if (visible) start()
            else stop()
          },
          { rootMargin: '120px 0px' },
        )
      : null

  if (observer) observer.observe(scope)
  else start()

  const themeEvent = options.themeChangeEvent ?? 'tm-themechange'
  if (themeEvent) window.addEventListener(themeEvent, onResize)

  return { update, start, stop, destroy }
}
