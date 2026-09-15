#!/usr/bin/env node
/**
 * Stage 4.2 — first-paint theme QA (card §15).
 *
 * The Stage 4.1 motion recordings begin in light and then turn dark. That was the recorder's setup:
 * the runner navigated first and applied the theme afterwards, so a deliberate switch is what got
 * filmed. This script answers the product question instead — with the theme established BEFORE the
 * first paint (through the browser's colour-scheme preference, which is what the site's own theme
 * bootstrap reads), does a light hero ever get painted or even requested?
 *
 * Evidence collected per theme:
 *   - documentElement[data-theme] at DOMContentLoaded (i.e. before paint completes)
 *   - which authored theme group is visible, and that group's first frame currentSrc
 *   - every hero-v2 request, split by theme: a wrong-theme frame would show up here
 *   - a screenshot right after first paint
 *
 * Usage: node scripts/qa-stage4_2-first-paint.mjs [--base http://localhost:4321]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : process.env.QA_BASE_URL || 'http://localhost:4321'
const OUT = path.resolve(
  process.env.QA_OUT_DIR || 'docs/quality/hero-v2-stage4_2',
)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const report = {
  baseUrl: BASE,
  generatedAt: new Date().toISOString(),
  themes: {},
}

for (const scheme of ['dark', 'light']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 430, height: 932 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: scheme,
    })
    const page = await context.newPage()
    const requests = []
    page.on('request', (request) => {
      if (/hero-v2/.test(request.url()))
        requests.push(request.url().split('/').pop())
    })

    await page.goto(`${BASE}/en/`, { waitUntil: 'domcontentloaded' })
    // Read as early as the DOM allows: this is the state the first paint uses.
    const early = await page.evaluate(() => {
      const visibleGroup = document.querySelector(
        '[data-hero-sequence-theme]:not([hidden])',
      )
      const img = visibleGroup ? visibleGroup.querySelector('img') : null
      return {
        themeAttribute: document.documentElement.dataset.theme ?? null,
        visibleSequenceTheme: visibleGroup
          ? visibleGroup.dataset.heroSequenceTheme
          : null,
        visibleCurrentSrc: img ? img.currentSrc.split('/').pop() : null,
        heroPresent: Boolean(document.querySelector('[data-hero-sequence]')),
        colorSchemeDark: window.matchMedia('(prefers-color-scheme: dark)')
          .matches,
      }
    })
    await page.screenshot({
      path: path.join(OUT, `first-paint-${viewport.name}-${scheme}.jpg`),
      type: 'jpeg',
      quality: 74,
    })
    await page.waitForTimeout(1500)
    const settled = await page.evaluate(() => {
      const visibleGroup = document.querySelector(
        '[data-hero-sequence-theme]:not([hidden])',
      )
      return {
        themeAttribute: document.documentElement.dataset.theme ?? null,
        visibleSequenceTheme: visibleGroup
          ? visibleGroup.dataset.heroSequenceTheme
          : null,
      }
    })

    const wrongThemeRequests = requests.filter(
      (name) => !name.includes(`-${scheme}-`),
    )
    const key = `${viewport.name}-${scheme}`
    report.themes[key] = {
      early,
      settled,
      heroRequestCount: requests.length,
      wrongThemeRequests,
      firstPaintIsCorrectTheme:
        early.themeAttribute === scheme &&
        early.visibleSequenceTheme === scheme,
      noWrongThemeAssetRequested: wrongThemeRequests.length === 0,
      screenshot: `first-paint-${viewport.name}-${scheme}.jpg`,
    }
    console.log(`FIRST_PAINT ${key} ${JSON.stringify(report.themes[key])}`)
    await context.close()
  }
}

await browser.close()
writeFileSync(
  path.join(OUT, 'first-paint.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(`SUMMARY ${path.join(OUT, 'first-paint.json')}`)
