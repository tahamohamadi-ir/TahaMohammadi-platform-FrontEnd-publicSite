import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it, vi } from 'vitest'
import Footer from '../Footer.astro'
import Header from '../Header.astro'
import LanguageToggle from '../LanguageToggle.astro'
import SkipLink from '../SkipLink.astro'
import { buildLanguageToggleHref } from '../../lib/navigation'

const shellState = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
  operational: { contact: {} } as Record<string, unknown>,
}))

vi.mock('../../lib/site-settings-content', () => ({
  fetchLocalizedSiteSettings: async () => shellState.settings,
  getManagedCopy: async () =>
    (shellState.settings?.contentCopy as Record<string, string>) ?? {},
  fetchPublicSiteSettings: async () => shellState.operational,
}))

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

function readRepositoryFile(relativePath: string) {
  const absolutePath = path.join(repositoryRoot, relativePath)
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true)
  return readFileSync(absolutePath, 'utf8')
}

async function renderComponent(
  component: Parameters<
    Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
  >[0],
  props: Record<string, unknown>,
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

describe('PUBLIC-150 behavior', () => {
  it('builds an equivalent-route alternate href only when the locale is available', () => {
    expect(buildLanguageToggleHref('en', 'about', true)).toBe('/fa/about/')
    expect(
      buildLanguageToggleHref('fa', 'blog/visual-discourse-elections', true),
    ).toBe('/en/blog/visual-discourse-elections/')
    expect(buildLanguageToggleHref('en', 'about', false)).toBeUndefined()
  })

  it('renders LanguageToggle with a real alternate link when available', async () => {
    const html = await renderComponent(LanguageToggle, {
      currentLocale: 'en',
      alternateHref: '/fa/about/',
      available: true,
    })

    expect(html).toMatch(/data-visual-id="LanguageToggle"/)
    expect(html).toMatch(
      /<a href="\/fa\/about\/"[^>]*lang="fa"[^>]*hreflang="fa"[^>]*>FA<\/a>/,
    )
    expect(html).toMatch(/aria-current="true"[^>]*>EN/)
    expect(html).not.toMatch(/href="\/fa\/"/)
  })

  it('renders LanguageToggle unavailable state without a fallback home link', async () => {
    const html = await renderComponent(LanguageToggle, {
      currentLocale: 'en',
      available: false,
    })

    expect(html).toMatch(/language-toggle__locale--unavailable/)
    expect(html).toMatch(/aria-disabled="true"/)
    expect(html).not.toMatch(/<a[^>]*href=/)
  })

  it('omits unnamed shell controls when localized settings are unavailable', async () => {
    const headerHtml = await renderComponent(Header, {
      locale: 'en',
      currentPath: '/en/',
      alternateAvailable: false,
    })
    const skipHtml = await renderComponent(SkipLink, { locale: 'en' })

    expect(headerHtml).not.toMatch(/site-header__brand/)
    expect(headerHtml).not.toMatch(/site-header__search-link/)
    expect(headerHtml).not.toMatch(/theme-toggle--shell/)
    expect(headerHtml).not.toMatch(/site-header__drawer/)
    expect(skipHtml).not.toMatch(/class="skip-link"/)
  })

  it('keeps Header wired to LanguageToggle and preserves skip-link continuity', async () => {
    shellState.settings = {
      locale: 'fa',
      brandName: 'نشان آزمایشی',
      tagline: '',
      navLinks: [],
      contentCopy: { 'skip.main': 'رفتن به محتوای اصلی' },
    }
    try {
      const headerHtml = await renderComponent(Header, {
        locale: 'fa',
        currentPath: '/fa/about/',
        alternateHref: '/en/about/',
        alternateAvailable: true,
      })
      expect(headerHtml).toMatch(/data-visual-id="Header"/)
      expect(headerHtml).toMatch(/data-visual-id="LanguageToggle"/)

      const skipHtml = await renderComponent(SkipLink, { locale: 'fa' })
      expect(skipHtml).toMatch(/class="skip-link"/)
      expect(skipHtml).toMatch(/href="#main-content"/)
      expect(skipHtml).toMatch(/>رفتن به محتوای اصلی</)
    } finally {
      shellState.settings = null
    }
  })

  it('names the Header brand link from published settings in both locales', async () => {
    try {
      shellState.settings = {
        locale: 'en',
        brandName: 'Edited brand EN',
        tagline: 'Edited role',
        navLinks: [],
        contentCopy: {},
      }
      const enHtml = await renderComponent(Header, {
        locale: 'en',
        currentPath: '/en/about/',
        alternateAvailable: false,
      })
      expect(enHtml).toMatch(
        /<a href="\/en\/" class="site-header__brand" aria-label="Edited brand EN">/,
      )
      expect(enHtml).not.toContain('Researcher · Engineer · Designer')

      shellState.settings = {
        locale: 'fa',
        brandName: 'نشان ویراسته',
        tagline: '',
        navLinks: [],
        contentCopy: {},
      }
      const faHtml = await renderComponent(Header, {
        locale: 'fa',
        currentPath: '/fa/about/',
        alternateAvailable: false,
      })
      expect(faHtml).toMatch(
        /<a href="\/fa\/" class="site-header__brand" aria-label="نشان ویراسته">/,
      )
    } finally {
      shellState.settings = null
    }
  })

  it('keeps the mobile drawer a native disclosure with managed toggle copy', async () => {
    const toggleByLocale = { en: 'Menu', fa: 'منو' } as const
    for (const locale of ['en', 'fa'] as const) {
      shellState.settings = {
        locale,
        brandName: 'Brand',
        tagline: '',
        navLinks: [{ label: 'Projects', href: `/${locale}/projects/` }],
        contentCopy: {
          'menu.main': toggleByLocale[locale],
          'menu.toggle': toggleByLocale[locale],
        },
      }
      const html = await renderComponent(Header, {
        locale,
        currentPath: `/${locale}/about/`,
        alternateAvailable: false,
      })
      expect(html).toMatch(/<details class="site-header__drawer">/)
      expect(html).toMatch(/<summary class="site-header__menu-trigger">/)
      expect(html).toContain(`>${toggleByLocale[locale]}<`)
      expect(html).toMatch(/site-header__nav--mobile/)
    }
    shellState.settings = null
  })

  it('renders Footer promo and nav from published settings without hardcoded chrome', async () => {
    const footerSource = readRepositoryFile('src/components/Footer.astro')
    expect(footerSource).not.toContain(
      "import ContactCTA from './ui/ContactCTA.astro'",
    )
    expect(footerSource).toContain("import Link from './ui/Link.astro'")
    expect(footerSource).not.toContain('site-footer__button')

    try {
      shellState.settings = {
        locale: 'en',
        brandName: 'Edited brand',
        tagline: 'Edited role',
        footerText: 'Edited bio',
        navLinks: [{ label: 'My work', href: '/en/projects/' }],
        audienceLinks: [],
        contentCopy: {
          'footer.cta': 'Work with me',
          'footer.explore': 'Explore',
          'footer.legal': 'Edited legal line',
        },
      }
      const compactHtml = await renderComponent(Footer, { locale: 'en' })
      expect(compactHtml).not.toMatch(/site-footer__promo/)
      expect(compactHtml).toMatch(/data-visual-id="Link"/)
      expect(compactHtml).toContain('My work')
      expect(compactHtml).toMatch(/site-footer__brand-bio/)
      expect(compactHtml).toContain('Edited bio')
      expect(compactHtml).toMatch(/site-footer__legal-row/)
      expect(compactHtml).not.toContain('pending CMS publication')

      const promoHtml = await renderComponent(Footer, {
        locale: 'en',
        hidePromo: false,
      })
      expect(promoHtml).toMatch(/site-footer__promo/)
      expect(promoHtml).toContain('Work with me')

      shellState.settings = null
      const emptyHtml = await renderComponent(Footer, { locale: 'en' })
      expect(emptyHtml).not.toMatch(/site-footer__promo/)
      expect(emptyHtml).not.toMatch(/site-footer__brand-bio/)
      expect(emptyHtml).not.toMatch(/site-footer__nav-list/)
    } finally {
      shellState.settings = null
    }
  })

  it('extracts shell styles with logical direction, theme parity hooks, and 44px targets', () => {
    const shell = readRepositoryFile('src/styles/shell.css')
    const siteLayout = readRepositoryFile('src/layouts/SiteLayout.astro')

    expect(siteLayout).toContain("import '../styles/shell.css'")
    expect(shell).toMatch(/html\[data-theme='light'\] \.site-header/)
    expect(shell).toMatch(/html\[data-theme='dark'\] \.site-footer/)
    expect(shell).toMatch(/inset-inline-start:/)
    expect(shell).toMatch(/margin-inline:/)
    expect(shell).toMatch(/min-height: var\(--layout-touch-target-min\)/)
    expect(shell).toMatch(/\.skip-link:focus/)
    expect(shell).toMatch(/\.site-header__nav-link:focus-visible/)
    expect(shell).toMatch(/\.site-main:focus/)
    expect(shell).toMatch(/outline: 2px solid var\(--color-focus\)/)
    expect(shell).not.toMatch(/\.site-main:focus[\s\S]*outline:\s*none/)
    expect(shell).not.toMatch(/\bleft:/)
    expect(shell).not.toMatch(/\bright:/)
    expect(shell).toMatch(/grid-template-columns: 1\.4fr 1fr 1fr 1fr/)
    expect(shell).toMatch(/var\(--gradient-section-surface-light\)/)
    expect(shell).toMatch(/site-footer__social-btn/)
  })
})
