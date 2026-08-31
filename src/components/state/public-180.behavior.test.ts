import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import StateSheetSection from '../../atlas/sections/StateSheetSection.astro'
import ContentState from './ContentState.astro'

const componentPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ContentState.astro')

async function renderContentState(props: Record<string, unknown>) {
  const container = await AstroContainer.create()
  return container.renderToString(ContentState, { props })
}

describe('PUBLIC-180 shared content-state contract', () => {
  it('provides the shared ContentState component', async () => {
    const contentStateModule = await import('./ContentState.astro').catch(() => null)

    expect(contentStateModule).not.toBeNull()
  })

  it.each(['loading', 'empty', 'unavailable', 'error', 'untranslated', 'no-results'])(
    'renders the caller-owned copy for the %s state',
    async (state) => {
      const html = await renderContentState({
        id: `specimen-${state}`,
        state,
        title: `Approved ${state} title`,
        description: `Approved ${state} description`,
      })

      expect(html).toContain(`data-content-state="${state}"`)
      expect(html).toContain(`Approved ${state} title`)
      expect(html).toContain(`Approved ${state} description`)
    },
  )

  it('announces only transient loading and error states assertively', async () => {
    const loadingHtml = await renderContentState({
      id: 'loading-example',
      state: 'loading',
      title: 'Loading approved records',
    })
    const errorHtml = await renderContentState({
      id: 'error-example',
      state: 'error',
      title: 'Approved error copy',
    })
    const emptyHtml = await renderContentState({
      id: 'empty-example',
      state: 'empty',
      title: 'Approved empty copy',
    })

    expect(loadingHtml).toMatch(/role="status"/)
    expect(loadingHtml).toMatch(/aria-live="polite"/)
    expect(loadingHtml).toMatch(/aria-busy="true"/)
    expect(errorHtml).toMatch(/role="alert"/)
    expect(errorHtml).toMatch(/aria-live="assertive"/)
    expect(errorHtml).not.toMatch(/aria-busy=/)
    expect(emptyHtml).not.toMatch(/role="(?:status|alert)"/)
    expect(emptyHtml).not.toMatch(/aria-live=/)
    expect(emptyHtml).not.toMatch(/aria-busy=/)
  })

  it('renders a recovery link only when approved label and href are both supplied', async () => {
    const withAction = await renderContentState({
      id: 'error-with-action',
      state: 'error',
      title: 'Approved error copy',
      actionLabel: 'Try again',
      actionHref: '/en/?retry=1',
    })
    const withoutHref = await renderContentState({
      id: 'error-without-action',
      state: 'error',
      title: 'Approved error copy',
      actionLabel: 'Try again',
    })

    expect(withAction).toMatch(/<a href="\/en\/\?retry=1"/)
    expect(withAction).toContain('Try again')
    expect(withoutHref).not.toMatch(/<(?:a|button)\b/)
  })

  it('supports a level-four heading when embedded inside a content card', async () => {
    const html = await renderContentState({
      id: 'embedded-state',
      state: 'unavailable',
      title: 'Approved embedded state copy',
      headingLevel: 4,
    })

    expect(html).toMatch(/<h4[^>]*id="embedded-state-title"[^>]*>Approved embedded state copy<\/h4>/)
  })

  it('inherits document direction and uses logical properties for RTL/LTR parity', () => {
    const source = readFileSync(componentPath, 'utf8')

    expect(source).not.toMatch(/\bdir=/)
    expect(source).toMatch(/padding-inline:/)
    expect(source).toMatch(/border-inline-start:/)
    expect(source).not.toMatch(/\bleft:/)
    expect(source).not.toMatch(/\bright:/)
  })

  it('exposes every shared content state in the Atlas state sheet', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(StateSheetSection)

    for (const state of ['loading', 'empty', 'unavailable', 'error', 'untranslated', 'no-results']) {
      expect(html).toContain(`data-content-state="${state}"`)
    }
  })
})
