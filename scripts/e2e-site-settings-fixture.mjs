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
 * This serves the same endpoint the real CMS serves, so the E2E build satisfies
 * the real input contract instead of the tests being weakened.
 *
 * Scope: ONLY the localized settings endpoints. Everything else 404s, so the
 * blast radius is exactly `fetchLocalizedSiteSettings` — operational settings
 * (`/api/site`), media and every other API keep their current settings-less
 * behaviour.
 *
 * Env:
 *   TM_E2E_SETTINGS_PORT — required listen port (resolved by playwright.config.ts
 *                          through the shared safe-port helper)
 *
 * Note: routed through `PUBLIC_API_BASE_URL`, which is a build input. This
 * server is started by scripts/playwright-web-server.mjs and never participates
 * in a normal, staging or production build.
 */
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

const port = Number(process.env.TM_E2E_SETTINGS_PORT)

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(
    'e2e-site-settings-fixture: TM_E2E_SETTINGS_PORT must be a valid port number',
  )
  process.exit(1)
}

let fixture
try {
  fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
} catch (error) {
  console.error(
    `e2e-site-settings-fixture: cannot read ${fixturePath}: ${error.message}`,
  )
  process.exit(1)
}

const LOCALE_PATTERN = /^\/api\/v1\/site\/([a-z]{2})\/?$/

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1')
  const match = LOCALE_PATTERN.exec(pathname)
  const payload = match ? fixture[match[1]] : undefined

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
