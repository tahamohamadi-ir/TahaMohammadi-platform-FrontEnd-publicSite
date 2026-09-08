import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../Header.astro'
import Footer from '../Footer.astro'

const state = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
}))
vi.mock('../../lib/site-settings-content', () => ({
  fetchLocalizedSiteSettings: async () => state.settings,
  getManagedCopy: async () => state.settings?.contentCopy ?? {},
  fetchPublicSiteSettings: async () => ({ contact: {} }),
}))

describe('CMS-controlled shell', () => {
  beforeEach(() => {
    state.settings = null
  })
  it('does not resurrect identity, biography or menu when settings are absent', async () => {
    const container = await AstroContainer.create()
    for (const component of [Header, Footer]) {
      const html = await container.renderToString(component, {
        props: { locale: 'en', currentPath: '/en/' },
      })
      expect(html).not.toContain('Taha Mohammadi')
      expect(html).not.toContain('TAHA MOHAMMADI')
      expect(html).not.toContain('Researcher · Engineer · Designer')
      expect(html).not.toContain('I work across software')
      expect(html).not.toContain('pending CMS publication')
    }
  })
  it('honors an explicitly empty published footer and real navigation edits', async () => {
    state.settings = {
      locale: 'en',
      brandName: 'Edited brand',
      tagline: '',
      footerText: '',
      navLinks: [{ label: 'My work', href: '/en/projects/' }],
      contentCopy: {},
    }
    const container = await AstroContainer.create()
    const html = await container.renderToString(Footer, {
      props: { locale: 'en' },
    })
    expect(html).toContain('Edited brand')
    expect(html).toContain('My work')
    expect(html).not.toContain('I work across software')
    expect(html).not.toContain('pending CMS publication')
  })

  it('keeps the approved structural navigation when published settings have no nav links', async () => {
    state.settings = {
      locale: 'en',
      brandName: 'Edited brand',
      tagline: '',
      navLinks: [],
      contentCopy: {},
    }
    const container = await AstroContainer.create()
    const html = await container.renderToString(Header, {
      props: { locale: 'en', currentPath: '/en/research/' },
    })

    expect(html).toContain('href="/en/about/"')
    expect(html).toContain('href="/en/research/"')
    expect(html).toContain('>Research<')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('site-header__drawer')
  })
})
