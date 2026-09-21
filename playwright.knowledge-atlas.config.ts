import { defineConfig } from '@playwright/test'
import {
  LOOPBACK_HOST,
  resolveSafePort,
} from './src/test-harness/playwright-port'

/**
 * Live-API Knowledge Atlas suite (Plan C Task 23).
 * Mirrors playwright.research.config.ts: builds against TM_E2E_API_BASE_URL.
 */

const PORT_ENV = 'TM_KA_E2E_PORT'

const port = await resolveSafePort({ override: process.env[PORT_ENV] })
process.env[PORT_ENV] = String(port)
process.env.TM_E2E_PORT = String(port)
process.env.TM_E2E_API_BASE_URL =
  process.env.TM_E2E_API_BASE_URL ?? 'https://tahamohamadi.ir'

const baseURL = `http://${LOOPBACK_HOST}:${port}`

export default defineConfig({
  testDir: './tests/knowledge-atlas',
  testMatch: '**/ka-live.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL,
    browserName: 'chromium',
  },
  webServer: {
    command: `node scripts/playwright-web-server.mjs`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      TM_E2E_PORT: String(port),
      TM_E2E_API_BASE_URL: process.env.TM_E2E_API_BASE_URL,
    },
  },
})
