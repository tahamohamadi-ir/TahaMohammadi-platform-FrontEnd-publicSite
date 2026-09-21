import { defineConfig } from '@playwright/test'
import {
  LOOPBACK_HOST,
  resolveSafePort,
} from './src/test-harness/playwright-port'

/**
 * Hermetic Knowledge Atlas performance + live-adjacent specs under
 * tests/knowledge-atlas (Plan C Tasks 22–23).
 */

const PORT_ENV = 'TM_KA_PERF_PORT'
const SETTINGS_PORT_ENV = 'TM_E2E_SETTINGS_PORT'

const port = await resolveSafePort({ override: process.env[PORT_ENV] })
process.env[PORT_ENV] = String(port)
process.env.TM_E2E_PORT = String(port)

const settingsPort = await resolveSafePort({
  override: process.env[SETTINGS_PORT_ENV],
})
process.env[SETTINGS_PORT_ENV] = String(settingsPort)

const baseURL = `http://${LOOPBACK_HOST}:${port}`

export default defineConfig({
  testDir: './tests/knowledge-atlas',
  testMatch: '**/*.{spec,e2e}.ts',
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
      TM_E2E_SETTINGS_PORT: String(settingsPort),
    },
  },
})
