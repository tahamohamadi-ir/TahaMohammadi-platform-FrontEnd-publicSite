/**
 * CA-05 — GSAP Scene Choreography and Procedural Motion.
 *
 * Implements bounded motion choreography for the Three.js constellation
 * and HTML labels against the locked scene contract.
 *
 * Rules and Technical Boundaries (DESIGN-SPEC §§5, 6):
 * - Bounded choreography:
 *   - Settle: 600–900ms scene settle (target 750ms).
 *   - Selection: 180–280ms feedback (target 220ms).
 *   - Tilt: Clamped to ±3° on fine pointers only.
 * - One scheduled render source: Drives `scene.render()` during active tween updates;
 *   zero RAF drain when resting.
 * - Accessibility & reduced motion:
 *   - Registers with `gsap.matchMedia()`.
 *   - Reduced motion uses static pose, instant selection, and zero pointer tilt.
 *   - Live user preference changes update without reload.
 * - Lifecycle:
 *   - Scoped with `gsap.context()`.
 *   - Pauses when `document.hidden`.
 *   - Clean disposal restores transforms and clears listeners.
 */

import { gsap } from 'gsap'
import {
  SCENE_MOTION,
  type GraphSceneHandle,
  type SceneMotionPreference,
} from './scene-contract'

export interface GraphMotionOptions {
  scene: GraphSceneHandle
  canvas: HTMLCanvasElement
  stage?: HTMLElement | null
  labelsContainer?: HTMLElement | null
  detailElement?: HTMLElement | null
  motionPreference?: SceneMotionPreference
  onRender?: () => void
}

export interface GraphMotionHandle {
  playSettle(): Promise<void>
  animateSelection(selectedId: string | null): Promise<void>
  setMotionPreference(preference: SceneMotionPreference): void
  dispose(): void
}

export function createGraphMotion(
  options: GraphMotionOptions,
): GraphMotionHandle {
  const {
    scene,
    canvas,
    stage = null,
    labelsContainer = null,
    detailElement = null,
    onRender,
  } = options

  let currentPreference: SceneMotionPreference =
    options.motionPreference ?? 'full'
  let isReducedMotion = false
  let isDisposed = false

  const interactionTarget = stage || canvas

  // Helper to trigger scene render and optional callback
  function triggerRender() {
    if (isDisposed) return
    scene.render()
    onRender?.()
  }

  // Master GSAP context for clean scoped lifecycle
  const ctx = gsap.context(() => {}, interactionTarget)
  const mm = gsap.matchMedia()

  // Track pointer tilt listeners
  let removePointerListeners: (() => void) | null = null

  // Setup media matchers for reduced motion
  mm.add('(prefers-reduced-motion: reduce)', () => {
    isReducedMotion = true
    scene.setMotion('reduced')
  })

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    isReducedMotion =
      currentPreference === 'reduced' || currentPreference === 'off'
    scene.setMotion(currentPreference)
  })

  // Pointer tilt handling (fine pointers only, clamped to ±3 degrees)
  function setupPointerTilt() {
    if (typeof window === 'undefined') return
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    if (!isFinePointer) return

    let currentTiltX = 0
    let currentTiltY = 0

    const handlePointerMove = (e: PointerEvent) => {
      if (isDisposed || isReducedMotion || currentPreference !== 'full') return

      const rect = interactionTarget.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1

      // Clamped to ±SCENE_MOTION.tiltDegrees (3 degrees)
      const targetY = Math.max(
        -SCENE_MOTION.tiltDegrees,
        Math.min(SCENE_MOTION.tiltDegrees, normX * SCENE_MOTION.tiltDegrees),
      )
      const targetX = Math.max(
        -SCENE_MOTION.tiltDegrees,
        Math.min(SCENE_MOTION.tiltDegrees, -normY * SCENE_MOTION.tiltDegrees),
      )

      ctx.add(() => {
        gsap.to(canvas, {
          rotationY: targetY,
          rotationX: targetX,
          transformPerspective: 800,
          duration: 0.25,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: triggerRender,
        })
      })

      currentTiltX = targetX
      currentTiltY = targetY
    }

    const handlePointerLeave = () => {
      if (isDisposed) return
      if (currentTiltX === 0 && currentTiltY === 0) return

      ctx.add(() => {
        gsap.to(canvas, {
          rotationY: 0,
          rotationX: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: triggerRender,
        })
      })

      currentTiltX = 0
      currentTiltY = 0
    }

    interactionTarget.addEventListener('pointermove', handlePointerMove)
    interactionTarget.addEventListener('pointerleave', handlePointerLeave)

    removePointerListeners = () => {
      interactionTarget.removeEventListener('pointermove', handlePointerMove)
      interactionTarget.removeEventListener('pointerleave', handlePointerLeave)
    }
  }

  setupPointerTilt()

  // Handle document visibility (pause motion when tab hidden)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Pause any active tweens in our context
      ctx.pause()
    } else {
      ctx.resume()
      triggerRender()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return {
    playSettle(): Promise<void> {
      if (isDisposed) return Promise.resolve()

      const shouldAnimate = !isReducedMotion && currentPreference === 'full'

      if (!shouldAnimate) {
        gsap.set(canvas, { opacity: 1, scale: 1, rotationX: 0, rotationY: 0 })
        if (labelsContainer) gsap.set(labelsContainer, { opacity: 1 })
        triggerRender()
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        ctx.add(() => {
          const tl = gsap.timeline({
            onComplete: () => resolve(),
          })

          // 750ms settle within 600-900ms ceiling
          tl.fromTo(
            canvas,
            { opacity: 0.4, scale: 0.97 },
            {
              opacity: 1.0,
              scale: 1.0,
              duration: 0.75,
              ease: 'power2.out',
              onUpdate: triggerRender,
            },
            0,
          )

          if (labelsContainer) {
            tl.fromTo(
              labelsContainer,
              { opacity: 0 },
              {
                opacity: 1.0,
                duration: 0.5,
                ease: 'power1.out',
              },
              0.2,
            )
          }
        })
      })
    },

    animateSelection(selectedId: string | null): Promise<void> {
      if (isDisposed) return Promise.resolve()

      scene.setSelection(selectedId)

      const shouldAnimate = !isReducedMotion && currentPreference === 'full'

      if (!shouldAnimate) {
        triggerRender()
        if (detailElement) {
          gsap.set(detailElement, { opacity: 1, y: 0 })
        }
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        ctx.add(() => {
          const tl = gsap.timeline({
            onComplete: () => resolve(),
          })

          // 220ms selection within 180-280ms ceiling
          const proxy = { progress: 0 }
          tl.to(
            proxy,
            {
              progress: 1,
              duration: 0.22,
              ease: 'power1.out',
              onUpdate: triggerRender,
            },
            0,
          )

          if (detailElement) {
            tl.fromTo(
              detailElement,
              { opacity: 0.7, y: -3 },
              {
                opacity: 1.0,
                y: 0,
                duration: 0.22,
                ease: 'power2.out',
              },
              0,
            )
          }
        })
      })
    },

    setMotionPreference(preference: SceneMotionPreference) {
      currentPreference = preference
      isReducedMotion =
        preference === 'reduced' ||
        preference === 'off' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      scene.setMotion(preference)

      if (isReducedMotion) {
        gsap.set(canvas, { rotationX: 0, rotationY: 0, scale: 1, opacity: 1 })
        triggerRender()
      }
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true

      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (removePointerListeners) {
        removePointerListeners()
        removePointerListeners = null
      }

      mm.revert()
      ctx.revert()

      // Reset inline styles
      if (canvas) {
        canvas.style.transform = ''
        canvas.style.opacity = ''
      }
    },
  }
}
