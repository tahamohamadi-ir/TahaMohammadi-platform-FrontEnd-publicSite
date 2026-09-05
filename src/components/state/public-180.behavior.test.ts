import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ContentState from './ContentState.astro'
import { contentStateVariants } from './types'

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(
  component: Component,
  props: Record<string, unknown> = {},
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

const fixtureCopy = {
  en: {
    loading: {
      title: 'Loading records',
      message: 'Fetching the latest published items.',
    },
    empty: {
      title: 'No records yet',
      message: 'Nothing is published in this collection.',
      actionLabel: 'Browse home',
      actionHref: '/en/',
    },
    unavailable: {
      title: 'Section unavailable',
      message: 'This route is not published yet.',
    },
    error: {
      title: 'Request failed',
      message: 'Try again or return home.',
      actionLabel: 'Retry',
      actionHref: '/en/',
    },
    untranslated: {
      title: 'Translation unavailable',
      message: 'This page is not published in English.',
      alternateLabel: 'View Persian version',
      alternateHref: '/fa/blog/',
    },
    'no-results': {
      title: 'No matching results',
      message: 'Adjust filters or clear the query.',
      actionLabel: 'Clear filters',
      actionHref: '/en/blog/',
    },
  },
  fa: {
    loading: {
      title: 'در حال بارگذاری',
      message: 'در حال دریافت آخرین موارد منتشرشده.',
    },
    empty: {
      title: 'موردی ثبت نشده',
      message: 'در این مجموعه محتوای منتشرشده‌ای وجود ندارد.',
      actionLabel: 'بازگشت به خانه',
      actionHref: '/fa/',
    },
    unavailable: {
      title: 'بخش در دسترس نیست',
      message: 'این مسیر هنوز منتشر نشده است.',
    },
    error: {
      title: 'درخواست ناموفق بود',
      message: 'دوباره تلاش کنید یا به خانه برگردید.',
      actionLabel: 'تلاش مجدد',
      actionHref: '/fa/',
    },
    untranslated: {
      title: 'ترجمه در دسترس نیست',
      message: 'این صفحه به فارسی منتشر نشده است.',
      alternateLabel: 'مشاهده نسخه انگلیسی',
      alternateHref: '/en/blog/',
    },
    'no-results': {
      title: 'نتیجه‌ای یافت نشد',
      message: 'فیلترها را تغییر دهید یا جستجو را پاک کنید.',
      actionLabel: 'پاک کردن فیلترها',
      actionHref: '/fa/blog/',
    },
  },
} as const

describe('PUBLIC-180 content state matrix', () => {
  it('exports every matrix variant', () => {
    expect(contentStateVariants).toEqual([
      'loading',
      'empty',
      'unavailable',
      'error',
      'untranslated',
      'no-results',
    ])
  })

  for (const variant of contentStateVariants) {
    for (const locale of ['en', 'fa'] as const) {
      it(`renders ${variant} for ${locale} with caller-supplied copy`, async () => {
        const copy = fixtureCopy[locale][variant]
        const html = await render(ContentState, { variant, locale, ...copy })

        expect(html).toContain(copy.title)
        if ('message' in copy && copy.message) {
          expect(html).toContain(copy.message)
        }
        expect(html).toMatch(new RegExp(`data-state-variant="${variant}"`))
        expect(html).toMatch(/data-visual-id="ContentState"/)

        if (variant === 'loading') {
          expect(html).toMatch(/role="status"/)
          expect(html).toMatch(/aria-live="polite"/)
          expect(html).toMatch(/ui-content-state__spinner/)
        }

        if (variant === 'error') {
          expect(html).toMatch(/role="alert"/)
        }

        if (variant === 'untranslated') {
          expect(html).toContain(copy.alternateLabel)
          expect(html).toContain(copy.alternateHref)
        }

        if (variant === 'empty' || variant === 'no-results') {
          expect(html).toContain(copy.actionLabel)
          expect(html).toContain(copy.actionHref)
        }
      })
    }
  }

  it('requires alternate locale link for untranslated state', async () => {
    await expect(
      render(ContentState, {
        variant: 'untranslated',
        locale: 'en',
        title: 'Missing translation',
        message: 'No English copy.',
      }),
    ).rejects.toThrow(/alternateLabel and alternateHref/)
  })

  it('does not render decorative art placeholders', async () => {
    const html = await render(ContentState, {
      variant: 'empty',
      locale: 'en',
      ...fixtureCopy.en.empty,
    })
    expect(html).not.toMatch(/<img[\s>]/)
    expect(html).not.toMatch(/background-image:/)
  })
})
