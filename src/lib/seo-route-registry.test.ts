import { describe, expect, it } from 'vitest'

import { LOCALES, LOCALE_INDEX_ROUTES as TsRoutes } from './seo-route-registry'
import { LOCALE_INDEX_ROUTES as MjsRoutes } from '../../scripts/seo-route-registry.mjs'

describe('atlas route registration (Plan C Task 5)', () => {
  it('lists atlas in the TypeScript index registry', () => {
    expect([...TsRoutes]).toContain('atlas')
  })

  it('lists atlas in the script index registry (same contract)', () => {
    expect([...MjsRoutes]).toContain('atlas')
    expect([...MjsRoutes].sort()).toEqual([...TsRoutes].sort())
  })

  it('covers both locales', () => {
    expect([...LOCALES].sort()).toEqual(['en', 'fa'])
  })
})
