import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Button from './Button.astro'
import FeaturedRecord from './FeaturedRecord.astro'
import Input from './Input.astro'
import LocalTabs from './LocalTabs.astro'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

function readComponentSource(name: string) {
  const relativePath = `src/components/ui/${name}.astro`
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

describe('PUBLIC-140 behavior', () => {
  it('renders LocalTabs as URL-backed nav links with active aria-current only', async () => {
    const html = await renderComponent(LocalTabs, {
      ariaLabel: 'Section navigation',
      activeId: 'overview',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          href: '/en/research?section=overview',
        },
        {
          id: 'methods',
          label: 'Methods',
          href: '/en/research?section=methods',
        },
      ],
    })

    expect(html).toMatch(/<nav[^>]*aria-label="Section navigation"/)
    expect(html).toMatch(/<ul class="ui-local-tabs__list"/)
    expect(html).toMatch(
      /<a href="\/en\/research\?section=overview"[^>]*class="ui-local-tabs__tab ui-local-tabs__tab--active"[^>]*aria-current="page"/,
    )
    expect(html).toMatch(
      /<a href="\/en\/research\?section=methods"[^>]*class="ui-local-tabs__tab"/,
    )
    expect(html).not.toMatch(
      /<a href="\/en\/research\?section=methods"[^>]*aria-current=/,
    )
    expect(html).not.toMatch(/role="tab(list)?"/)
    expect(html).not.toMatch(/aria-selected=/)
    expect(html).not.toMatch(/role="presentation"/)
  })

  it('keeps LocalTabs keyboard-focusable and RTL-safe via logical direction styles', () => {
    const source = readComponentSource('LocalTabs')
    expect(source).toMatch(/<a[\s\S]*href=\{item\.href\}/)
    expect(source).toMatch(/inset-inline:/)
    expect(source).toMatch(/padding-inline:/)
    expect(source).not.toMatch(/\bleft:/)
    expect(source).not.toMatch(/\bright:/)
  })

  it('marks Button disabled and loading states without enabling interaction', async () => {
    const disabledHtml = await renderComponent(Button, {
      label: 'Save draft',
      disabled: true,
    })
    expect(disabledHtml).toMatch(
      /<button[^>]*disabled[^>]*aria-disabled="true"/,
    )
    expect(disabledHtml).toMatch(/data-loading="false"/)

    const loadingHtml = await renderComponent(Button, {
      label: 'Publishing',
      loading: true,
    })
    expect(loadingHtml).toMatch(/<button[^>]*disabled[^>]*aria-disabled="true"/)
    expect(loadingHtml).toMatch(/aria-busy="true"/)
    expect(loadingHtml).toMatch(/data-loading="true"/)
    expect(loadingHtml).toMatch(/ui-button__spinner/)
  })

  it('associates Input label, hint, and error messaging for assistive tech', async () => {
    const html = await renderComponent(Input, {
      id: 'contact-email',
      label: 'Email address',
      name: 'email',
      hint: 'Use your institutional address.',
      error: 'Enter a valid email address.',
      type: 'email',
    })

    expect(html).toMatch(
      /<label[^>]*for="contact-email"[^>]*>Email address<\/label>/,
    )
    expect(html).toMatch(
      /<input[^>]*id="contact-email"[^>]*aria-invalid="true"/,
    )
    expect(html).toMatch(
      /aria-describedby="contact-email-hint contact-email-error"/,
    )
    expect(html).toMatch(
      /<p class="ui-input__hint" id="contact-email-hint"[^>]*>Use your institutional address\.<\/p>/,
    )
    expect(html).toMatch(
      /<p class="ui-input__error" id="contact-email-error" role="alert"[^>]*>Enter a valid email address\.<\/p>/,
    )
    expect(html).toMatch(/ui-input--error/)
  })

  it('omits FeaturedRecord output when the selection is inactive', async () => {
    const html = await renderComponent(FeaturedRecord, {
      title: 'Deferred highlight',
      summary: 'Hidden until approved.',
      inactive: true,
    })

    expect(html.trim()).toBe('')
  })

  it('keeps focus-visible parity on Button using the shared focus token contract', () => {
    const source = readComponentSource('Button')
    const foundation = readFileSync(
      path.join(repositoryRoot, 'src/styles/base.css'),
      'utf8',
    )

    expect(foundation).toMatch(
      /:where\(a, button, input, textarea, select, summary\):focus-visible/,
    )
    expect(foundation).toMatch(/outline: 2px solid var\(--color-focus\)/)
    expect(source).toMatch(
      /:hover:not\(:disabled\):not\(\[aria-disabled='true'\]\)/,
    )
    expect(source).not.toMatch(/outline:\s*none/)
  })
})
