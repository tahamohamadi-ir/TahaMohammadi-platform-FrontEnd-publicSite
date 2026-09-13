/**
 * RU-04 — Home motion: four designed scroll states.
 *
 * Home is GUIDED: the visitor does not drive the camera. Scroll position maps to
 * a designed pose through four authored keyframes —
 *
 *   STATE 1  front / introduction
 *   STATE 2  gentle rotation toward one domain cluster
 *   STATE 3  rotation the other way, with relationships emphasised
 *   STATE 4  slight camera push into a resolved full-system view
 *
 * — and the pose between keys is interpolated, so the transition is continuous
 * rather than a jump between four stills.
 *
 * The pose only ever moves the CAMERA and the model GROUP. There is no
 * whole-model scale and no FOV zoom: those read as cheap 2D tricks and are
 * explicitly rejected by the product brief.
 *
 * Why a plain rAF scroll reader instead of GSAP ScrollTrigger: nothing here
 * needs pinning or a scrubbed timeline — the pose is a pure function of scroll
 * progress — so the lighter rung of the existing motion ladder (ADR-0030, M2
 * pointer/scroll rAF) is the honest fit, and it keeps the Home island smaller.
 */

export type HomeScrollStateNumber = 1 | 2 | 3 | 4

export interface UniversePose {
  /** Model-group rotation about the vertical axis, radians. */
  yaw: number
  /** Model-group rotation about the horizontal axis, radians. */
  pitch: number
  /** Camera distance multiplier; < 1 moves the camera closer. */
  distanceScale: number
  /** Additional camera push toward the model, in world units. */
  push: number
  /** Relationship emphasis, 0 (calm) … 1 (fully emphasised). */
  edgeEmphasis: number
}

export interface HomePoseKey extends UniversePose {
  state: HomeScrollStateNumber
}

export const HOME_SCROLL_STATE_COUNT = 4

/**
 * Authored keyframes. Read as a storyboard: front → turn toward the domains →
 * turn the other way and read the relationships → settle back into the resolved
 * system. Values are deliberately restrained: this is an instrument, not a ride.
 */
export const HOME_POSE_KEYS: ReadonlyArray<HomePoseKey> = [
  {
    state: 1,
    yaw: 0,
    pitch: 0.05,
    distanceScale: 1,
    push: 0,
    edgeEmphasis: 0.12,
  },
  {
    state: 2,
    yaw: 0.6,
    pitch: 0.17,
    distanceScale: 0.87,
    push: 10,
    edgeEmphasis: 0.34,
  },
  {
    state: 3,
    yaw: -0.55,
    pitch: -0.12,
    distanceScale: 0.93,
    push: 4,
    edgeEmphasis: 1,
  },
  {
    state: 4,
    yaw: 0.09,
    pitch: 0.1,
    distanceScale: 0.79,
    push: 24,
    edgeEmphasis: 0.45,
  },
]

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** Smoothstep: zero derivative at both ends, so keys never visibly "kick". */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Which of the four designed states a scroll progress belongs to. */
export function stateForProgress(progress: number): HomeScrollStateNumber {
  const position = clamp01(progress) * (HOME_SCROLL_STATE_COUNT - 1)
  const index = Math.round(position)
  return (index + 1) as HomeScrollStateNumber
}

/**
 * Pose for a scroll progress in [0,1]. Piecewise-smooth interpolation between
 * the authored keys; clamped and finite for any input, including NaN.
 */
export function poseForProgress(progress: number): UniversePose {
  const p = clamp01(progress)
  const scaled = p * (HOME_POSE_KEYS.length - 1)
  const index = Math.min(Math.floor(scaled), HOME_POSE_KEYS.length - 2)
  const local = smoothstep(scaled - index)
  const from = HOME_POSE_KEYS[index]!
  const to = HOME_POSE_KEYS[index + 1]!

  return {
    yaw: lerp(from.yaw, to.yaw, local),
    pitch: lerp(from.pitch, to.pitch, local),
    distanceScale: lerp(from.distanceScale, to.distanceScale, local),
    push: lerp(from.push, to.push, local),
    edgeEmphasis: lerp(from.edgeEmphasis, to.edgeEmphasis, local),
  }
}

/** True when two poses are indistinguishable, so redraws can be skipped. */
export function posesEqual(
  a: UniversePose,
  b: UniversePose,
  epsilon = 1e-4,
): boolean {
  return (
    Math.abs(a.yaw - b.yaw) < epsilon &&
    Math.abs(a.pitch - b.pitch) < epsilon &&
    Math.abs(a.distanceScale - b.distanceScale) < epsilon &&
    Math.abs(a.push - b.push) < epsilon &&
    Math.abs(a.edgeEmphasis - b.edgeEmphasis) < epsilon
  )
}

export interface ScrollPoseDriver {
  /** Force a progress value (used by tests and by the state markers). */
  setProgress(progress: number): void
  /** Current progress in [0,1]. */
  progress(): number
  dispose(): void
}

export interface ScrollPoseDriverOptions {
  /** The tall wrapper whose travel defines progress. */
  track: HTMLElement
  /** Called with each new progress value, already coalesced per frame. */
  onProgress: (progress: number, state: HomeScrollStateNumber) => void
  /** When true, no listener is attached and the caller keeps a static pose. */
  reducedMotion?: boolean
  win?: Window
}

/**
 * Progress of `track` through the viewport: 0 when its top reaches the bottom of
 * the viewport, 1 when its bottom leaves the top. Reading is coalesced into one
 * rAF per scroll burst and the listener is removed on dispose.
 */
export function createScrollPoseDriver(
  options: ScrollPoseDriverOptions,
): ScrollPoseDriver {
  const { track, onProgress, reducedMotion = false } = options
  const win =
    options.win ?? (typeof window !== 'undefined' ? window : undefined)
  let progress = 0
  let frame: number | null = null
  let disposed = false

  function measure(): number {
    const rect = track.getBoundingClientRect()
    const viewport = win?.innerHeight ?? rect.height
    const travel = rect.height + viewport
    if (travel <= 0) return 0
    // Distance the track has moved up from "just entering" to "just leaving".
    const travelled = viewport - rect.top
    return clamp01(travelled / travel)
  }

  function commit(): void {
    if (disposed) return
    progress = measure()
    onProgress(progress, stateForProgress(progress))
  }

  function schedule(): void {
    if (disposed || frame != null) return
    const raf = win?.requestAnimationFrame?.bind(win)
    if (raf) {
      frame = raf(() => {
        frame = null
        commit()
      })
      return
    }
    frame = setTimeout(() => {
      frame = null
      commit()
    }, 16) as unknown as number
  }

  if (!reducedMotion && win?.addEventListener) {
    win.addEventListener('scroll', schedule, { passive: true })
    win.addEventListener('resize', schedule)
    // Initial read so the first painted pose matches the current scroll.
    commit()
  }

  return {
    setProgress(next: number) {
      progress = clamp01(next)
      onProgress(progress, stateForProgress(progress))
    },
    progress() {
      return progress
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (frame != null) {
        win?.cancelAnimationFrame?.(frame)
        frame = null
      }
      if (win?.removeEventListener) {
        win.removeEventListener('scroll', schedule)
        win.removeEventListener('resize', schedule)
      }
    },
  }
}

/** Exposed for the honest reduced-motion path: the front/introduction pose. */
export function staticPose(): UniversePose {
  const first = HOME_POSE_KEYS[0]!
  return {
    yaw: first.yaw,
    pitch: first.pitch,
    distanceScale: first.distanceScale,
    push: first.push,
    edgeEmphasis: first.edgeEmphasis,
  }
}
