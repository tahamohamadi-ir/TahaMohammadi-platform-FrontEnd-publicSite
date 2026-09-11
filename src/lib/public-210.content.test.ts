import { describe, expect, it } from 'vitest'

import {
  formatProjectAvailability,
  formatProjectType,
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

  it('humanizes machine availability values and drops negative states', () => {
    expect(
      formatProjectAvailability({
        code_availability: 'public',
        data_availability: 'not_available',
        demo_availability: 'not_applicable',
      } as Parameters<typeof formatProjectAvailability>[0]),
    ).toBe('Public')
    expect(
      formatProjectAvailability({
        code_availability: 'available_on_request',
        data_availability: 'restricted',
        demo_availability: 'none',
      } as Parameters<typeof formatProjectAvailability>[0]),
    ).toBe('On request · Restricted')
  })

  it('localizes project type tokens without raw enums', () => {
    expect(formatProjectType('ai', 'fa')).toBe('هوش مصنوعی')
    expect(formatProjectType('research')).toBe('Research')
    expect(formatProjectType('custom_kind')).toBe('Custom kind')
  })
})
