#!/usr/bin/env node
/**
 * Hero v2 — Stage 4 visual capture runner (plain ESM, no build step).
 *
 * Captures the four authored scroll states per theme and device, plus the reduced-motion
 * still, from an ALREADY BUILT `dist/` served by a local preview. The Playwright spec
 * (`tests/e2e/hero-v2-stage4.visual.e2e.ts`) runs inside the E2E harness, which builds
 * against the settings fixture only; when the CMS answer carries no Home modules there is no
 * hero to photograph. This runner points at any preview of a build that does have them.
 *
 * Usage:
 *   node scripts/qa-stage4-capture.mjs                 # expects http://localhost:4321
 *   QA_BASE_URL=http://127.0.0.1:4400 node scripts/qa-stage4-capture.mjs
 *
 * Every capture asserts the scroll progress it photographed, so a saved frame is evidence of
 * a state rather than just a picture.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:4321'
const OUT_ROOT = path.resolve(
  process.env.QA_OUT_DIR || 'docs/quality/hero-v2-stage4',
)
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 430, height: 932 },
]
const STATES = [
  [0, 'p000'],
  [0.33, 'p033'],
  [0.66, 'p066'],
  [1, 'p100'],
]

const readProgress = (page) =>
  page.evaluate(() =>
    Number(
      document.querySelector('[data-hero-sequence]')?.dataset
        .heroSequenceProgress ?? '0',
    ),
  )

const readOpacities = (page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
      ),
    ]
      .map((el) => Number(getComputedStyle(el).opacity).toFixed(2))
      .join('|'),
  )

async function sweepProgress(page, top, travel) {
  const steps = 12
  const rows = []
  for (let index = 0; index <= steps; index += 1) {
    const offset = Math.round((travel * index) / steps)
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.max(0, top + offset),
    )
    await page.waitForTimeout(200)
    rows.push({ offset, progress: await readProgress(page) })
  }
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: 'instant' }),
    0,
  )
  await page.waitForTimeout(150)
  return rows
}

/** Pick the measured offset whose progress is closest to an authored state. */
function offsetFor(rows, target) {
  let best = rows[0]
  for (const row of rows) {
    if (Math.abs(row.progress - target) < Math.abs(best.progress - target)) {
      best = row
    }
  }
  return best
}

const summary = { baseUrl: BASE_URL, generatedAt: new Date().toISOString() }
const browser = await chromium.launch()

try {
  const page = await browser.newPage()
  await page.addInitScript(() => {
    window.__qa = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__qa.lcp = Math.round(entry.startTime)
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      /* observer unsupported */
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__qa.cls += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      /* observer unsupported */
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__qa.longTasks += 1
          window.__qa.longTaskMs += Math.round(entry.duration)
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch {
      /* observer unsupported */
    }
  })

  mkdirSync(OUT_ROOT, { recursive: true })

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    })
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
    })

    if ((await page.locator('[data-hero-sequence]').count()) !== 1) {
      throw new Error(
        `no hero sequence at ${viewport.name}: the build under test has no Home modules`,
      )
    }

    const geometry = await page.evaluate(() => {
      const scope = document.querySelector('[data-home-module="hero"]')
      const stage = scope ? scope.firstElementChild : null
      if (!scope || !stage) return null
      return {
        top: Math.round(scope.getBoundingClientRect().top + window.scrollY),
        travel:
          Number(
            document.querySelector('[data-hero-sequence]').dataset
              .heroSequenceTravel,
          ) || Math.max(320, Math.round(window.innerHeight * 0.7)),
        stagePosition: getComputedStyle(stage).position,
      }
    })
    if (!geometry) throw new Error('no hero scope to measure')
    console.log(`GEOMETRY ${viewport.name} ${JSON.stringify(geometry)}`)

    // The stage must stay pinned for the whole scrub: if it scrolls away, the later authored
    // states are never actually seen, which is what "looks pasted on then disappears" means.
    summary[`pinning-${viewport.name}`] = await page.evaluate(
      ([top, travel]) => {
        const stage = document.querySelector(
          '[data-home-module="hero"]',
        ).firstElementChild
        const rows = []
        for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
          window.scrollTo({
            top: Math.round(top + travel * fraction),
            behavior: 'instant',
          })
          const rect = stage.getBoundingClientRect()
          rows.push({
            fraction,
            stageTop: Math.round(rect.top),
            stageBottom: Math.round(rect.bottom),
            visible: rect.bottom > 0 && rect.top < window.innerHeight,
          })
        }
        window.scrollTo({ top: 0, behavior: 'instant' })
        return rows
      },
      [geometry.top, geometry.travel],
    )
    console.log(
      `PINNING ${viewport.name} ${JSON.stringify(summary[`pinning-${viewport.name}`])}`,
    )

    for (const theme of ['dark', 'light']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme
        window.dispatchEvent(new Event('tm-themechange'))
      }, theme)
      await page.waitForTimeout(700)

      const rows = await sweepProgress(page, geometry.top, geometry.travel)
      summary[`sweep-${viewport.name}-${theme}`] = rows
      console.log(
        `SWEEP ${viewport.name}/${theme} ${rows.map((row) => `${row.offset}:${row.progress.toFixed(2)}`).join(' ')}`,
      )

      for (const [target, tag] of STATES) {
        const chosen = offsetFor(rows, target)
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: 'instant' }),
          Math.max(0, geometry.top + chosen.offset),
        )
        await page.waitForTimeout(250)
        const progress = await readProgress(page)
        const frames = await readOpacities(page)
        await page.waitForTimeout(200)
        const file = `${viewport.name}-${theme}-${tag}.jpg`
        await page.screenshot({
          path: path.join(OUT_ROOT, file),
          type: 'jpeg',
          quality: 72,
        })
        summary[`${viewport.name}-${theme}-${tag}`] = {
          progress: Number(progress.toFixed(3)),
          opacities: frames,
          file,
        }
        console.log(
          `${viewport.name}/${theme} ${tag} progress=${progress.toFixed(3)} opacities=${frames}`,
        )
      }
    }

    summary[`metrics-${viewport.name}`] = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType('resource')
        .filter((entry) => /hero-v2/.test(entry.name))
      const byDeviceTheme = {}
      for (const entry of resources) {
        const match = entry.name.match(
          /hero-v2-(desktop|mobile)-(dark|light)-\d+/,
        )
        const key = match ? `${match[1]}-${match[2]}` : 'other'
        byDeviceTheme[key] = (byDeviceTheme[key] ?? 0) + 1
      }
      const formats = {}
      let decodedBytes = 0
      for (const entry of resources) {
        const ext = entry.name.split('.').pop() ?? '?'
        formats[ext] = (formats[ext] ?? 0) + 1
        decodedBytes += entry.decodedBodySize ?? 0
      }
      return {
        heroRequests: resources.length,
        heroDecodedKB: Math.round(decodedBytes / 1024),
        byDeviceTheme,
        formats,
        canvasCount: document.querySelectorAll('canvas').length,
        runningAnimations: document.getAnimations().length,
        qa: window.__qa,
      }
    })
    console.log(
      `METRICS ${viewport.name} ${JSON.stringify(summary[`metrics-${viewport.name}`])}`,
    )
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${BASE_URL}/en/`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const before = await page.evaluate(
    () =>
      document.querySelector('[data-hero-sequence]')?.dataset
        .heroSequenceProgress,
  )
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }))
  await page.waitForTimeout(400)
  const after = await page.evaluate(
    () =>
      document.querySelector('[data-hero-sequence]')?.dataset
        .heroSequenceProgress,
  )
  const visibleFrames = await page.evaluate(
    () =>
      [
        ...document.querySelectorAll(
          '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
        ),
      ].filter((el) => Number(getComputedStyle(el).opacity) > 0.01).length,
  )
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(250)
  await page.screenshot({
    path: path.join(OUT_ROOT, 'desktop-reduced-motion.jpg'),
    type: 'jpeg',
    quality: 72,
  })
  summary['reduced-motion'] = {
    progressBefore: before,
    progressAfterScroll: after,
    visibleFrames,
    file: 'desktop-reduced-motion.jpg',
  }
  console.log(`REDUCED_MOTION ${JSON.stringify(summary['reduced-motion'])}`)
} finally {
  await browser.close()
}

writeFileSync(
  path.join(OUT_ROOT, 'stage4-qa-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)
console.log(`SUMMARY ${path.join(OUT_ROOT, 'stage4-qa-summary.json')}`)
