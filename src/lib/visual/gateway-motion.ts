/**
 * CA-07 — Bounded GSAP choreography for the gateway portal.
 *
 * One entrance only (600–900ms settle, target 750ms): the procedural arch
 * fades and settles while the raster fallback yields. Language selection
 * never waits for it. Reduced motion renders the static pose instantly with
 * no transforms; a live preference change takes effect without reload.
 * One scheduled render source: GSAP ticks drive `scene.render()` during the
 * entrance and then go idle. Scoped with `gsap.context`, reduced-motion via
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
  const interactionTarget = stage ?? canvas

  const ctx = gsap.context(() => {}, interactionTarget)
  const mm = gsap.matchMedia()
  let reduceMotion = prefersReduced() || currentPreference !== 'full'

  mm.add('(prefers-reduced-motion: reduce)', () => {
    reduceMotion = true
    scene.setMotion('reduced')
  })
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    reduceMotion = currentPreference !== 'full'
    scene.setMotion(currentPreference)
  })

  const onVisibility = () => {
    if (document.hidden) ctx.pause()
    else {
      ctx.resume()
      scene.render()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  function settleInstantly() {
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
        ctx.add(() => {
          const timeline = gsap.timeline({ onComplete: () => resolve() })
          // 750ms entrance inside the 600–900ms settle budget.
          timeline.fromTo(
            canvas,
            { opacity: 0, scale: 0.97, y: 10 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.75,
              ease: 'power2.out',
              onUpdate: () => scene.render(),
            },
            0,
          )
          if (fallbackElement) {
            timeline.to(
              fallbackElement,
              { opacity: 0, duration: 0.4, ease: 'power1.out' },
              0.1,
            )
          }
        })
      })
    },

    setMotionPreference(preference: SceneMotionPreference) {
      currentPreference = preference
      reduceMotion = preference !== 'full' || prefersReduced()
      scene.setMotion(preference)
      if (reduceMotion) {
        gsap.set(canvas, { scale: 1, y: 0, opacity: 1 })
        scene.render()
      }
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      mm.revert()
      ctx.revert()
      canvas.style.transform = ''
      canvas.style.opacity = ''
      if (fallbackElement) fallbackElement.style.opacity = ''
    },
  }
}
