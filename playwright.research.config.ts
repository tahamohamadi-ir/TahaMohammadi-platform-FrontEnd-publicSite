import { defineConfig } from '@playwright/test'
import {
  LOOPBACK_HOST,
  resolveSafePort,
} from './src/test-harness/playwright-port'

/**
 * Research Universe browser suite configuration.
 *
 * Why a separate config: these specs verify surfaces whose INPUTS are CMS-gated
 * published contracts (the Home hero only exists when `/api/home-composition` is
 * reachable, and the universe itself needs `/api/graph` + the record resolver). A
 * hermetic local build cannot satisfy that, so this config builds the site against
 * a real published API through the existing `PUBLIC_API_BASE_URL` seam:
 *
 *   TM_E2E_API_BASE_URL=https://tahamohamadi.ir \
 *     npx playwright test --config playwright.research.config.ts
 *
 * The default `playwright.config.ts` run keeps the local fixture server and its
 * hermetic gateway coverage unchanged. Both use the same safe-port helper and the
 * same build/serve script, so nothing here can attach to another run's server.
 */

const PORT_ENV = 'TM_RU_E2E_PORT'

const port = await resolveSafePort({ override: process.env[PORT_ENV] })
process.env[PORT_ENV] = String(port)
process.env.TM_E2E_PORT = String(port)
// The harness reads this to decide the build input; default to production, which
// is the environment whose published graph these specs actually assert.
process.env.TM_E2E_API_BASE_URL =
  process.env.TM_E2E_API_BASE_URL ?? 'https://tahamohamadi.ir'

const baseURL = `http://${LOOPBACK_HOST}:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/ru-*.e2e.ts',
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
