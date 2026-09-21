import { defineConfig } from '@playwright/test'

/** PUBLIC-170 design-atlas visual suite (tests/atlas). */
export default defineConfig({
  testDir: './tests/atlas',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
})
