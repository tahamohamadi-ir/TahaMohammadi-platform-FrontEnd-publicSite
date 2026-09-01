import { describe, expect, it } from 'vitest'

import {
  formatProjectAvailability,
  getProjectsRouteTitle,
} from './projects-content'

describe('projects content helpers', () => {
  it('provides locale-specific route title', () => {
    expect(getProjectsRouteTitle('en')).toBe('Projects')
    expect(getProjectsRouteTitle('fa')).toBe('پروژه‌ها')
  })

  it('formats availability fields from API records', () => {
    expect(
      formatProjectAvailability({
        code_availability: 'Open source',
        data_availability: 'On request',
        demo_availability: 'Live demo',
      } as Parameters<typeof formatProjectAvailability>[0]),
    ).toBe('Open source · On request · Live demo')
  })
})
