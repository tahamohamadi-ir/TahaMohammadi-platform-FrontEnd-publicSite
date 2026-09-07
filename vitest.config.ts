/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
  },
})
