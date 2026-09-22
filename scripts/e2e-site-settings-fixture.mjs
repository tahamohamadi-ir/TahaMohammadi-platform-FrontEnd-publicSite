#!/usr/bin/env node
/**
 * Deterministic site-settings fixture server for the Playwright E2E build only.
 *
 * Why this exists: `src/pages/index.astro` resolves the gateway title from
 * `fetchLocalizedSiteSettings('en')`, which only fetches when
 * `PUBLIC_API_BASE_URL` is set. A local `astro build` has no API, so `brandName`
 * is empty and `.gw__title` never renders — which is why four gateway
 * assertions could not pass locally while passing against production.
 *
 * This serves the same endpoints the real CMS serves, so the E2E build satisfies
 * the real input contract instead of the tests being weakened.
 *
 * Stage 4.1 added the Home content contract on top of the settings one: the Home hero
 * (identity + graph modules, primary profile, home landing) also needs a deterministic answer,
 * because with no published modules Home renders "unavailable" and every Home spec fails
 * environmentally with "element count 0". Three read-only routes are added from
 * `tests/fixtures/home-content/home-content.fixture.json`; nothing else changes and no test is
 * weakened.
 *
 * Scope: the localized settings endpoints plus `/api/home-composition/<locale>`,
 * `/api/profiles/<locale>`, `/api/landings/<locale>/home` and the two research reads the
 * hero research lead needs. Everything else 404s, so
 * operational settings (`/api/site`), media and the rest keep their current behaviour.
 *
 * Env:
 *   TM_E2E_SETTINGS_PORT — required listen port (resolved by playwright.config.ts
 *                          through the shared safe-port helper)
 *
 * Note: routed through `PUBLIC_API_BASE_URL`, which is a build input. This
 * server is started by scripts/playwright-web-server.mjs and never participates
 * in a normal, staging or production build.
 */
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const fixturePath = path.join(
  repositoryRoot,
  'tests/fixtures/site-settings/localized-site-settings.fixture.json',
)

/** Stage 4.1: Home hero content, so the Home contract can be exercised without the live CMS. */
const homeContentPath = path.join(
  repositoryRoot,
  'tests/fixtures/home-content/home-content.fixture.json',
)

/** Atlas fixtures (Plan C Task 4): served beside the settings/home routes. */
const atlasFixtureDir = path.join(repositoryRoot, 'tests', 'fixtures', 'atlas')

const ATLAS_LOCALE_PATTERN = /^\/api\/atlas\/(en|fa)\/?$/

const port = Number(process.env.TM_E2E_SETTINGS_PORT)

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(
    'e2e-site-settings-fixture: TM_E2E_SETTINGS_PORT must be a valid port number',
  )
  process.exit(1)
}

let fixture
let homeContent
/** Atlas fixture bytes + ETag, read once at startup (Plan C Task 4). */
let atlasFixtures = {}
try {
  fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  homeContent = JSON.parse(readFileSync(homeContentPath, 'utf8'))
  for (const locale of ['en', 'fa']) {
    const bytes = readFileSync(path.join(atlasFixtureDir, `${locale}.json`))
    const etag = `"${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}"`
    atlasFixtures[locale] = { bytes, etag }
  }
} catch (error) {
  console.error(
    `e2e-site-settings-fixture: cannot read its fixtures: ${error.message}`,
  )
  process.exit(1)
}

const LOCALE_PATTERN = /^\/api\/v1\/site\/([a-z]{2})\/?$/
/** Home content routes, each mapped to the fixture key that answers it. */
const HOME_CONTENT_PATTERNS = [
  { pattern: /^\/api\/home-composition\/([a-z]{2})\/?$/, key: 'composition' },
  { pattern: /^\/api\/profiles\/([a-z]{2})\/?$/, key: 'profile' },
  { pattern: /^\/api\/landings\/([a-z]{2})\/home\/?$/, key: 'landing' },
  { pattern: /^\/api\/research\/topics\/([a-z]{2})\/?$/, key: 'topics' },
  {
    pattern: /^\/api\/research\/statements\/([a-z]{2})\/?$/,
    key: 'statements',
  },
]

function homeContentPayload(pathname) {
  for (const { pattern, key } of HOME_CONTENT_PATTERNS) {
    const match = pattern.exec(pathname)
    if (match) return homeContent[match[1]]?.[key]
  }
  return undefined
}

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1')
  const atlasMatch = ATLAS_LOCALE_PATTERN.exec(pathname)
  if (atlasMatch) {
    const entry = atlasFixtures[atlasMatch[1]]
    if (!entry) {
      response.writeHead(404, { 'content-type': 'application/json' })
      response.end('{"detail":"Not Found"}')
      return
    }
    if (request.headers['if-none-match'] === entry.etag) {
      response.writeHead(304, {
        etag: entry.etag,
        'cache-control': 'public, max-age=60',
      })
      response.end()
      return
    }
    response.writeHead(200, {
      'content-type': 'application/json',
      etag: entry.etag,
      'cache-control': 'public, max-age=60',
    })
    response.end(entry.bytes)
    return
  }
  const match = LOCALE_PATTERN.exec(pathname)
  const payload = match ? fixture[match[1]] : homeContentPayload(pathname)

  if (!payload) {
    // Everything outside the localized settings contract stays a 404, exactly
    // as a settings-less local build behaves today.
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end('{"detail":"Not Found"}')
    return
  }

  response.writeHead(200, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
})

server.listen(port, '127.0.0.1', () => {
  // Machine-readable so the harness can confirm the fixture is actually up.
  console.log(`e2e-site-settings-fixture: listening on ${port}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
