#!/usr/bin/env node
/**
 * RU-2 evidence capture for the About Research Universe.
 *
 * Captures the states the design review needs, and records the measurable state
 * behind each one (projected label coordinates, draw counts, idle frames) so a
 * screenshot can never be read as evidence on its own.
 *
 * Usage:
 *   PUBLIC_API_BASE_URL=https://tahamohamadi.ir npm run build
 *   node scripts/capture-research-universe.mjs
 *
 * Output (gitignored, referenced by docs/quality/RESEARCH-UNIVERSE-RU2-EVIDENCE.md):
 *   test-results/research-universe/*.png
 *   test-results/research-universe/measurements.json
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
const ABOUT = '/en/about/'

const region = '[data-universe-region][data-universe-mode="about"]'
const canvas = `${region} canvas[data-universe-canvas]`
const stage = `${region} [data-universe-scene]`

const write = (name, data) =>
  writeFile(resolve(OUT_DIR, name), JSON.stringify(data, null, 2))

function installDrawCounter(page) {
  return page.addInitScript(() => {
    const probe = { value: 0 }
    window.__ruDraws = probe
    const bump = () => {
      probe.value += 1
    }
    for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const ctor = window[name]
      const proto = ctor && ctor.prototype
      if (!proto || !proto.drawArrays || !proto.drawElements) continue
      const originalArrays = proto.drawArrays
      const originalElements = proto.drawElements
      proto.drawArrays = function (...args) {
        bump()
        return originalArrays.apply(this, args)
      }
      proto.drawElements = function (...args) {
        bump()
        return originalElements.apply(this, args)
      }
    }
  })
}

const readDraws = (page) => page.evaluate(() => window.__ruDraws.value)
const zeroDraws = (page) =>
  page.evaluate(() => {
    window.__ruDraws.value = 0
  })

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

const selectionState = (page) =>
  page.evaluate(
    (selectors) => ({
      selection: document
        .querySelector(selectors.region)
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
    { region },
  )

async function ensureTheme(page, wanted) {
  const toggle = page.locator('[data-theme-toggle]').first()
  if ((await toggle.count()) === 0) return
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if ((await page.locator('html').getAttribute('data-theme')) === wanted)
      return
    await toggle.click()
    await page.waitForTimeout(200)
  }
}

async function stageCentre(page) {
  const box = await page.locator(stage).boundingBox()
  return {
    x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
    y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
  }
}

async function openAbout(page) {
  await page.goto(`${BASE}${ABOUT}`)
  await page
    .locator(`${region}[data-universe-enhancement="enhanced"]`)
    .waitFor()
  await page.locator(stage).scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
}

const shot = async (page, name, fullPage = false) => {
  await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage })
  return `${name}.png`
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
    steps: {},
  }
  let browser
  try {
    // Wait for the server instead of sleeping blindly.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`${BASE}${ABOUT}`, { method: 'HEAD' })
        if (response.ok) break
      } catch {
        // not up yet
      }
      await delay(250)
    }

    browser = await chromium.launch()
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await installDrawCounter(page)
    await openAbout(page)
    await ensureTheme(page, 'dark')
    await page.waitForTimeout(300)

    // 1. default ------------------------------------------------------------
    const canvasMetrics = await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      return {
        width: element.width,
        height: element.height,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        pixelRatio: element.width / Math.max(element.clientWidth, 1),
      }
    }, canvas)
    await page.screenshot({ path: resolve(OUT_DIR, 'about-dark-full.png') })
    measurements.steps.default = {
      screenshot: await shot(page, 'about-dark-default'),
      fullPageScreenshot: 'about-dark-full.png',
      labels: await labels(page),
      canvas: canvasMetrics,
    }

    // 2. after a real drag --------------------------------------------------
    const centre = await stageCentre(page)
    const before = await labels(page)
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(centre.x + step * 18, centre.y + step * 4)
      await page.waitForTimeout(10)
    }
    await page.mouse.up()
    await page.waitForTimeout(500)
    const after = await labels(page)
    measurements.steps.afterDrag = {
      screenshot: await shot(page, 'about-dark-after-drag'),
      before,
      after,
      movedPx: before.map((point, index) => ({
        id: point.id,
        dx: Math.round(((after[index]?.x ?? point.x) - point.x) * 10) / 10,
        dy: Math.round(((after[index]?.y ?? point.y) - point.y) * 10) / 10,
      })),
      draws: await readDraws(page),
      scrollY: await page.evaluate(() => window.scrollY),
    }

    // 3. after a real zoom --------------------------------------------------
    const zoomBefore = await labels(page)
    await page.mouse.move(centre.x, centre.y)
    for (let notch = 0; notch < 4; notch += 1) {
      await page.mouse.wheel(0, -240)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(400)
    measurements.steps.afterZoom = {
      screenshot: await shot(page, 'about-dark-after-zoom'),
      before: zoomBefore,
      after: await labels(page),
      draws: await readDraws(page),
    }

    // Reset to the canonical pose before capturing selections.
    await page.locator(`${region} [data-universe-action="reset"]`).click()
    await page.waitForTimeout(900)

    // 4. selected central / person node ------------------------------------
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
      measurements.steps.selectedPerson = {
        screenshot: await shot(page, 'about-dark-selected-person'),
        clickedAt: identityPoint,
        elementFromPoint: hit,
        ...(await selectionState(page)),
      }
    }

    // 5. selected main-domain node -----------------------------------------
    const domainNode = page.locator(
      '[data-universe-node][data-universe-kind="domain"]',
    )
    await domainNode.last().locator('summary').click()
    await page.waitForTimeout(400)
    measurements.steps.selectedDomain = {
      screenshot: await shot(page, 'about-dark-selected-domain'),
      ...(await selectionState(page)),
    }

    // 6. selected edge ------------------------------------------------------
    const edge = page.locator('[data-universe-edge]').first()
    await edge.locator('button').click()
    await page.waitForTimeout(400)
    measurements.steps.selectedEdge = {
      screenshot: await shot(page, 'about-dark-selected-edge'),
      ...(await selectionState(page)),
    }

    // 7. light theme with a node selected ----------------------------------
    await ensureTheme(page, 'light')
    await domainNode.last().locator('summary').click()
    await page.waitForTimeout(500)
    measurements.steps.lightSelected = {
      screenshot: await shot(page, 'about-light-selected-node'),
      theme: await page.locator('html').getAttribute('data-theme'),
      ...(await selectionState(page)),
    }

    // 8. mobile simplified --------------------------------------------------
    await ensureTheme(page, 'dark')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    measurements.steps.mobile = {
      screenshot: await shot(page, 'about-mobile'),
      canvas: await page.evaluate((selector) => {
        const element = document.querySelector(selector)
        return {
          width: element.width,
          clientWidth: element.clientWidth,
          height: element.height,
          clientHeight: element.clientHeight,
        }
      }, canvas),
      labels: await labels(page),
    }

    // 9. idle render measurement -------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator(stage).scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await zeroDraws(page)
    await page.waitForTimeout(1500)
    measurements.steps.idle = {
      drawsDuringIdleMs: 1500,
      draws: await readDraws(page),
      canvasCount: await page.locator('canvas').count(),
    }

    await write('measurements.json', measurements)
    console.log(
      JSON.stringify(
        {
          outDir: OUT_DIR,
          steps: Object.fromEntries(
            Object.entries(measurements.steps).map(([key, value]) => [
              key,
              {
                screenshot: value.screenshot,
                draws: value.draws ?? null,
                selection: value.selection ?? null,
              },
            ]),
          ),
        },
        null,
        1,
      ),
    )
  } finally {
    if (browser) await browser.close()
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
