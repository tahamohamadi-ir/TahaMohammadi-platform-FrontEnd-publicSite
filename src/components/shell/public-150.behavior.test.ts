import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Footer from '../Footer.astro'
import Header from '../Header.astro'
import LanguageToggle from '../LanguageToggle.astro'
import SkipLink from '../SkipLink.astro'
import { buildLanguageToggleHref } from '../../lib/navigation'

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
      buildLanguageToggleHref('fa', 'writing/visual-discourse-elections', true),
    ).toBe('/en/writing/visual-discourse-elections/')
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

  it('keeps Header wired to LanguageToggle and preserves skip-link continuity', async () => {
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
  })

  it('consumes ContactCTA and Link primitives in Footer without custom button markup', async () => {
    const footerSource = readRepositoryFile('src/components/Footer.astro')
    expect(footerSource).toContain(
      "import ContactCTA from './ui/ContactCTA.astro'",
    )
    expect(footerSource).toContain("import Link from './ui/Link.astro'")
    expect(footerSource).not.toContain('site-footer__button')

    const compactHtml = await renderComponent(Footer, { locale: 'en' })
    expect(compactHtml).not.toMatch(/data-visual-id="ContactCTA"/)
    expect(compactHtml).toMatch(/data-visual-id="Link"/)
    expect(compactHtml).toContain('Resources')
    expect(compactHtml).toMatch(/site-footer__brand-bio/)
    expect(compactHtml).toMatch(/site-footer__legal-row/)
    expect(compactHtml).toMatch(/site-footer__social-btn/)
    expect(compactHtml).toMatch(/pending CMS publication/)
    expect(compactHtml).toMatch(/site-footer__contact-meta/)

    const promoHtml = await renderComponent(Footer, {
      locale: 'en',
      hidePromo: false,
    })
    expect(promoHtml).toMatch(/data-visual-id="ContactCTA"/)
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
