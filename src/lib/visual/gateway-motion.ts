/**
 * CA-07 — Bounded GSAP choreography for the gateway portal.
 *
 * One entrance only (600–900ms settle, target 750ms): the procedural arch
 * is visible as soon as its first frame exists while satellites settle.
 * The raster fallback yields only after that visible frame. Language selection
 * never waits for it. Reduced motion renders the static pose instantly with
 * no transforms; a live preference change takes effect without reload.
 * One scheduled render source: GSAP ticks drive `scene.render()` during the
 * entrance and a four-second orbital arrival, then goes idle. Scoped with `gsap.context`, reduced-motion via
 * `gsap.matchMedia`, full revert on disposal. No second motion library.
 */

import { gsap } from 'gsap'
import type { GatewaySceneHandle } from './gateway-scene'
import type { SceneMotionPreference } from './scene-contract'

export interface GatewayMotionOptions {
  scene: GatewaySceneHandle
  canvas: HTMLCanvasElement
  stage?: HTMLElement | null
  fallbackElement?: HTMLElement | null
  motionPreference?: SceneMotionPreference
}

export interface GatewayMotionHandle {
  playEntrance(): Promise<void>
  setMotionPreference(preference: SceneMotionPreference): void
  dispose(): void
}

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
  const onPointerMove = (event: PointerEvent) => {
    if (
      isDisposed ||
      reduceMotion ||
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
    if (isDisposed || reduceMotion) return
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

    dispose() {
      if (isDisposed) return
      isDisposed = true
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
      mm.revert()
      ctx.revert()
      canvas.style.transform = ''
      canvas.style.opacity = ''
      if (fallbackElement) fallbackElement.style.opacity = ''
    },
  }
}
