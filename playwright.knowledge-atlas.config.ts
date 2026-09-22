import { defineConfig } from '@playwright/test'
import {
  LOOPBACK_HOST,
  resolveSafePort,
} from './src/test-harness/playwright-port'

/**
 * Knowledge Atlas live-API confirmation configuration.
 *
 * Mirrors `playwright.research.config.ts`: the specs verify a surface whose
 * INPUT is a CMS-gated published contract (the Atlas only exists when
 * `/api/atlas/{locale}` on the target answers with a ready version). A
 * hermetic local build cannot satisfy that, so this config builds the site
 * against a real published API through the existing `PUBLIC_API_BASE_URL`
 * seam:
 *
 *   TM_E2E_API_BASE_URL=https://tahamohamadi.ir \
 *     npx playwright test --config playwright.knowledge-atlas.config.ts
 *
 * Without `TM_E2E_API_BASE_URL` the live specs skip honestly with the reason
 * recorded — the fixture build remains the acceptance surface until Plan D
 * activates the migrated version.
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
  testMatch: '**/*.e2e.ts',
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
    },
  },
})
