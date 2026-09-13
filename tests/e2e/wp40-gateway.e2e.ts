import { expect, test } from '@playwright/test'
import { GATEWAY_ATMOSPHERE_ASSETS } from '../../src/lib/media/project-mappings'
import { getPromotedAssetRecord } from '../../src/lib/media/promoted-media-registry'

test.describe('WP-40 gateway reconstruction', () => {
  test('WP-40 gateway: serves promoted theme media without any direct /media/ URL', async ({
    page,
  }) => {
    const mediaResponses: string[] = []
    page.on('response', (response) => {
      if (
        /\/media\/(art|brand|icons)\//.test(new URL(response.url()).pathname)
      ) {
        mediaResponses.push(response.url())
      }
    })

    await page.goto('/')
    const html = await page.content()

    expect(html).not.toMatch(/src="\/media\//)
    expect(html).not.toMatch(/srcset="[^"]*\/media\//)
    expect(mediaResponses).toEqual([])
  })

  test('WP-40 gateway: mounts exactly one portal-world theme variant on first load', async ({
    page,
  }) => {
    // Independent frozen contract (PW-1): the gateway atmosphere fallback is the
    // portal-world family. Written as literals rather than read back out of the
    // mapping under test, so a silent repoint to another family fails here.
    expect(GATEWAY_ATMOSPHERE_ASSETS).toEqual({
      light: 'portal-world-light',
      dark: 'portal-world-dark',
    })

    await page.addInitScript(() => localStorage.setItem('tm-theme', 'light'))
    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))

    await page.goto('/')
    // The mapped asset is what the page actually asks for.
    await expect
      .poll(() =>
        requested.some((url) => url.includes(GATEWAY_ATMOSPHERE_ASSETS.light)),
      )
      .toBe(true)

    for (const variant of [
      GATEWAY_ATMOSPHERE_ASSETS.light,
      GATEWAY_ATMOSPHERE_ASSETS.dark,
    ]) {
      const variantRequests = requested.filter((url) => url.includes(variant))
      expect(
        variantRequests.length,
        `${variant} download count`,
      ).toBeLessThanOrEqual(1)
    }

    // The superseded family must not be resurrected.
    expect(
      requested.filter((url) => /portal-centered-(light|dark)/.test(url)),
    ).toEqual([])

    const root = page.locator('[data-theme-picture]')
    await expect(root).toHaveAttribute('data-active-theme', 'light')
    await expect(root.locator('[data-theme-picture-mount] img')).toHaveCount(1)
  })

  test('WP-40 gateway: renders the accurate 1920x1080 source ratio for the atmosphere', async ({
    page,
  }) => {
    // Independent frozen contract (PW-1): 1920x1080 portal-world renders replaced
    // the 1672x941 portal-centered ones. Literal on purpose, so a registry
    // repoint cannot make this test agree with itself.
    const record = getPromotedAssetRecord(
      'portal-world-light',
      'gateway.atmosphere',
    )
    expect(record.intrinsic).toEqual({ width: 1920, height: 1080 })

    // Pin the theme instead of inheriting the system colour scheme, so the
    // assertion is deterministic in any environment.
    await page.addInitScript(() => localStorage.setItem('tm-theme', 'light'))
    await page.goto('/')

    const image = page.locator('[data-theme-picture-mount] img').first()
    // The rendered attributes must agree with the registry entry the pipeline
    // reads, so a broken attribute path is caught even when the values are right.
    await expect(image).toHaveAttribute('width', String(record.intrinsic.width))
    await expect(image).toHaveAttribute(
      'height',
      String(record.intrinsic.height),
    )
  })

  test('WP-40 gateway: keeps semantic language selection and a single accessible page name', async ({
    page,
  }) => {
    await page.goto('/')

    const headings = page.getByRole('heading', { level: 1 })
    await expect(headings).toHaveCount(1)
    await expect(headings.first()).toHaveAccessibleName(/Taha\s+Mohammadi/)

    const nav = page.getByRole('navigation', { name: 'Language selection' })
    await expect(nav.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/',
    )
    await expect(nav.getByRole('link', { name: 'فارسی' })).toHaveAttribute(
      'href',
      '/fa/',
    )
  })

  test('WP-40 gateway: keeps the gateway free of horizontal overflow with keyboard-visible focus', async ({
    page,
  }) => {
    await page.goto('/')
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-theme-toggle]')).toBeFocused()
    await expect(page.locator('[data-theme-toggle]')).toHaveCSS(
      'outline-style',
      'solid',
    )

    await page.getByRole('link', { name: 'English' }).focus()
    await expect(page.getByRole('link', { name: 'English' })).toHaveCSS(
      'outline-style',
      'solid',
    )
  })
})
