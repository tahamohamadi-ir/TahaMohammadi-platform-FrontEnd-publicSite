#!/usr/bin/env node
/**
 * RU-4B — final visual-direction evidence capture.
 *
 * Captures the matrix the closure card names, from the REAL built site (a
 * published-API build), and records the measurable state behind every shot so a
 * screenshot can never be read as evidence on its own.
 *
 * Usage:
 *   PUBLIC_API_BASE_URL=https://tahamohamadi.ir npm run build
 *   node scripts/capture-ru4b-final.mjs
 *
 * Output (gitignored, deliberately OUTSIDE Playwright's `test-results/`, which is
 * wiped at the start of every Playwright run):
 *   .evidence/ru4b/shots/*.png
 *   .evidence/ru4b/shots/measurements.json
 *
 * The server is started and stopped by this script; nothing is left listening.
 *
 * Shots:
 *   01-03 Home dark   initial / mid-scroll / final scroll
 *   04-05 Home light  initial / representative scrolled
 *   06-12 About dark  default / rotated+ / rotated- / identity / domain / relationship / zoomed
 *   13-14 About light default / selected domain
 *   15-18 Mobile      Home dark, Home light, About dark, About light
 *   19-20 CROPS       Home graph-only dark, Home graph-only light  (owner-review artefacts)
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const PORT = Number(process.env.TM_RU_CAPTURE_PORT ?? 4391)
const BASE = `http://127.0.0.1:${PORT}`
const OUT_DIR = resolve('.evidence/ru4b/shots')

const noop = () => {}

/**
 * WebGL accounting from an init script.
 *
 * `drawArrays`/`drawElements` are patched on BOTH context prototypes and the
 * per-frame counters are cleared as each rAF callback starts, so `lastFrame` is
 * one frame's real workload and `frames` is a genuine idle detector: a scene with
 * no animation loop schedules no rAF at all.
 */
function counters(page) {
  return page.addInitScript(() => {
    const probe = {
      draws: 0,
      verts: 0,
      frames: 0,
      lastFrame: { draws: 0, verts: 0 },
      peak: { draws: 0, verts: 0 },
      glbRequests: [],
    }
    window.__ruProbe = probe

    // Record any authored-asset request, so "no GLB" is measured, not assumed.
    const originalFetch = window.fetch?.bind(window)
    if (originalFetch) {
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input?.url ?? '')
        if (/\.glb(\?|$)/i.test(url)) probe.glbRequests.push(url)
        return originalFetch(input, init)
      }
    }
    const OriginalXhr = window.XMLHttpRequest
    if (OriginalXhr) {
      const open = OriginalXhr.prototype.open
      OriginalXhr.prototype.open = function patched(method, url, ...rest) {
        if (/\.glb(\?|$)/i.test(String(url)))
          probe.glbRequests.push(String(url))
        return open.call(this, method, url, ...rest)
      }
    }

    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      raf((timestamp) => {
        probe.draws = 0
        probe.verts = 0
        try {
          return callback(timestamp)
        } finally {
          probe.lastFrame = { draws: probe.draws, verts: probe.verts }
          if (probe.draws > probe.peak.draws) {
            probe.peak = { draws: probe.draws, verts: probe.verts }
          }
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
      // Instanced draws are a DIFFERENT entry point: an InstancedMesh is rendered
      // with `drawElementsInstanced`, so patching only the non-instanced pair
      // reports a scene made of instanced batches as if it drew nothing.
      const originalArraysInstanced = proto.drawArraysInstanced
      const originalElementsInstanced = proto.drawElementsInstanced
      if (originalArraysInstanced) {
        proto.drawArraysInstanced = function (mode, first, count, instances) {
          probe.draws += 1
          probe.verts += (Number(count) || 0) * (Number(instances) || 1)
          return originalArraysInstanced.call(
            this,
            mode,
            first,
            count,
            instances,
          )
        }
      }
      if (originalElementsInstanced) {
        proto.drawElementsInstanced = function (
          mode,
          count,
          type,
          offset,
          instances,
        ) {
          probe.draws += 1
          probe.verts += (Number(count) || 0) * (Number(instances) || 1)
          return originalElementsInstanced.call(
            this,
            mode,
            count,
            type,
            offset,
            instances,
          )
        }
      }
    }
  })
}

const readProbe = (page) =>
  page.evaluate(() => {
    const probe = window.__ruProbe
    return {
      singleFrameDraws: probe?.lastFrame?.draws ?? null,
      singleFrameTriangles:
        probe?.lastFrame?.verts != null ? probe.lastFrame.verts / 3 : null,
      peakFrameDraws: probe?.peak?.draws ?? null,
      peakFrameTriangles:
        probe?.peak?.verts != null ? probe.peak.verts / 3 : null,
      framesObserved: probe?.frames ?? null,
      glbRequests: probe?.glbRequests ?? [],
    }
  })

const resetFrames = (page) =>
  page.evaluate(() => {
    if (!window.__ruProbe) return
    window.__ruProbe.frames = 0
    window.__ruProbe.lastFrame = { draws: 0, verts: 0 }
    window.__ruProbe.peak = { draws: 0, verts: 0 }
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

/** Every canvas on the page, so "exactly one" is measured rather than assumed. */
const canvasCount = (page) =>
  page.evaluate(() => document.querySelectorAll('canvas').length)

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

const regionState = (page, region) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel)
    return {
      enhancement: element?.getAttribute('data-universe-enhancement') ?? null,
      progress: element?.getAttribute('data-universe-progress') ?? null,
      state: element?.getAttribute('data-universe-state') ?? null,
      selection: element?.getAttribute('data-universe-selection') ?? null,
    }
  }, region)

async function ensureTheme(page, wanted) {
  const toggle = page.locator('[data-theme-toggle]').first()
  if ((await toggle.count()) === 0) return false
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await page.locator('html').getAttribute('data-theme')) === wanted)
      return true
    await toggle.click()
    await page.waitForTimeout(220)
  }
  return (await page.locator('html').getAttribute('data-theme')) === wanted
}

/**
 * Idle measurement: after settling, no frame may be scheduled for 1500 ms.
 * The counter is reset AFTER the settle so the settle's own frames cannot be
 * mistaken for an animation loop.
 */
async function forceRender(page, viewport) {
  await page.setViewportSize({
    width: viewport.width + 1,
    height: viewport.height,
  })
  await page.waitForTimeout(260)
  await page.setViewportSize(viewport)
  await page.waitForTimeout(260)
}

async function idleFrames(page, settleMs = 600, windowMs = 1500) {
  await page.waitForTimeout(settleMs)
  await resetFrames(page)
  await page.waitForTimeout(windowMs)
  const probe = await readProbe(page)
  return probe.framesObserved
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const server = spawn(
    process.execPath,
    ['scripts/serve-dist.mjs', '--port', String(PORT), '--root', 'dist'],
    { stdio: 'ignore' },
  )

  const HOME_REGION = '[data-universe-region][data-universe-mode="home"]'
  const ABOUT_REGION = '[data-universe-region][data-universe-mode="about"]'
  const homeCanvas = `${HOME_REGION} canvas[data-universe-canvas]`
  const aboutCanvas = `${ABOUT_REGION} canvas[data-universe-canvas]`
  const homeStage = `${HOME_REGION} [data-universe-scene]`
  const aboutStage = `${ABOUT_REGION} [data-universe-scene]`

  const measurements = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    shots: {},
    perf: {},
  }
  const written = []
  const shot = async (page, name, options = {}) => {
    const file = `${name}.png`
    await page.screenshot({ path: resolve(OUT_DIR, file), ...options })
    written.push(file)
    return file
  }
  const stageShot = async (page, name, selector, hideSelectors = []) => {
    const file = `${name}.png`
    // The stage's rectangle is taller than the graph it contains, so a plain
    // element screenshot also captures whatever page furniture overlaps that
    // rectangle — measured: the first row of the semantic node list (a pill
    // reading the owner's name) appeared in the Home crop and made a
    // "graph-only" artefact ambiguous. The overlapping elements are hidden for
    // the duration of the capture and restored immediately. No product markup
    // or style is touched.
    if (hideSelectors.length > 0) {
      await page.evaluate((selectors) => {
        for (const sel of selectors) {
          for (const element of document.querySelectorAll(sel)) {
            element.setAttribute(
              'data-crop-hide-style',
              element.getAttribute('style') ?? '',
            )
            element.style.visibility = 'hidden'
          }
        }
      }, hideSelectors)
      await page.waitForTimeout(120)
    }
    await page
      .locator(selector)
      .first()
      .screenshot({
        path: resolve(OUT_DIR, file),
      })
    if (hideSelectors.length > 0) {
      await page.evaluate(() => {
        for (const element of document.querySelectorAll(
          '[data-crop-hide-style]',
        )) {
          element.setAttribute(
            'style',
            element.getAttribute('data-crop-hide-style') ?? '',
          )
          element.removeAttribute('data-crop-hide-style')
        }
      })
    }
    written.push(file)
    return file
  }

  /**
   * Page furniture that overlaps a stage's rectangle in the two experiences: the
   * semantic node/relationship lists and the About intro copy that follow the
   * graph. Hidden only while a graph-only crop is taken.
   */
  const CROP_HIDE = [
    '.hg-node-list',
    '.hg-edges',
    '.ru-nodes',
    '.ru-edges',
    '.ru-about__inspector',
    '.ru-about__lead',
    '.ru-about__heading',
    '.hg__heading',
  ]

  let browser
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch(`${BASE}/en/`, { method: 'HEAD' })
        if (response.ok) break
      } catch {
        noop()
      }
      await delay(250)
    }

    browser = await chromium.launch()

    // ===================== HOME DESKTOP =====================================
    const home = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await counters(home)
    await home.emulateMedia({ colorScheme: 'dark' })
    await home.goto(`${BASE}/en/`)
    await home
      .locator(`${HOME_REGION}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await home.waitForTimeout(800)

    measurements.shots.homeDark = {}
    measurements.shots.homeDark.initial = {
      shot: await shot(home, '01-home-dark-initial'),
      state: await regionState(home, HOME_REGION),
      labels: await labels(home),
    }
    // Graph-only crop (shot 19) — the primary owner-review artefact.
    measurements.shots.cropDark = {
      shot: await stageShot(home, '19-crop-home-dark', homeStage, CROP_HIDE),
    }

    // Sweep the document and capture the first sighting of each designed state.
    const pageHeight = await home.evaluate(
      () => document.documentElement.scrollHeight,
    )
    const step = Math.max(Math.round(pageHeight / 70), 40)
    const seen = new Set()
    let midShot = null
    let finalShot = null
    for (let offset = 0; offset <= pageHeight; offset += step) {
      await home.evaluate((y) => window.scrollTo(0, y), offset)
      await home.waitForTimeout(90)
      const state = await regionState(home, HOME_REGION)
      if (state.state && !seen.has(state.state)) {
        seen.add(state.state)
        if (state.state === '2' && !midShot) {
          midShot = {
            shot: await shot(home, '02-home-dark-mid-scroll'),
            state,
          }
        }
        if (state.state === '4' && !finalShot) {
          finalShot = {
            shot: await shot(home, '03-home-dark-final-scroll'),
            state,
          }
        }
      }
    }
    measurements.shots.homeDark.midScroll = midShot
    measurements.shots.homeDark.finalScroll = finalShot
    measurements.shots.homeDark.statesSeen = [...seen]

    // Performance + idle on the settled Home scene.
    // Bring the hero back on screen first: offscreen work is suspended, so a
    // measurement taken from the bottom of the page reports a real zero.
    await home.evaluate(() => window.scrollTo(0, 0))
    await home.waitForTimeout(500)
    await resetFrames(home)
    await forceRender(home, { width: 1440, height: 900 })
    measurements.perf.home = {
      canvasCount: await canvasCount(home),
      canvas: await canvasFacts(home, homeCanvas),
      labels: (await labels(home)).length,
      probe: await readProbe(home),
      idleFramesOver1500ms: await idleFrames(home),
    }

    // Home light.
    await home.evaluate(() => window.scrollTo(0, 0))
    measurements.shots.homeLight = {}
    if (await ensureTheme(home, 'light')) {
      await home.waitForTimeout(500)
      measurements.shots.homeLight.initial = {
        shot: await shot(home, '04-home-light-initial'),
        state: await regionState(home, HOME_REGION),
      }
      measurements.shots.cropLight = {
        shot: await stageShot(home, '20-crop-home-light', homeStage, CROP_HIDE),
      }
      // A representative scrolled state, not the initial one.
      await home.evaluate(
        (y) => window.scrollTo(0, y),
        Math.round(pageHeight * 0.5),
      )
      await home.waitForTimeout(400)
      measurements.shots.homeLight.scrolled = {
        shot: await shot(home, '05-home-light-scrolled'),
        state: await regionState(home, HOME_REGION),
      }
    }
    await home.close()

    // ===================== ABOUT DESKTOP ====================================
    const about = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await counters(about)
    await about.emulateMedia({ colorScheme: 'dark' })
    await about.goto(`${BASE}/en/about/`)
    await about
      .locator(`${ABOUT_REGION}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await about.locator(aboutStage).first().scrollIntoViewIfNeeded()
    await about.waitForTimeout(800)

    measurements.shots.aboutDark = {}
    measurements.shots.aboutDark.default = {
      shot: await shot(about, '06-about-dark-default'),
      state: await regionState(about, ABOUT_REGION),
      labels: await labels(about),
    }
    measurements.shots.aboutDark.graphCrop = {
      shot: await stageShot(about, '21-crop-about-dark', aboutStage, CROP_HIDE),
    }

    // Rotations: drag the stage left/right. Box is re-read after scrolling.
    const aboutBox = await about.locator(aboutStage).first().boundingBox()
    const cx = (aboutBox?.x ?? 0) + (aboutBox?.width ?? 0) / 2
    const cy = (aboutBox?.y ?? 0) + (aboutBox?.height ?? 0) / 2
    const drag = async (dx) => {
      await about.mouse.move(cx - dx / 2, cy)
      await about.mouse.down()
      await about.mouse.move(cx + dx / 2, cy, { steps: 12 })
      await about.mouse.up()
      await about.waitForTimeout(700)
    }
    await drag(260)
    measurements.shots.aboutDark.rotatedPositive = {
      shot: await shot(about, '07-about-dark-rotated-positive'),
      state: await regionState(about, ABOUT_REGION),
    }
    await drag(-520)
    measurements.shots.aboutDark.rotatedNegative = {
      shot: await shot(about, '08-about-dark-rotated-negative'),
      state: await regionState(about, ABOUT_REGION),
    }
    await about.locator('[data-universe-action="reset"]').first().click()
    await about.waitForTimeout(600)

    // Selections are driven through the SEMANTIC controls, so each shot proves the
    // published record is reachable without the canvas.
    await about
      .locator('[data-universe-node="identity"] summary')
      .first()
      .click()
    await about.waitForTimeout(700)
    measurements.shots.aboutDark.selectedIdentity = {
      shot: await shot(about, '09-about-dark-selected-identity'),
      state: await regionState(about, ABOUT_REGION),
    }

    await about
      .locator('[data-universe-node="research-topic-1"] summary')
      .first()
      .click()
    await about.waitForTimeout(700)
    measurements.shots.aboutDark.selectedDomain = {
      shot: await shot(about, '10-about-dark-selected-domain'),
      state: await regionState(about, ABOUT_REGION),
    }

    const firstEdgeId = await about.evaluate(() => {
      const element = document.querySelector('[data-universe-edge]')
      return element?.getAttribute('data-universe-edge') ?? null
    })
    if (firstEdgeId) {
      await about
        .locator(`[data-universe-edge="${firstEdgeId}"] button`)
        .first()
        .click()
      await about.waitForTimeout(700)
      measurements.shots.aboutDark.selectedRelationship = {
        shot: await shot(about, '11-about-dark-selected-relationship'),
        state: await regionState(about, ABOUT_REGION),
      }
    }

    await about.locator('[data-universe-action="clear"]').first().click()
    await about.locator('[data-universe-action="zoom-in"]').first().click()
    await about.locator('[data-universe-action="zoom-in"]').first().click()
    await about.waitForTimeout(700)
    measurements.shots.aboutDark.zoomed = {
      shot: await shot(about, '12-about-dark-zoomed'),
      state: await regionState(about, ABOUT_REGION),
    }

    await resetFrames(about)
    await forceRender(about, { width: 1440, height: 900 })
    measurements.perf.about = {
      canvasCount: await canvasCount(about),
      canvas: await canvasFacts(about, aboutCanvas),
      labels: (await labels(about)).length,
      probe: await readProbe(about),
      idleFramesOver1500ms: await idleFrames(about),
    }

    // About light.
    measurements.shots.aboutLight = {}
    if (await ensureTheme(about, 'light')) {
      await about.locator('[data-universe-action="reset"]').first().click()
      await about.waitForTimeout(600)
      measurements.shots.aboutLight.default = {
        shot: await shot(about, '13-about-light-default'),
        state: await regionState(about, ABOUT_REGION),
      }
      await about
        .locator('[data-universe-node="research-topic-1"] summary')
        .first()
        .click()
      await about.waitForTimeout(500)
      measurements.shots.aboutLight.selectedDomain = {
        shot: await shot(about, '14-about-light-selected-domain'),
        state: await regionState(about, ABOUT_REGION),
      }
    }
    await about.close()

    // ===================== MOBILE ===========================================
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    })
    await counters(mobile)
    await mobile.emulateMedia({ colorScheme: 'dark' })
    await mobile.goto(`${BASE}/en/`)
    await mobile
      .locator(`${HOME_REGION}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await mobile.waitForTimeout(800)
    measurements.shots.mobile = {}
    measurements.shots.mobile.homeDark = {
      shot: await stageShot(
        mobile,
        '15-mobile-home-dark',
        homeStage,
        CROP_HIDE,
      ),
      state: await regionState(mobile, HOME_REGION),
    }
    await mobile.locator(homeStage).first().scrollIntoViewIfNeeded()
    await mobile.waitForTimeout(500)
    await resetFrames(mobile)
    await forceRender(mobile, { width: 390, height: 844 })
    measurements.perf.mobileHome = {
      canvasCount: await canvasCount(mobile),
      canvas: await canvasFacts(mobile, homeCanvas),
      labels: (await labels(mobile)).length,
      probe: await readProbe(mobile),
      idleFramesOver1500ms: await idleFrames(mobile),
      horizontalOverflow: await mobile.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    }
    if (await ensureTheme(mobile, 'light')) {
      await mobile.waitForTimeout(400)
      measurements.shots.mobile.homeLight = {
        shot: await stageShot(
          mobile,
          '16-mobile-home-light',
          homeStage,
          CROP_HIDE,
        ),
        state: await regionState(mobile, HOME_REGION),
      }
    }
    await mobile.close()

    const mobileAbout = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    })
    await counters(mobileAbout)
    await mobileAbout.emulateMedia({ colorScheme: 'dark' })
    await mobileAbout.goto(`${BASE}/en/about/`)
    await mobileAbout
      .locator(`${ABOUT_REGION}[data-universe-enhancement="enhanced"]`)
      .waitFor()
    await mobileAbout.locator(aboutStage).first().scrollIntoViewIfNeeded()
    await mobileAbout.waitForTimeout(800)
    measurements.shots.mobile.aboutDark = {
      shot: await shot(mobileAbout, '17-mobile-about-dark'),
      state: await regionState(mobileAbout, ABOUT_REGION),
    }
    await resetFrames(mobileAbout)
    await forceRender(mobileAbout, { width: 390, height: 844 })
    measurements.perf.mobileAbout = {
      canvasCount: await canvasCount(mobileAbout),
      canvas: await canvasFacts(mobileAbout, aboutCanvas),
      labels: (await labels(mobileAbout)).length,
      probe: await readProbe(mobileAbout),
      idleFramesOver1500ms: await idleFrames(mobileAbout),
      horizontalOverflow: await mobileAbout.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    }
    if (await ensureTheme(mobileAbout, 'light')) {
      await mobileAbout.waitForTimeout(400)
      measurements.shots.mobile.aboutLight = {
        shot: await shot(mobileAbout, '18-mobile-about-light'),
        state: await regionState(mobileAbout, ABOUT_REGION),
      }
    }
    await mobileAbout.close()

    // ===================== GRAPH COUNTS =====================================
    // The published graph and the presentation tables, read from the built page so
    // the counts in the report come from the artefact under review.
    const graphAudit = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    })
    await graphAudit.goto(`${BASE}/en/`)
    const audit = await graphAudit.evaluate(() => {
      const payloadElement = document.querySelector('[data-universe-payload]')
      let payload = null
      try {
        payload = payloadElement ? JSON.parse(payloadElement.textContent) : null
      } catch {
        payload = null
      }
      return {
        nodes: payload?.nodes?.length ?? null,
        edges: payload?.edges?.length ?? null,
        nodeIds: (payload?.nodes ?? []).map((node) => node.id),
        edgeEndpoints: (payload?.edges ?? []).map((edge) => ({
          source: edge.source,
          target: edge.target,
          relationType: edge.relationType,
        })),
        semanticNodes: document.querySelectorAll('[data-universe-node]').length,
        semanticEdges: document.querySelectorAll('[data-universe-edge]').length,
      }
    })
    measurements.graph = audit
    await graphAudit.close()

    measurements.written = written
    await writeFile(
      resolve(OUT_DIR, 'measurements.json'),
      JSON.stringify(measurements, null, 2),
      'utf8',
    )
    console.log(
      `wrote ${written.length} shots + measurements.json to ${OUT_DIR}`,
    )
    console.log(JSON.stringify(measurements.graph, null, 2))
  } finally {
    if (browser) await browser.close()
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
