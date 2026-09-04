import { describe, expect, it } from 'vitest'
import {
  CREATIVE_DETAIL_EMPTY_SHELL_SLUG,
  fetchCreativeDetail,
  isCreativeDetailEmptyShellSlug,
  listCreativeSlugs,
} from './creative-content'

describe('creative empty-shell route helpers', () => {
  it('recognizes the reserved empty-shell slug', () => {
    expect(
      isCreativeDetailEmptyShellSlug(CREATIVE_DETAIL_EMPTY_SHELL_SLUG),
    ).toBe(true)
    expect(isCreativeDetailEmptyShellSlug('ivory-forms')).toBe(false)
  })

  it('returns empty-shell status without calling CMS for the reserved slug', async () => {
    await expect(
      fetchCreativeDetail('en', CREATIVE_DETAIL_EMPTY_SHELL_SLUG),
    ).resolves.toEqual({ status: 'empty-shell' })
    await expect(
      fetchCreativeDetail('fa', CREATIVE_DETAIL_EMPTY_SHELL_SLUG),
    ).resolves.toEqual({ status: 'empty-shell' })
  })

  it('always includes empty-shell in static slug lists', async () => {
    const en = await listCreativeSlugs('en')
    const fa = await listCreativeSlugs('fa')
    expect(en).toContain(CREATIVE_DETAIL_EMPTY_SHELL_SLUG)
    expect(fa).toContain(CREATIVE_DETAIL_EMPTY_SHELL_SLUG)
  })
})
