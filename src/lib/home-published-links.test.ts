import { describe, expect, it } from 'vitest'

import {
  resolveFeaturedProjectHref,
  resolveFeaturedPublicationHref,
} from './home-published-links'

describe('home published link resolution', () => {
  it('returns project href only when slug is in the published set', () => {
    const published = new Set(['pars-sql-vtd-edge'])
    expect(
      resolveFeaturedProjectHref('en', 'pars-sql-vtd-edge', published),
    ).toBe('/en/projects/pars-sql-vtd-edge/')
    expect(
      resolveFeaturedProjectHref(
        'en',
        'organizational-dashboard-research',
        published,
      ),
    ).toBeUndefined()
    expect(
      resolveFeaturedProjectHref('fa', 'pars-sql-vtd-edge', published),
    ).toBe('/fa/projects/pars-sql-vtd-edge/')
  })

  it('returns publication href only when slug is in the published set', () => {
    const published = new Set(['visual-discourse-elections'])
    expect(
      resolveFeaturedPublicationHref(
        'en',
        'visual-discourse-elections',
        published,
      ),
    ).toBe('/en/writing/visual-discourse-elections/')
    expect(
      resolveFeaturedPublicationHref('en', 'vtd-edge-manuscript', published),
    ).toBeUndefined()
  })

  it('omits href for empty published sets', () => {
    const empty = new Set<string>()
    expect(
      resolveFeaturedProjectHref('en', 'pars-sql-vtd-edge', empty),
    ).toBeUndefined()
    expect(
      resolveFeaturedPublicationHref('en', 'visual-discourse-elections', empty),
    ).toBeUndefined()
  })
})
