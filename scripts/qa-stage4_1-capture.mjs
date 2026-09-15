#!/usr/bin/env node
/**
 * Hero v2 — Stage 4.1 capture runner (browser-level, real composed page).
 *
 * Produces the card's §6 midpoint matrix, §7 motion artifact, §11 reduced-motion evidence,
 * §13 performance numbers and §14 screenshot matrix, plus the sticky-phase captures
 * ("immediately before / during / immediately after"). It runs against an ALREADY BUILT dist
 * served locally, so it needs a build whose CMS answer carries Home modules
 * (see scripts/e2e-site-settings-fixture.mjs and the Stage 4.1 report's fixture note).
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:4321 node scripts/qa-stage4_1-capture.mjs
 *   QA_OUT_DIR=docs/quality/hero-v2-stage4_1 QA_LABEL=linear node scripts/qa-stage4_1-capture.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:4321'
const OUT_ROOT = path.resolve(
  process.env.QA_OUT_DIR || 'docs/quality/hero-v2-stage4_1',
)
const LABEL = process.env.QA_LABEL || 'run'
const VIDEO_DIR = path.join(OUT_ROOT, 'motion')

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 430, height: 932 },
]
/** The card's §6 positions: keyframes AND every transition midpoint. */
const POSITIONS = [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 1]

const readState = (page) =>
  page.evaluate(() => {
    const seq = document.querySelector('[data-hero-sequence]')
    const shell = document.querySelector('[data-hero-scroll-shell]')
    const viewport = document.querySelector('[data-hero-sticky-viewport]')
    return {
      progress: Number(seq?.dataset.heroSequenceProgress ?? '0'),
      travel: Number(seq?.dataset.heroSequenceTravel ?? '0'),
      mode: seq?.dataset.heroSequenceMode ?? '',
      fade: seq?.dataset.heroSequenceFade ?? '',
      pinned: shell?.dataset.heroSequencePinned ?? '',
      shellHeight: shell ? Math.round(shell.getBoundingClientRect().height) : 0,
      shellTop: shell
        ? Math.round(shell.getBoundingClientRect().top + window.scrollY)
        : 0,
      viewportTop: viewport
        ? Math.round(viewport.getBoundingClientRect().top)
        : 0,
      viewportBottom: viewport
        ? Math.round(viewport.getBoundingClientRect().bottom)
        : 0,
      stagePosition: viewport ? getComputedStyle(viewport).position : '',
      opacities: [
        ...document.querySelectorAll(
          '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
        ),
      ]
        .map((el) => Number(getComputedStyle(el).opacity).toFixed(2))
        .join('|'),
      scrollY: Math.round(window.scrollY),
      docScrollable: Math.round(
        (document.scrollingElement ?? document.documentElement).scrollHeight -
          window.innerHeight,
      ),
    }
  })

async function scrollTo(page, y) {
  await page.evaluate(
    (target) => window.scrollTo({ top: target, behavior: 'instant' }),
    Math.round(y),
  )
  await page.waitForTimeout(220)
}

const summary = {
  baseUrl: BASE_URL,
  label: LABEL,
  generatedAt: new Date().toISOString(),
}
mkdirSync(VIDEO_DIR, { recursive: true })

const browser = await chromium.launch()
try {
  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__qa = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0, shifts: [] }
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
          if (!entry.hadRecentInput) {
            window.__qa.cls += entry.value
            window.__qa.shifts.push({
              value: Number(entry.value.toFixed(4)),
              t: Math.round(entry.startTime),
            })
          }
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

    const seqCount = await page.locator('[data-hero-sequence]').count()
    if (seqCount !== 1) {
      throw new Error(
        `no hero sequence at ${viewport.name}: the build under test has no Home modules`,
      )
    }

    // ---------------------------------------------------------------- sticky phases + matrix
    for (const theme of ['dark', 'light']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme
        window.dispatchEvent(new Event('tm-themechange'))
      }, theme)
      await page.waitForTimeout(600)

      const geometry = await readState(page)
      const travel = geometry.travel || 1
      summary[`geometry-${viewport.name}-${theme}`] = {
        travel: geometry.travel,
        mode: geometry.mode,
        fade: geometry.fade,
        pinned: geometry.pinned,
        shellTop: geometry.shellTop,
        shellHeight: geometry.shellHeight,
        stagePosition: geometry.stagePosition,
        docScrollable: geometry.docScrollable,
      }
      console.log(
        `GEOMETRY ${LABEL} ${viewport.name}/${theme} ${JSON.stringify(summary[`geometry-${viewport.name}-${theme}`])}`,
      )

      for (const [index, position] of POSITIONS.entries()) {
        await scrollTo(page, geometry.shellTop + travel * position)
        const state = await readState(page)
        const tag = `p${String(Math.round(position * 100)).padStart(3, '0')}`
        const file = `${LABEL}-${viewport.name}-${theme}-${tag}.jpg`
        await page.screenshot({
          path: path.join(OUT_ROOT, file),
          type: 'jpeg',
          quality: 74,
        })
        summary[`${viewport.name}-${theme}-${tag}`] = {
          progress: Number(state.progress.toFixed(4)),
          opacities: state.opacities,
          viewportTop: state.viewportTop,
          viewportBottom: state.viewportBottom,
          file,
          index,
        }
        console.log(
          `STATE ${LABEL} ${viewport.name}/${theme} ${tag} progress=${state.progress.toFixed(3)} opacity=${state.opacities} viewportTop=${state.viewportTop}`,
        )
      }

      // Sticky phases: immediately before the pin, inside it, immediately after release.
      const phases = {
        before: geometry.shellTop - 1,
        during: geometry.shellTop + travel * 0.5,
        after: geometry.shellTop + travel + 1,
      }
      for (const [phase, y] of Object.entries(phases)) {
        await scrollTo(page, y)
        const state = await readState(page)
        summary[`phase-${viewport.name}-${theme}-${phase}`] = {
          scrollY: state.scrollY,
          viewportTop: state.viewportTop,
          viewportVisible:
            state.viewportBottom > 0 && state.viewportTop < viewport.height,
          file: `${LABEL}-${viewport.name}-${theme}-phase-${phase}.jpg`,
        }
        await page.screenshot({
          path: path.join(
            OUT_ROOT,
            summary[`phase-${viewport.name}-${theme}-${phase}`].file,
          ),
          type: 'jpeg',
          quality: 74,
        })
        console.log(
          `PHASE ${LABEL} ${viewport.name}/${theme} ${phase} ${JSON.stringify(summary[`phase-${viewport.name}-${theme}-${phase}`])}`,
        )
      }
    }

    // Quantitative mapping table: where each strategy blends and where it holds. This is what
    // decides A vs B, because the mandated matrix positions are the blend centres of BOTH.
    const fadeProbe = []
    {
      const geometry = await readState(page)
      const travel = geometry.travel || 1
      for (let step = 0; step <= 20; step += 1) {
        const position = step / 20
        await scrollTo(page, geometry.shellTop + travel * position)
        const state = await readState(page)
        fadeProbe.push({
          position: Number(position.toFixed(2)),
          progress: Number(state.progress.toFixed(3)),
          opacities: state.opacities,
        })
      }
      await scrollTo(page, geometry.shellTop)
    }
    summary[`fade-${viewport.name}`] = fadeProbe
    console.log(
      `FADE ${LABEL} ${viewport.name} ${fadeProbe.map((row) => `${row.position}:${row.opacities}`).join(' ')}`,
    )

    summary[`metrics-${viewport.name}`] = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType('resource')
        .filter((entry) => /hero-v2/.test(entry.name))
      const byDeviceTheme = {}
      let decoded = 0
      for (const entry of resources) {
        const match = entry.name.match(
          /hero-v2-(desktop|mobile)-(dark|light)-\d+/,
        )
        const key = match ? `${match[1]}-${match[2]}` : 'other'
        byDeviceTheme[key] = (byDeviceTheme[key] ?? 0) + 1
        decoded += entry.decodedBodySize ?? 0
      }
      return {
        heroRequests: resources.length,
        heroDecodedKB: Math.round(decoded / 1024),
        byDeviceTheme,
        canvasCount: document.querySelectorAll('canvas').length,
        runningAnimations: document.getAnimations().length,
        qa: window.__qa,
      }
    })
    console.log(
      `METRICS ${LABEL} ${viewport.name} ${JSON.stringify(summary[`metrics-${viewport.name}`])}`,
    )
  }

  // ---------------------------------------------------------------- reduced motion, both devices
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'load' })
    await page.waitForTimeout(1400)
    const geometry = await readState(page)
    const before = geometry.progress
    await scrollTo(page, geometry.shellTop + 1600)
    const after = await readState(page)
    await scrollTo(page, geometry.shellTop)
    const visibleFrames = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '[data-hero-sequence-theme]:not([hidden]) [data-hero-sequence-frame]',
          ),
        ].filter((el) => Number(getComputedStyle(el).opacity) > 0.01).length,
    )
    const file = `${LABEL}-${viewport.name}-reduced-motion.jpg`
    await page.screenshot({
      path: path.join(OUT_ROOT, file),
      type: 'jpeg',
      quality: 74,
    })
    summary[`reduced-${viewport.name}`] = {
      mode: geometry.mode,
      progressBefore: before,
      progressAfterScroll: after.progress,
      visibleFrames,
      runningAnimations: await page.evaluate(
        () => document.getAnimations().length,
      ),
      shellHeight: geometry.shellHeight,
      file,
    }
    console.log(
      `REDUCED ${LABEL} ${viewport.name} ${JSON.stringify(summary[`reduced-${viewport.name}`])}`,
    )
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }

  // ---------------------------------------------------------------- motion artifact (§7)
  // Recorded in its own short-lived context so the file is one continuous scrub, not the whole
  // QA session: the pin, the four authored states, the release and the section after it.
  for (const target of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    const motionContext = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: target.width, height: target.height },
      },
    })
    const motionPage = await motionContext.newPage()
    await motionPage.goto(`${BASE_URL}/en/`, { waitUntil: 'load' })
    await motionPage.waitForTimeout(1400)
    const earlyTheme = await motionPage.evaluate(
      () => document.documentElement.dataset.theme ?? null,
    )
    console.log(
      `MOTION_THEME ${LABEL} ${target.name} first-paint theme=${earlyTheme}`,
    )
    await motionPage.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
    })
    await motionPage.waitForTimeout(600)
    const geometry = await readState(motionPage)
    const steps = 90
    for (let index = 0; index <= steps; index += 1) {
      const position = index / steps
      // Past the release on purpose, so the artifact shows normal flow resuming.
      const y = geometry.shellTop + geometry.travel * 1.2 * position
      await motionPage.evaluate(
        (next) => window.scrollTo({ top: next, behavior: 'instant' }),
        Math.round(y),
      )
      await motionPage.waitForTimeout(45)
    }
    await motionPage.waitForTimeout(600)
    const video = motionPage.video()
    await motionContext.close()
    if (video) {
      const saved = await video.path()
      summary[`motion-${target.name}-dark`] = path.relative(OUT_ROOT, saved)
      console.log(
        `MOTION ${LABEL} ${target.name}-dark ${summary[`motion-${target.name}-dark`]}`,
      )
    }
  }
} finally {
  await browser.close().catch(() => {})
}

// Clean cold LCP per viewport: fresh contexts created FIRST (before the heavy matrix can exhaust
// the browser), each wrapped so a failure never takes the evidence run down. Labelled a local
// fixture measurement, never a production/network LCP.
for (const viewport of VIEWPORTS) {
  try {
    const cleanContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    })
    const cleanPage = await cleanContext.newPage()
    await cleanPage.addInitScript(() => {
      window.__lcp = 0
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__lcp = Math.round(entry.startTime)
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {
        /* observer unsupported */
      }
    })
    await cleanPage.goto(`${BASE_URL}/en/`, { waitUntil: 'load' })
    await cleanPage.waitForTimeout(2500)
    summary[`lcp-cold-${viewport.name}`] = await cleanPage.evaluate(
      () => window.__lcp,
    )
    console.log(
      `LCP_COLD ${LABEL} ${viewport.name} ${summary[`lcp-cold-${viewport.name}`]}ms (local fixture measurement)`,
    )
    await cleanContext.close()
  } catch (error) {
    summary[`lcp-cold-${viewport.name}`] =
      `unavailable: ${String(error).slice(0, 90)}`
    console.log(`LCP_COLD ${LABEL} ${viewport.name} unavailable`)
  }
}

writeFileSync(
  path.join(OUT_ROOT, `${LABEL}-summary.json`),
  `${JSON.stringify(summary, null, 2)}\n`,
)
console.log(`SUMMARY ${path.join(OUT_ROOT, `${LABEL}-summary.json`)}`)
