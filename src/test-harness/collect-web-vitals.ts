import type { Page } from '@playwright/test'

export type WebVitalsSnapshot = {
  lcpMs: number | null
  cls: number
  inpMs: number | null
}

declare global {
  interface Window {
    __tmVitals?: WebVitalsSnapshot
    __tmInpMax?: number
  }
}

/** Install buffered LCP/CLS/INP observers before navigation. */
export async function installWebVitalsCollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__tmVitals = { lcpMs: null, cls: 0, inpMs: null }
    window.__tmInpMax = 0

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries.at(-1)
        if (last) {
          window.__tmVitals!.lcpMs = last.startTime
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      /* unsupported in this browser build */
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean
            value?: number
          }
          if (!shift.hadRecentInput && typeof shift.value === 'number') {
            window.__tmVitals!.cls += shift.value
          }
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      /* unsupported in this browser build */
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as PerformanceEntry & {
            duration?: number
            interactionId?: number
          }
          if (
            typeof event.interactionId === 'number' &&
            event.interactionId > 0 &&
            typeof event.duration === 'number'
          ) {
            window.__tmInpMax = Math.max(window.__tmInpMax ?? 0, event.duration)
            window.__tmVitals!.inpMs = window.__tmInpMax
          }
        }
      }).observe({
        type: 'event',
        buffered: true,
        durationThreshold: 0,
      } as PerformanceObserverInit)
    } catch {
      /* unsupported in this browser build */
    }
  })
}

/** Read collected vitals after the page has settled. */
export async function readWebVitals(page: Page): Promise<WebVitalsSnapshot> {
  await page.waitForLoadState('load')
  await page
    .waitForFunction(() => document.fonts.status === 'loaded')
    .catch(() => undefined)
  await page.waitForTimeout(1500)

  return page.evaluate(
    () => window.__tmVitals ?? { lcpMs: null, cls: 0, inpMs: null },
  )
}

/** Wait for event-timing entries to flush after a user interaction. */
export async function waitForInteractionTiming(page: Page): Promise<void> {
  await page.waitForTimeout(800)
}
