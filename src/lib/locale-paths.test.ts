import { describe, expect, it } from 'vitest'
import { LOCALES, localeStaticPaths } from './locale-paths'
import { brandedTitle } from './navigation'

describe('localeStaticPaths', () => {
  it('emits exactly en and fa for a page without other params', async () => {
    expect(await localeStaticPaths()).toEqual([
      { params: { locale: 'en' } },
      { params: { locale: 'fa' } },
    ])
    expect([...LOCALES]).toEqual(['en', 'fa'])
  })

  it('combines every locale with its own route params', async () => {
    const asked: string[] = []
    const paths = await localeStaticPaths(async (locale) => {
      asked.push(locale)
      return locale === 'en' ? [{ slug: 'a' }, { slug: 'b' }] : [{ slug: 'c' }]
    })
    expect(asked).toEqual(['en', 'fa'])
    expect(paths).toEqual([
      { params: { locale: 'en', slug: 'a' } },
      { params: { locale: 'en', slug: 'b' } },
      { params: { locale: 'fa', slug: 'c' } },
    ])
  })

  it('emits nothing for a locale with no records', async () => {
    const paths = await localeStaticPaths((locale) =>
      locale === 'fa' ? [] : [{ slug: 'only-en' }],
    )
    expect(paths).toEqual([{ params: { locale: 'en', slug: 'only-en' } }])
  })

  it('handles nested dynamic params', async () => {
    const paths = await localeStaticPaths(() => [
      { courseSlug: 'c', lessonSlug: 'l' },
    ])
    expect(paths[1]).toEqual({
      params: { locale: 'fa', courseSlug: 'c', lessonSlug: 'l' },
    })
  })
})

describe('brandedTitle', () => {
  it('uses the shell brand name per locale', () => {
    expect(brandedTitle('en', 'Blog')).toBe('Blog — Taha Mohammadi')
    expect(brandedTitle('fa', 'وبلاگ')).toBe('وبلاگ — طه محمدی')
  })

  it('keeps the long Persian spelling only when asked and only for fa', () => {
    expect(brandedTitle('fa', 'کتاب‌ها', 'legacy')).toBe('کتاب‌ها — طاها محمدی')
    expect(brandedTitle('en', 'Books', 'legacy')).toBe('Books — Taha Mohammadi')
  })

  it('keeps the English brand on Persian pages that always used it', () => {
    expect(brandedTitle('fa', 'تماس', 'latin')).toBe('تماس — Taha Mohammadi')
    expect(brandedTitle('en', 'Contact', 'latin')).toBe(
      'Contact — Taha Mohammadi',
    )
  })
})
