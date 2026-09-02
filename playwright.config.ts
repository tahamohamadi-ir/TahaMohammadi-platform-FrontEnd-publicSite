import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { defineConfig } from '@playwright/test'

const PORT_ENV = 'TM_E2E_PORT'

/**
 * Resolve one ephemeral free port per run so the harness never depends on a
 * fixed, possibly busy port and never attaches to another worktree's server.
 *
 * Playwright re-imports this config in every worker process, so the runner
 * publishes the resolved port through the process environment; workers
 * inherit it and evaluate to the same baseURL and webServer port.
 */
async function resolveRunPort(): Promise<number> {
  const published = process.env[PORT_ENV]
  if (published && /^\d+$/.test(published)) {
    return Number(published)
  }

  const port = await new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port: freePort } = probe.address() as AddressInfo
      probe.close((error) => (error ? reject(error) : resolve(freePort)))
    })
  })

  process.env[PORT_ENV] = String(port)
  return port
}

const port = await resolveRunPort()
const baseURL = `http://127.0.0.1:${port}`

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
