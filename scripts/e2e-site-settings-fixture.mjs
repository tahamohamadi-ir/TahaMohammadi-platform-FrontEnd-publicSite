#!/usr/bin/env node
/**
 * Deterministic API fixture server for the Playwright E2E build only.
 *
 * Why this exists: the public site resolves several published contracts at BUILD
 * time. A local `astro build` has no API, so those contracts come back empty and
 * the corresponding surfaces render their honest fallbacks — which means a local
 * E2E run cannot verify them at all.
 *
 * This serves exactly the read-only published contracts the E2E build needs, as
 * recorded production responses:
 *
 *   /api/v1/site/<locale>          — localized site settings (gateway title)
 *   /api/graph/<locale>            — the published research graph
 *   /api/v1/records/<locale>/resolve — the published record resolver
 *
 * Scope discipline: everything outside those three contracts stays a 404, so the
 * blast radius of this server is exactly the inputs listed above. The graph and
 * resolver payloads are byte-copies of the live responses (see
 * `tests/fixtures/research-universe/`), so no fixture invents a record, a slug or
 * a relationship that production does not already publish.
 *
 * Note on the file name: it says `site-settings` for historical reasons; the
 * scope above is the current one.
 *
 * Env:
 *   TM_E2E_SETTINGS_PORT — required listen port (resolved by playwright.config.ts
 *                          through the shared safe-port helper)
 *
 * Routed through `PUBLIC_API_BASE_URL`, which is a build input. This server is
 * started by scripts/playwright-web-server.mjs and never participates in a
 * normal, staging or production build.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const settingsFixturePath = path.join(
  repositoryRoot,
  'tests/fixtures/site-settings/localized-site-settings.fixture.json',
)
const graphFixtureDir = path.join(
  repositoryRoot,
  'tests/fixtures/research-universe',
)

const port = Number(process.env.TM_E2E_SETTINGS_PORT)

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(
    'e2e-api-fixture: TM_E2E_SETTINGS_PORT must be a valid port number',
  )
  process.exit(1)
}

function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    console.error(
      `e2e-api-fixture: cannot read ${label} (${file}): ${error.message}`,
    )
    process.exit(1)
  }
}

const settings = readJson(settingsFixturePath, 'site settings')
const graph = {
  en: readJson(path.join(graphFixtureDir, 'graph.en.json'), 'graph.en'),
  fa: readJson(path.join(graphFixtureDir, 'graph.fa.json'), 'graph.fa'),
}
const resolve = {
  en: readJson(path.join(graphFixtureDir, 'resolve.en.json'), 'resolve.en'),
  fa: readJson(path.join(graphFixtureDir, 'resolve.fa.json'), 'resolve.fa'),
}

const SETTINGS_PATTERN = /^\/api\/v1\/site\/([a-z]{2})\/?$/
const GRAPH_PATTERN = /^\/api\/graph\/([a-z]{2})\/?$/
const RESOLVE_PATTERN = /^\/api\/v1\/records\/([a-z]{2})\/resolve\/?$/

function payloadFor(pathname) {
  const settingsMatch = SETTINGS_PATTERN.exec(pathname)
  if (settingsMatch) return settings[settingsMatch[1]]

  const graphMatch = GRAPH_PATTERN.exec(pathname)
  if (graphMatch) return graph[graphMatch[1]]

  const resolveMatch = RESOLVE_PATTERN.exec(pathname)
  if (resolveMatch) return resolve[resolveMatch[1]]

  // Everything outside the three published contracts stays a 404, exactly as a
  // contract-less local build behaves today.
  return undefined
}

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1')
  const payload = payloadFor(pathname)

  if (!payload) {
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
  console.log(`e2e-api-fixture: listening on ${port}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
