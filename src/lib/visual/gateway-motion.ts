/**
 * CA-07 — Bounded GSAP choreography for the gateway portal.
 *
 * One entrance only (600–900ms settle, target 750ms): the procedural arch
 * is visible as soon as its first frame exists while satellites settle.
 * The raster fallback yields only after that visible frame. Language selection
 * never waits for it. Reduced motion renders the static pose instantly with
 * no transforms; a live preference change takes effect without reload.
 * One scheduled render source: GSAP ticks drive `scene.render()` during the
 * entrance and a four-second orbital arrival, then goes idle. Scoped with
 * `gsap.context`, reduced-motion via `gsap.matchMedia`, full revert on disposal.
 * No second motion library.
 *
 * PW-2 adds the language-entry state machine and its choreography on top of the
 * same context:
 *
 *   idle -> previewing -> idle                    (hover/focus intent, reversible)
 *   idle|previewing -> committed -> entering -> navigating
 *   any -> disposed
 *
 * Only one activation can commit. After commit the second activation is
 * ignored, preview switching stops, pointer parallax ends and the selected href
 * wins — including when the scene dies mid-flight, when the frame budget trips,
 * or when the animation stalls past its local deadline. None of this touches
 * the global GSAP ticker.
 */

import { gsap } from 'gsap'
import type { PortalSceneHandle } from './portal-scene'
import type { SceneMotionPreference } from './scene-contract'

export interface GatewayMotionOptions {
  scene: PortalSceneHandle
  canvas: HTMLCanvasElement
  stage?: HTMLElement | null
  fallbackElement?: HTMLElement | null
  motionPreference?: SceneMotionPreference
  /** Navigation target. Defaults to a real same-tab location assignment. */
  navigate?: (href: string) => void
  /** Reports every entry-state change so the Astro layer owns the DOM. */
  onEntryState?: (event: GatewayEntryEvent) => void
  /** Local navigation deadline after commit, in milliseconds. */
  entryDeadlineMs?: number
}

export type GatewayEntryState =
  | 'idle'
  | 'previewing'
  | 'committed'
  | 'entering'
  | 'navigating'
  | 'disposed'

export type GatewayEntryProgram = 'flight' | 'instant'

export interface GatewayEntryEvent {
  state: GatewayEntryState
  program: GatewayEntryProgram
  href?: string
}

export interface GatewayMotionHandle {
  playEntrance(): Promise<void>
  setMotionPreference(preference: SceneMotionPreference): void
  /** True while a fresh activation may be enhanced (nothing committed yet). */
  canIntercept(): boolean
  /** Hover / keyboard focus on a language link: reversible, no camera. */
  previewStart(): void
  previewEnd(): void
  /** Click / keyboard activation: commit this href and enter the portal. */
  commit(href: string): void
  /** Scene, context or frame-budget failure after commit: navigate now. */
  failFast(): void
  entryState(): GatewayEntryState
  entryProgram(): GatewayEntryProgram
  /** Travelled distance of the active entry path in meters (0 if none). */
  entryDistance(): number
  /** Test seam: simulate a stalled entry (slow renderer) without navigating. */
  stallEntryForTest(): void
  dispose(): void
}

/** PW-2 timing budget (seconds unless stated). */
export const GATEWAY_ENTRY_TIMING = {
  /** Hover/focus response, reversible. */
  intent: 0.22,
  /** Gentle return of the pointer tilt to neutral before the entry. */
  tiltReturn: 0.35,
  /** Desktop: total 2.05s, inside the 1.8–2.4s target. */
  desktop: {
    activation: 0.45,
    activationDelay: 0.2,
    travel: 1.3,
    travelDelay: 0.45,
    navigate: 2.05,
    deadlineMs: 3000,
  },
  /** Mobile: shorter travel, total 1.8s, inside the 1.5–2.1s target. */
  mobile: {
    activation: 0.4,
    activationDelay: 0.18,
    travel: 1.05,
    travelDelay: 0.4,
    navigate: 1.8,
    deadlineMs: 2900,
  },
  reduced: {
    /** Reduced motion: confirmation + atmospheric response only, no flight. */
    response: 0.16,
    navigate: 0.22,
    deadlineMs: 1200,
  },
} as const

function prefersReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function createGatewayMotion(
  options: GatewayMotionOptions,
): GatewayMotionHandle {
  const {
    scene,
    canvas,
    stage = null,
    fallbackElement = null,
    motionPreference = 'full',
  } = options

  const navigate =
    options.navigate ??
    ((href: string) => {
      window.location.assign(href)
    })
  const reportEntryState = options.onEntryState ?? (() => {})

  let currentPreference = motionPreference
  let isDisposed = false
  // The portal stage is a full-viewport, pointer-transparent layer,
  // so parallax listens at the window level and measures against the stage.
  const interactionTarget = stage ?? canvas
  const rectSource = stage ?? canvas
  const pointerListener: HTMLElement | Window =
    typeof window !== 'undefined' ? window : canvas

  const ctx = gsap.context(() => {}, interactionTarget)
  const mm = gsap.matchMedia()
  let reduceMotion = prefersReduced() || currentPreference !== 'full'
  let finishEntrance: (() => void) | null = null
  // Wall-clock deadline for the bounded arrival. On very slow renderers
  // (software GL) GSAP advances with clamped frame deltas, so the 4s tween
  // can stretch across many frames. A local timeout forces the settled state
  // at ~4.2s without touching the global GSAP ticker.
  const ARRIVAL_DEADLINE_MS = 4200
  let entranceDeadline: number | null = null
  let entranceTimeline: gsap.core.Timeline | null = null
  const pose = { x: 0, y: 0 }
  const orbit = { phase: 0 }
  function updatePose() {
    scene.setPose(pose.x, pose.y)
    scene.render()
  }
  function clearEntranceDeadline() {
    if (entranceDeadline !== null) {
      window.clearTimeout(entranceDeadline)
      entranceDeadline = null
    }
  }
  function completeEntrance() {
    clearEntranceDeadline()
    entranceTimeline = null
    const finish = finishEntrance
    finishEntrance = null
    finish?.()
  }
  function stopEntrance() {
    clearEntranceDeadline()
    entranceTimeline = null
    for (const tween of ctx.getTweens()) tween.kill()
    finishEntrance?.()
    finishEntrance = null
    pose.x = 0
    pose.y = 0
    updatePose()
    settleInstantly()
  }

  mm.add('(prefers-reduced-motion: reduce)', () => {
    reduceMotion = true
    scene.setMotion('reduced')
    stopEntrance()
  })
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    reduceMotion = currentPreference !== 'full'
    scene.setMotion(currentPreference)
  })

  const onVisibility = () => {
    if (document.hidden) {
      for (const tween of ctx.getTweens()) tween.pause()
    } else {
      for (const tween of ctx.getTweens()) tween.resume()
      scene.render()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  // --- PW-2 entry state machine -------------------------------------------
  let entryState: GatewayEntryState = 'idle'
  let navigated = false
  let parallaxEnabled = true
  let intentTween: gsap.core.Tween | null = null
  let entryTimeline: gsap.core.Timeline | null = null
  let entryDeadlineMs: number | null = null
  /** Selected href: survives every later failure path. */
  let lastHref = ''
  const intent = { value: 0 }
  const activation = { value: 0 }
  const entry = { value: 0 }
  let entryDistance = 0

  const isInstantProgram = (): boolean =>
    reduceMotion || currentPreference !== 'full'
  const programFor = (): GatewayEntryProgram =>
    isInstantProgram() ? 'instant' : 'flight'
  const isMobileViewport = (): boolean => {
    try {
      return window.matchMedia('(max-width: 720px)').matches
    } catch {
      return false
    }
  }
  const isCommitted = (): boolean =>
    entryState === 'committed' ||
    entryState === 'entering' ||
    entryState === 'navigating'

  function setEntryState(next: GatewayEntryState, href?: string) {
    entryState = next
    reportEntryState({ state: next, program: programFor(), href })
  }

  function clearEntryDeadline() {
    if (entryDeadlineMs !== null) {
      window.clearTimeout(entryDeadlineMs)
      entryDeadlineMs = null
    }
  }

  /** Navigate exactly once, whatever triggered it. */
  function goToSelected(href: string) {
    if (navigated) return
    navigated = true
    clearEntryDeadline()
    setEntryState('navigating', href)
    navigate(href)
  }

  function previewStart() {
    if (isDisposed || entryState !== 'idle' || isInstantProgram()) return
    setEntryState('previewing')
    intentTween?.kill()
    intentTween = gsap.to(intent, {
      value: 1,
      duration: GATEWAY_ENTRY_TIMING.intent,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => scene.setIntent(intent.value),
    })
  }

  function previewEnd() {
    if (isDisposed || entryState !== 'previewing') return
    setEntryState('idle')
    intentTween?.kill()
    intentTween = gsap.to(intent, {
      value: 0,
      duration: GATEWAY_ENTRY_TIMING.intent,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => scene.setIntent(intent.value),
    })
  }

  function commit(href: string) {
    if (isDisposed || isCommitted() || entryState === 'disposed') return
    if (!href) return
    lastHref = href
    const program = programFor()
    const mobile = isMobileViewport()
    const timing = mobile
      ? GATEWAY_ENTRY_TIMING.mobile
      : GATEWAY_ENTRY_TIMING.desktop

    setEntryState('committed', href)
    // Further preview switching is off and the pointer pose hands the camera
    // back: the tilt returns to neutral gently instead of snapping.
    intentTween?.kill()
    intentTween = null
    intent.value = 0
    scene.setIntent(0)
    parallaxEnabled = false
    ctx.add(() =>
      gsap.to(pose, {
        x: 0,
        y: 0,
        duration: GATEWAY_ENTRY_TIMING.tiltReturn,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: updatePose,
      }),
    )

    // The local deadline is armed before the timeline so a stall can never
    // strand the visitor on the gateway.
    const deadline =
      program === 'instant'
        ? GATEWAY_ENTRY_TIMING.reduced.deadlineMs
        : options.entryDeadlineMs ?? timing.deadlineMs
    entryDeadlineMs = window.setTimeout(() => {
      entryDeadlineMs = null
      entryTimeline?.kill()
      entryTimeline = null
      goToSelected(href)
    }, deadline)

    const timeline = gsap.timeline()
    entryTimeline = timeline

    if (program === 'instant') {
      // Reduced motion: selection confirmation and a short atmospheric
      // response. No camera flight, no orbital convergence, no parallax.
      timeline.call(() => scene.setIntent(1), undefined, 0)
      timeline.to(
        intent,
        {
          value: 1,
          duration: GATEWAY_ENTRY_TIMING.reduced.response,
          ease: 'power1.out',
          onUpdate: () => scene.setIntent(intent.value),
        },
        0,
      )
      timeline.call(() => goToSelected(href), undefined, GATEWAY_ENTRY_TIMING.reduced.navigate)
      return
    }

    // The portal acknowledges the choice before the camera moves.
    timeline.to(
      activation,
      {
        value: 1,
        duration: timing.activation,
        delay: timing.activationDelay,
        ease: 'power2.out',
        onUpdate: () => scene.setActivation(activation.value),
      },
      0,
    )
    timeline.to(
      entry,
      {
        value: 1,
        duration: timing.travel,
        delay: timing.travelDelay,
        ease: 'power2.inOut',
        onUpdate: () => scene.setEntry(entry.value),
      },
      0,
    )
    timeline.call(
      () => {
        scene.beginEntry()
        entryDistance = scene.entryDistance()
        setEntryState('entering', href)
      },
      undefined,
      Math.min(timing.travelDelay, 0.3),
    )
    timeline.call(() => goToSelected(href), undefined, timing.navigate)
  }

  /** Scene / context / frame-budget failure after commit navigates at once. */
  function failFast() {
    if (isDisposed || navigated) return
    if (!isCommitted()) return
    entryTimeline?.kill()
    entryTimeline = null
    const href = lastHref
    if (href) goToSelected(href)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (
      isDisposed ||
      reduceMotion ||
      !parallaxEnabled ||
      document.hidden ||
      !window.matchMedia('(pointer: fine)').matches
    )
      return
    const rect = rectSource.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    ctx.add(() =>
      gsap.to(pose, {
        x: Math.max(
          -0.052,
          Math.min(
            0.052,
            (-(event.clientY - rect.top - rect.height / 2) / rect.height) *
              0.104,
          ),
        ),
        y: Math.max(
          -0.052,
          Math.min(
            0.052,
            ((event.clientX - rect.left - rect.width / 2) / rect.width) * 0.104,
          ),
        ),
        duration: 0.5,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: updatePose,
      }),
    )
  }
  const onPointerLeave = () => {
    if (isDisposed || reduceMotion || !parallaxEnabled) return
    ctx.add(() =>
      gsap.to(pose, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: updatePose,
      }),
    )
  }
  interactionTarget.addEventListener('pointermove', onPointerMove)
  interactionTarget.addEventListener('pointerleave', onPointerLeave)
  if (pointerListener !== interactionTarget) {
    pointerListener.addEventListener('pointermove', onPointerMove as never)
    pointerListener.addEventListener('pointerleave', onPointerLeave)
  }

  function settleInstantly() {
    scene.setOrbitPhase(1)
    gsap.set(canvas, { opacity: 1, scale: 1, y: 0 })
    if (fallbackElement) gsap.set(fallbackElement, { opacity: 0 })
    scene.render()
  }

  return {
    playEntrance(): Promise<void> {
      if (isDisposed) return Promise.resolve()
      if (reduceMotion || currentPreference !== 'full') {
        settleInstantly()
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        finishEntrance = resolve
        ctx.add(() => {
          // The scene has already rendered before this controller is made.
          // Do not run a canvas opacity entrance: a cold dynamic import can
          // otherwise leave the reserved portal blank while the fallback has
          // begun fading out.
          gsap.set(canvas, { opacity: 1, scale: 1, y: 0 })
          if (fallbackElement) gsap.set(fallbackElement, { opacity: 0 })
          const timeline = gsap.timeline({
            onComplete: () => {
              completeEntrance()
            },
          })
          entranceTimeline = timeline
          // The page settles in 750ms; satellites coast into place for four
          // seconds. No perpetual ticker, and reduced motion settles now.
          timeline.to(
            orbit,
            {
              phase: 1,
              duration: 4,
              ease: 'power2.out',
              onUpdate: () => {
                // setOrbitPhase renders on demand internally.
                scene.setOrbitPhase(orbit.phase)
              },
            },
            0,
          )
          // Scoped wall-clock bound: if the tween has not finished (slow or
          // software renderers with clamped GSAP frame deltas), snap the
          // arrival to its settled final value and stop it.
          clearEntranceDeadline()
          entranceDeadline = window.setTimeout(() => {
            entranceDeadline = null
            entranceTimeline?.kill()
            entranceTimeline = null
            orbit.phase = 1
            scene.setOrbitPhase(1)
            completeEntrance()
          }, ARRIVAL_DEADLINE_MS)
        })
      })
    },

    setMotionPreference(preference: SceneMotionPreference) {
      currentPreference = preference
      reduceMotion = preference !== 'full' || prefersReduced()
      scene.setMotion(preference)
      if (reduceMotion) {
        stopEntrance()
      }
    },

    canIntercept() {
      return (
        !isDisposed &&
        !navigated &&
        (entryState === 'idle' || entryState === 'previewing')
      )
    },

    previewStart,
    previewEnd,
    commit,
    failFast,

    entryState() {
      return entryState
    },

    entryProgram() {
      return programFor()
    },

    entryDistance() {
      return entryDistance
    },

    stallEntryForTest() {
      // Leaves the local deadline armed: the honest slow-renderer path.
      entryTimeline?.kill()
      entryTimeline = null
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true
      clearEntryDeadline()
      entryTimeline?.kill()
      entryTimeline = null
      intentTween?.kill()
      intentTween = null
      entryState = 'disposed'
      clearEntranceDeadline()
      entranceTimeline = null
      finishEntrance?.()
      finishEntrance = null
      document.removeEventListener('visibilitychange', onVisibility)
      interactionTarget.removeEventListener('pointermove', onPointerMove)
      interactionTarget.removeEventListener('pointerleave', onPointerLeave)
      if (pointerListener !== interactionTarget) {
        pointerListener.removeEventListener('pointermove', onPointerMove as never)
        pointerListener.removeEventListener('pointerleave', onPointerLeave)
      }
      try {
        scene.endEntry()
        scene.setIntent(0)
        scene.setActivation(0)
      } catch {
        /* scene may already be torn down with the workers */
      }
      mm.revert()
      ctx.revert()
      canvas.style.transform = ''
      canvas.style.opacity = ''
      if (fallbackElement) fallbackElement.style.opacity = ''
    },
  }
}
