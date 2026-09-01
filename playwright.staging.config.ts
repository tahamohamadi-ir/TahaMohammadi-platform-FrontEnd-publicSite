import { defineConfig } from '@playwright/test'

/**
 * Remote staging smoke harness (PUBLIC-320).
 * Does not build or serve the local static artifact — targets deployed staging only.
 */
const siteUrl = process.env.PUBLIC_STAGING_SITE_URL?.trim().replace(/\/+$/, '')

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/public-320-staging-smoke.e2e.ts',
  fullyParallel: true,
  use: {
    baseURL: siteUrl || 'http://127.0.0.1:1',
    browserName: 'chromium',
  },
})
