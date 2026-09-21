import type { SceneMotionPreference } from '../scene-contract'

/** Live reduced-motion subscription (Spec §18 / Plan C Task 21). */
export function subscribeReducedMotion(
  win: Window,
  apply: (motion: SceneMotionPreference) => void,
): () => void {
  if (typeof win.matchMedia !== 'function') {
    apply('full')
    return () => {}
  }
  const query = '(prefers-reduced-motion: reduce)'
  const media = win.matchMedia(query)
  const sync = (): void => {
    apply(media.matches ? 'reduced' : 'full')
  }
  sync()
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }
  media.addListener(sync)
  return () => media.removeListener(sync)
}
