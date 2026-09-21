import { describe, expect, it, vi } from 'vitest'

import { subscribeReducedMotion } from './motion-preference'

describe('subscribeReducedMotion', () => {
  it('applies immediately and on matchMedia change', () => {
    let matches = false
    const listeners = new Set<() => void>()
    const win = {
      matchMedia: vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, listener: () => void) => {
          listeners.add(listener)
        },
        removeEventListener: (_: string, listener: () => void) => {
          listeners.delete(listener)
        },
      })),
    } as unknown as Window

    const apply = vi.fn()
    const unsubscribe = subscribeReducedMotion(win, apply)
    expect(apply).toHaveBeenCalledWith('full')

    matches = true
    for (const listener of listeners) listener()
    expect(apply).toHaveBeenLastCalledWith('reduced')

    unsubscribe()
    matches = false
    for (const listener of listeners) listener()
    expect(apply).toHaveBeenLastCalledWith('reduced')
  })
})
