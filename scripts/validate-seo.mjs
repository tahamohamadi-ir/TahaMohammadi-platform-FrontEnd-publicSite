#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCALE_INDEX_ROUTES, LOCALES } from './seo-route-registry.mjs'
import {
  buildAlternateLinks,
  buildCanonicalUrl,
  localeRouteFromDistRelative,
} from './seo-url.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(root, 'dist')
const siteOrigin = (
  process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:4321'
).replace(/\/+$/, '')

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

function readDist(relativePath) {
  const absolute = path.join(distRoot, relativePath)
  if (!existsSync(absolute)) {
    fail(`Missing dist file: ${relativePath}`)
  }
  return readFileSync(absolute, 'utf8')
}

function collectHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectHtmlFiles(absolute, files)
      continue
    }
    if (entry.name.endsWith('.html')) {
      files.push(absolute)
    }
  }
  return files
}

function parseHeadLinks(html) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  const alternates = [
    ...html.matchAll(
      /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g,
    ),
  ].map(([, hreflang, href]) => ({ hreflang, href }))
  return { canonical, alternates }
}

function collectSitemapUrls() {
  const urls = new Set()
  const indexXml = readDist('sitemap-index.xml')
  const childPaths = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, loc]) => loc,
  )

  for (const childUrl of childPaths) {
    const childPath = new URL(childUrl).pathname.replace(/^\//, '')
    const xml = readDist(childPath)
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(loc)
    }
  }

  return urls
}

function validateLocalePage(relativePath, html) {
  const route = localeRouteFromDistRelative(relativePath)
  if (!route) return

  const { locale, pathSegment } = route
  const { canonical, alternates } = parseHeadLinks(html)
  const expectedCanonical = buildCanonicalUrl(siteOrigin, locale, pathSegment)

  if (!canonical) {
    fail(`${relativePath} is missing a canonical link`)
  }
  if (canonical !== expectedCanonical) {
    fail(
      `${relativePath} canonical ${canonical} does not match ${expectedCanonical}`,
    )
  }
  if (!alternates.length) {
    fail(`${relativePath} is missing hreflang alternate links`)
  }

  const alternateLocale = locale === 'en' ? 'fa' : 'en'
  const alternateAvailable = alternates.some(
    (link) => link.hreflang === alternateLocale,
  )
  const expectedAlternates = buildAlternateLinks(
    siteOrigin,
    locale,
    pathSegment,
    alternateAvailable,
  )

  for (const expected of expectedAlternates) {
    const actual = alternates.find(
      (link) => link.hreflang === expected.hreflang,
    )
    if (!actual) {
      fail(`${relativePath} is missing hreflang="${expected.hreflang}"`)
    }
    if (actual.href !== expected.href) {
      fail(
        `${relativePath} hreflang="${expected.hreflang}" is ${actual.href}, expected ${expected.href}`,
      )
    }
  }

  const unexpected = alternates.filter(
    (link) =>
      !expectedAlternates.some(
        (expected) => expected.hreflang === link.hreflang,
      ),
  )
  if (unexpected.length) {
    fail(
      `${relativePath} has unexpected hreflang links: ${unexpected.map((link) => link.hreflang).join(', ')}`,
    )
  }
}

if (!existsSync(distRoot)) {
  fail('dist/ not found — run npm run build first')
}

const robots = readDist('robots.txt')
if (!robots.includes('Sitemap: /sitemap-index.xml')) {
  fail('robots.txt must reference /sitemap-index.xml')
}

const sitemapUrls = collectSitemapUrls()
for (const locale of LOCALES) {
  for (const pathSegment of LOCALE_INDEX_ROUTES) {
    const expected = buildCanonicalUrl(siteOrigin, locale, pathSegment)
    if (!sitemapUrls.has(expected)) {
      fail(`sitemap is missing ${expected}`)
    }
  }
}

const gatewayHtml = readDist('index.html')
if (parseHeadLinks(gatewayHtml).canonical) {
  fail('language gateway must not emit a canonical link')
}

const htmlFiles = collectHtmlFiles(distRoot)
let localePages = 0

for (const absolute of htmlFiles) {
  const relative = path.relative(distRoot, absolute).replace(/\\/g, '/')
  if (relative === 'index.html') continue
  if (relative.startsWith('pagefind/')) continue
  if (relative.startsWith('_design/')) continue

  if (/^(fa|en)\/.+\.html$/.test(relative)) {
    localePages += 1
    validateLocalePage(relative, readFileSync(absolute, 'utf8'))
  }
}

for (const locale of LOCALES) {
  const indexPath = path.join(distRoot, 'pagefind', locale, 'pagefind.js')
  if (!existsSync(indexPath)) {
    fail(`Missing Pagefind bundle: pagefind/${locale}/pagefind.js`)
  }
}

console.log(
  `PASS: SEO artifacts validated; sitemap covers ${LOCALE_INDEX_ROUTES.length} index routes × ${LOCALES.length} locales; ${localePages} locale HTML pages passed canonical/hreflang checks; per-locale Pagefind indexes present.`,
)
