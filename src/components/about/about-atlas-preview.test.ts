/**
 * About Atlas preview contract (Plan D Task 7): ready renders the 2D
 * projection with per-node deep links + CTA; unavailable keeps the CTA
 * with an honest status; the component's module graph never touches
 * `src/lib/visual/**`.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import AboutAtlasPreview from './AboutAtlasPreview.astro'
import { makeSamplePayload } from '../../lib/atlas/sample-payload'

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create()
  return container.renderToString(AboutAtlasPreview as Component, { props })
}

describe('AboutAtlasPreview', () => {
  it('ready renders the projection, one deep link per node, and the CTA', async () => {
    const payload = makeSamplePayload()
    const html = await render({ locale: 'en', status: 'ready', payload })
    expect(html).toContain('data-atlas-2d')
    expect(html).not.toContain('<canvas')
    const links = html.match(/\/en\/atlas\/\?focus=node:/g) ?? []
    expect(links.length).toBe(payload.nodes.length)
    expect(links.length).toBeLessThanOrEqual(10)
    expect(links.length).toBeGreaterThanOrEqual(1)
    for (const node of payload.nodes.slice(0, 10)) {
      expect(html).toContain(`/en/atlas/?focus=node:${node.key}`)
    }
    expect(html).toContain('href="/en/atlas/"')
  })

  it('ready uses the fa locale for links and CTA', async () => {
    const payload = makeSamplePayload()
    const html = await render({ locale: 'fa', status: 'ready', payload })
    expect(html).toContain('/fa/atlas/?focus=node:')
    expect(html).not.toContain('/en/atlas/')
    expect(html).toContain('href="/fa/atlas/"')
  })

  it('unavailable keeps the CTA and reports status honestly', async () => {
    const html = await render({ locale: 'en', status: 'unavailable' })
    expect(html).toContain('data-about-atlas-preview="unavailable"')
    expect(html).toContain('role="status"')
    expect(html).toContain('href="/en/atlas/"')
    expect(html).not.toContain('data-atlas-2d')
  })

  it('imports no visual/scene module', async () => {
    const source = await (
      await import('node:fs/promises')
    ).readFile(new URL('./AboutAtlasPreview.astro', import.meta.url), 'utf8')
    expect(source).not.toMatch(/lib\/visual\//)
    expect(source).not.toMatch(/three/)
    expect(source).not.toContain('<canvas')
  })
})
