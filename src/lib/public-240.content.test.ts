import { describe, expect, it } from 'vitest'

import {
  buildSearchPageHref,
  getSearchBundlePath,
  getSearchRouteTitle,
  parseSearchQuery,
  searchQueryParam,
} from './search-content'

describe('PUBLIC-240 search content helpers', () => {
  it('returns localized route title and bundle path', () => {
    expect(getSearchRouteTitle('en')).toBe('Search')
    expect(getSearchRouteTitle('fa')).toBe('جستجو')
    expect(getSearchBundlePath('en')).toBe('/pagefind/en')
    expect(getSearchBundlePath('fa')).toBe('/pagefind/fa')
  })

  it('builds addressable search URLs with the q query param', () => {
    expect(buildSearchPageHref('en')).toBe('/en/search/')
    expect(buildSearchPageHref('fa', 'ai')).toBe(
      `/fa/search/?${searchQueryParam}=ai`,
    )
    expect(parseSearchQuery(new URLSearchParams('q= trust'))).toBe('trust')
  })
})
