import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import config from '../../playwright.config'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
const configSource = readFileSync(
  path.join(repositoryRoot, 'playwright.config.ts'),
  'utf8',
)

describe('Playwright harness self-containment', () => {
  it('does not rely on a fixed port anywhere in the config', () => {
    expect(configSource).not.toMatch(/4321/)
    expect(config.use?.baseURL).toMatch(/127\.0\.0\.1:\d+/)
  })

  it('resolves the web server URL from the same dynamic base URL', () => {
    expect(config.webServer?.url).toBe(config.use?.baseURL)
    const urlPort = config.use?.baseURL?.match(/:(\d+)$/)?.[1]
    expect(config.webServer?.env?.TM_E2E_PORT).toBe(urlPort)
  })

  it('builds the normal static site, then serves it with the Playwright-owned server', () => {
    expect(config.webServer?.command).toMatch(/playwright-web-server\.mjs/)
  })

  it('never spawns a detached dev server', () => {
    expect(config.webServer?.command).not.toMatch(/run dev/)
    expect(configSource).not.toMatch(/astro dev/)
  })

  it('never reuses or attaches to a foreign server', () => {
    expect(config.webServer?.reuseExistingServer).toBe(false)
  })

  it('allows a cold build plus serve start with an explicit webServer timeout', () => {
    expect(config.webServer?.timeout).toBeGreaterThanOrEqual(240_000)
  })
})
