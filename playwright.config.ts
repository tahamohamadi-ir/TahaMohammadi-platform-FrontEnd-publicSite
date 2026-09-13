import { defineConfig } from '@playwright/test'
import {
  LOOPBACK_HOST,
  resolveSafePort,
} from './src/test-harness/playwright-port'

const PORT_ENV = 'TM_E2E_PORT'

/**
 * Resolve one Chromium-safe free port per run so the harness never depends on a
 * fixed, possibly busy port and never attaches to another worktree's server.
 *
 * The selection lives in `src/test-harness/playwright-port.ts` because the
 * operating system's own ephemeral allocation can return a port Chromium
 * refuses (`net::ERR_UNSAFE_PORT`) — see that module for the measured evidence.
 *
 * Playwright re-imports this config in every worker process, so the runner
 * publishes the resolved port through the process environment; workers
 * inherit it and evaluate to the same baseURL and webServer port.
 */
const port = await resolveSafePort({ override: process.env[PORT_ENV] })
process.env[PORT_ENV] = String(port)

const baseURL = `http://${LOOPBACK_HOST}:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
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
    },
  },
})
