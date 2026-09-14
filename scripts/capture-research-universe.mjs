#!/usr/bin/env node
/**
 * Research Universe evidence capture — full prototype matrix.
 *
 * Captures every state the prototype brief asks for, and records the measurable
 * state behind each one (per-frame draw calls and vertices, canvas count, DPR,
 * scroll state, projected label coordinates, idle frames) so a screenshot can never
 * be read as evidence on its own.
 *
 * Usage:
 *   PUBLIC_API_BASE_URL=https://tahamohamadi.ir npm run build
 *   node scripts/capture-research-universe.mjs
 *
 * Output (gitignored, referenced by docs/quality/RESEARCH-UNIVERSE-RU2-EVIDENCE.md):
 *   .evidence/research-universe/*.png
 *   .evidence/research-universe/measurements.json
 *
 * The server is started and stopped by this script; nothing is left listening.
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import { resolve } from 'node:path'

const PORT = Number(process.env.TM_RU_CAPTURE_PORT ?? 4390)
const BASE = `http://127.0.0.1:${PORT}`
// Deliberately OUTSIDE Playwright's outputDir: `test-results/` is wiped at the
// start of every Playwright run, which silently deletes captured evidence.
const OUT_DIR = resolve('.evidence/research-universe')

const noop = () => {}

function counters(page) {
  return page.addInitScript(() => {
    const probe = {
      draws: 0,
      verts: 0,
      frames: 0,
      lastFrame: { draws: 0, verts: 0 },
    }
    window.__ruProbe = probe

    // Per-frame accounting: the counter is cleared as each rAF callback starts, so
    // `lastFrame` is one frame's real workload — not a cumulative total.
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      raf((timestamp) => {
        probe.draws = 0
        probe.verts = 0
        try {
          return callback(timestamp)
        } finally {
          probe.lastFrame = { draws: probe.draws, verts: probe.verts }
          probe.frames += 1
        }
      })

    for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const ctor = window[name]
      const proto = ctor && ctor.prototype
      if (!proto || !proto.drawArrays || !proto.drawElements) continue
      const originalArrays = proto.drawArrays
      const originalElements = proto.drawElements
      proto.drawArrays = function (mode, first, count) {
        probe.draws += 1
        probe.verts += Number(count) || 0
        return originalArrays.call(this, mode, first, count)
      }
      proto.drawElements = function (mode, count, type, offset) {
        probe.draws += 1
        probe.verts += Number(count) || 0
        return originalElements.call(this, mode, count, type, offset)
      }
    }
  })
}

const readProbe = (page) =>
  page.evaluate(() => {
    const probe = window.__ruProbe
    return {
      singleFrameDraws: probe?.lastFrame?.draws ?? null,
      singleFrameVertices: probe?.lastFrame?.verts ?? null,
      singleFrameTriangles:
        probe?.lastFrame?.verts != null ? probe.lastFrame.verts / 3 : null,
      framesObserved: probe?.frames ?? null,
    }
  })

const zeroFrames = (page) =>
  page.evaluate(() => {
    if (window.__ruProbe) {
      window.__ruProbe.frames = 0
      window.__ruProbe.lastFrame = { draws: 0, verts: 0 }
    }
  })

const canvasFacts = (page, selector) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel)
    if (!element) return null
    return {
      width: element.width,
      height: element.height,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      pixelRatio:
        Math.round((element.width / Math.max(element.clientWidth, 1)) * 100) /
        100,
    }
  }, selector)

const labels = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.ru-label'))
      .filter((element) => !element.hidden)
      .map((element) => ({
        id: element.getAttribute('data-projected-label'),
        x: Number.parseFloat(element.style.left),
        y: Number.parseFloat(element.style.top),
      })),
  )

const selectionState = (page, region) =>
  page.evaluate(
    (sel) => ({
      selection: document
        .querySelector(sel)
        ?.getAttribute('data-universe-selection'),
      selectedNode:
        document
          .querySelector('[data-universe-node][data-selected="true"]')
          ?.getAttribute('data-universe-label') ?? null,
      selectedEdge:
        document
          .querySelector('[data-universe-edge][data-selected="true"]')
          ?.getAttribute('data-universe-edge') ?? null,
      activeDetail:
        document
          .querySelector(
            '[data-universe-node-detail][data-active="true"], [data-universe-edge-detail][data-active="true"]',
          )
          ?.textContent?.replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160) ?? null,
    }),
    region,
  )

async function ensureTheme(page, wanted) {
  const toggle = page.locator('[data-theme-toggle]').first()
  if ((await toggle.count()) === 0) return
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await page.locator('html').getAttribute('data-theme')) === wanted)
      return
    await toggle.click()
    await page.waitForTimeout(200)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const server = spawn(
    process.execPath,
    ['scripts/serve-dist.mjs', '--port', String(PORT), '--root', 'dist'],
    { stdio: 'ignore' },
  )

  const measurements = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    home: { states: [], variants: [] },
    about: { states: [] },
    idle: null,
  }
  const shot = async (page, name, fullPage = false) => {
    await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage })
    return `${name}.png`
  }

  let browser
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`${BASE}/en/`, { method: 'HEAD' })
        if (response.ok) break
      } catch {
        noop()
      }
      await delay(250)
    }

    browser = await chromium.launch()

    // ======================= HOME =============================================
    const homeRegion = '[data-universe-region][data-universe-mode="home"]'
    const homeCanvas = `${homeRegion} canvas[data-universe-canvas]`
    const homePage = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await counters(homePage)
    await homePage.emulateMedia({ colorScheme: 'dark' })
    await homePage.goto(`${BASE}/en/`)
    await homePage
      .locator(`${homeRegion}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await homePage.waitForTimeout(700)

    const track = await homePage.evaluate(() => {
      const element = document.querySelector('[data-universe-track]')
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top + window.scrollY,
        height: rect.height,
        viewport: window.innerHeight,
      }
    })
    measurements.home.track = track

    const readHomeState = async () => {
      const region = homePage.locator(homeRegion)
      return {
        progress: await region.getAttribute('data-universe-progress'),
        state: await region.getAttribute('data-universe-state'),
      }
    }

    // Walk the page scroll and capture the first sighting of each designed state.
    // The driver derives progress from page scroll, not from the track's own height,
    // so the sweep must cover the whole document.
    const seen = new Map()
    const pageHeight = await homePage.evaluate(
      () => document.documentElement.scrollHeight,
    )
    const sweepStep = Math.max(Math.round(pageHeight / 60), 40)
    for (let offset = 0; offset <= pageHeight; offset += sweepStep) {
      // Nudge first: scrolling to the position we are already at emits no event and
      // would leave the published state stale.
      await homePage.evaluate(
        (target) => window.scrollTo(0, Math.max(target, 1)),
        offset,
      )
      await homePage.evaluate((target) => window.scrollTo(0, target), offset)
      for (let settle = 0; settle < 10; settle += 1) {
        await homePage.waitForTimeout(100)
        const { state } = await readHomeState()
        if (state) break
      }
      const { progress, state } = await readHomeState()
      if (!state || seen.has(state)) continue
      // Let the interpolated pose settle before the capture, so the screenshot and
      // the recorded coordinates describe the same frame.
      await homePage.waitForTimeout(300)
      const entry = {
        state: Number(state),
        progress: Number(progress ?? 0),
        scrollY: await homePage.evaluate(() => window.scrollY),
        screenshot: await shot(
          homePage,
          `home-scroll-state${state}-dark-desktop`,
        ),
        canvas: await canvasFacts(homePage, homeCanvas),
        labels: await labels(homePage),
        ...(await readProbe(homePage)),
      }
      seen.set(state, entry)
      measurements.home.states.push(entry)
      if (seen.size >= 4) break
    }
    measurements.home.pageHeight = pageHeight

    // Variants at the opening state.
    const variants = [
      { name: 'home-dark-desktop', width: 1440, height: 900, theme: 'dark' },
      { name: 'home-light-desktop', width: 1440, height: 900, theme: 'light' },
      { name: 'home-dark-mobile', width: 390, height: 844, theme: 'dark' },
      { name: 'home-light-mobile', width: 390, height: 844, theme: 'light' },
    ]
    for (const variant of variants) {
      await homePage.setViewportSize({
        width: variant.width,
        height: variant.height,
      })
      await homePage.evaluate(() => window.scrollTo(0, 0))
      await ensureTheme(homePage, variant.theme)
      await homePage.waitForTimeout(700)
      measurements.home.variants.push({
        name: variant.name,
        theme: variant.theme,
        viewport: [variant.width, variant.height],
        screenshot: await shot(homePage, variant.name),
        canvas: await canvasFacts(homePage, homeCanvas),
        canvasCount: await homePage.locator('canvas').count(),
        ...(await readHomeState()),
        ...(await readProbe(homePage)),
      })
    }
    // Full-page reference shot at desktop width.
    await homePage.setViewportSize({ width: 1440, height: 900 })
    await ensureTheme(homePage, 'dark')
    await homePage.evaluate(() => window.scrollTo(0, 0))
    await homePage.waitForTimeout(600)
    measurements.home.variants.push({
      name: 'home-dark-full',
      screenshot: await shot(homePage, 'home-dark-full', true),
      canvas: await canvasFacts(homePage, homeCanvas),
    })
    await homePage.close()

    // ======================= ABOUT ============================================
    const region = '[data-universe-region][data-universe-mode="about"]'
    const canvas = `${region} canvas[data-universe-canvas]`
    const stage = `${region} [data-universe-scene]`
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await counters(page)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${BASE}/en/about/`)
    await page
      .locator(`${region}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)

    const stageCentre = async () => {
      const box = await page.locator(stage).boundingBox()
      return {
        x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
      }
    }

    measurements.about.states.push({
      name: 'about-dark-default',
      screenshot: await shot(page, 'about-dark-default'),
      canvas: await canvasFacts(page, canvas),
      canvasCount: await page.locator('canvas').count(),
      labels: await labels(page),
      ...(await readProbe(page)),
    })
    await page.screenshot({ path: resolve(OUT_DIR, 'about-dark-full.png') })

    const centre = await stageCentre()
    const beforeDrag = await labels(page)
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(centre.x + step * 18, centre.y + step * 4)
      await page.waitForTimeout(10)
    }
    await page.mouse.up()
    await page.waitForTimeout(500)
    const afterDrag = await labels(page)
    measurements.about.states.push({
      name: 'about-dark-after-drag',
      screenshot: await shot(page, 'about-dark-after-drag'),
      before: beforeDrag,
      after: afterDrag,
      movedPx: beforeDrag.map((point, index) => ({
        id: point.id,
        dx: Math.round(((afterDrag[index]?.x ?? point.x) - point.x) * 10) / 10,
        dy: Math.round(((afterDrag[index]?.y ?? point.y) - point.y) * 10) / 10,
      })),
      scrollY: await page.evaluate(() => window.scrollY),
      ...(await readProbe(page)),
    })

    const beforeZoom = await labels(page)
    await page.mouse.move(centre.x, centre.y)
    for (let notch = 0; notch < 4; notch += 1) {
      await page.mouse.wheel(0, -240)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(400)
    measurements.about.states.push({
      name: 'about-dark-after-zoom',
      screenshot: await shot(page, 'about-dark-after-zoom'),
      before: beforeZoom,
      after: await labels(page),
      ...(await readProbe(page)),
    })

    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await page.waitForTimeout(900)

    const identityPoint = await page.evaluate(
      (selectors) => {
        const label = document.querySelector(
          `${selectors.region} .ru-label[data-projected-label="identity"]`,
        )
        const element = document.querySelector(selectors.stage)
        if (!label || !element) return null
        const box = element.getBoundingClientRect()
        return {
          x: box.left + Number.parseFloat(label.style.left),
          y: box.top + Number.parseFloat(label.style.top),
        }
      },
      { region, stage },
    )
    if (identityPoint) {
      const hit = await page.evaluate((point) => {
        const element = document.elementFromPoint(point.x, point.y)
        return element
          ? `${element.tagName.toLowerCase()}.${element.className}`
          : null
      }, identityPoint)
      await page.mouse.click(identityPoint.x, identityPoint.y)
      await page.waitForTimeout(400)
      measurements.about.states.push({
        name: 'about-dark-selected-person',
        screenshot: await shot(page, 'about-dark-selected-person'),
        clickedAt: identityPoint,
        elementFromPoint: hit,
        ...(await selectionState(page, region)),
      })
    }

    const domainNode = page.locator(
      '[data-universe-node][data-universe-kind="domain"]',
    )
    await domainNode.last().locator('summary').click()
    await page.waitForTimeout(400)
    measurements.about.states.push({
      name: 'about-dark-selected-domain',
      screenshot: await shot(page, 'about-dark-selected-domain'),
      ...(await selectionState(page, region)),
    })

    const edge = page.locator('[data-universe-edge]').first()
    await edge.locator('button').click()
    await page.waitForTimeout(400)
    measurements.about.states.push({
      name: 'about-dark-selected-edge',
      screenshot: await shot(page, 'about-dark-selected-edge'),
      ...(await selectionState(page, region)),
    })

    await ensureTheme(page, 'light')
    await domainNode.last().locator('summary').click()
    await page.waitForTimeout(500)
    measurements.about.states.push({
      name: 'about-light-selected-node',
      screenshot: await shot(page, 'about-light-selected-node'),
      theme: await page.locator('html').getAttribute('data-theme'),
      ...(await selectionState(page, region)),
    })

    // Mobile, both themes — the brief asks for the simplified mode in dark and light.
    await ensureTheme(page, 'dark')
    for (const theme of ['dark', 'light']) {
      await page.setViewportSize({ width: 390, height: 844 })
      await ensureTheme(page, theme)
      await page.locator(stage).scrollIntoViewIfNeeded()
      await page.waitForTimeout(600)
      measurements.about.states.push({
        name: `about-mobile-${theme}`,
        screenshot: await shot(page, `about-mobile-${theme}`),
        theme,
        canvas: await canvasFacts(page, canvas),
        canvasCount: await page.locator('canvas').count(),
        labels: await labels(page),
        ...(await readProbe(page)),
      })
    }

    // ======================= IDLE =============================================
    // Headline metric is the number of rendered FRAMES during the window: a settled
    // render-on-change scene must produce none. `lastFrame` is reported separately
    // and only means something if a frame did happen.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await zeroFrames(page)
    await page.waitForTimeout(1500)
    measurements.idle = {
      scene: 'about',
      windowMs: 1500,
      ...(await page.evaluate(() => ({
        framesDuringIdle: window.__ruProbe?.frames ?? -1,
        lastFrameDraws: window.__ruProbe?.lastFrame?.draws ?? -1,
        canvasCount: document.querySelectorAll('canvas').length,
      }))),
    }
  } finally {
    if (browser) await browser.close()
    server.kill()
  }

  await writeFile(
    resolve(OUT_DIR, 'measurements.json'),
    JSON.stringify(measurements, null, 2),
  )
  const summary = {
    outDir: OUT_DIR,
    homeStates: measurements.home.states.map((entry) => ({
      state: entry.state,
      progress: entry.progress,
      draws: entry.singleFrameDraws,
      triangles: entry.singleFrameTriangles,
      shot: entry.screenshot,
    })),
    homeVariants: measurements.home.variants.map((entry) => ({
      name: entry.name,
      draws: entry.singleFrameDraws,
      triangles: entry.singleFrameTriangles,
      dpr: entry.canvas?.pixelRatio ?? null,
      canvasCount: entry.canvasCount ?? null,
      shot: entry.screenshot,
    })),
    aboutStates: measurements.about.states.map((entry) => ({
      name: entry.name,
      draws: entry.singleFrameDraws ?? null,
      triangles: entry.singleFrameTriangles ?? null,
      dpr: entry.canvas?.pixelRatio ?? null,
      shot: entry.screenshot,
    })),
    idle: measurements.idle,
  }
  console.log(JSON.stringify(summary, null, 1))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
