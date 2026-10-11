import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import { revalidateAtlasRegion, resolveRevalidationTarget } from './revalidate'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'tests',
  'fixtures',
  'atlas',
)

function readPayload(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8'))
}

interface FakeBody {
  innerHTML: string
}

interface FakeRegion {
  attrs: Map<string, string>
  body: FakeBody
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  querySelector(selector: string): unknown
}

/** A region exactly as the static build emits it for a non-ready snapshot. */
function region(status: string, bodyHtml = ''): FakeRegion {
  const attrs = new Map<string, string>([
    ['data-atlas-region', ''],
    ['data-atlas-status', status],
    ['data-atlas-presentation', 'list'],
    ['data-atlas-locale', 'en'],
  ])
  const body: FakeBody = { innerHTML: bodyHtml }
  return {
    attrs,
    body,
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => {
      attrs.set(name, value)
    },
    removeAttribute: (name) => {
      attrs.delete(name)
    },
    querySelector: (selector) =>
      selector === '[data-atlas-body]' ? body : null,
  }
}

const SSR_UNAVAILABLE_BODY =
  '<div class="content-state content-state--empty" data-content-state="empty">' +
  '<h2>Atlas unavailable</h2>' +
  '<p>The Atlas has no published version right now.</p></div>'

function okResponse(body: unknown, etag: string | null = '"v1"'): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === 'ETag' ? etag : null) },
    json: async () => body,
  } as unknown as Response
}

describe('revalidateAtlasRegion — SSR unavailable/invalid recovery', () => {
  it('recovers an unavailable region to a rendered, validated Atlas', async () => {
    const payload = readPayload('en.json')
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi.fn().mockResolvedValue(okResponse(payload))

    const outcome = await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    expect(outcome.state).toBe('recovered')
    // The honest SSR state is replaced by a real, validated Atlas.
    expect(target.attrs.get('data-atlas-status')).toBe('ready')
    expect(target.attrs.get('data-atlas-contract')).toBe('atlas01-1.0.0')
    expect(target.attrs.get('data-atlas-revision')).toBe(
      (payload as { version: { revision: string } }).version.revision,
    )
    expect(target.body.innerHTML).not.toContain('data-content-state')
    // Rendered through the EXISTING shared presentation path.
    expect(target.body.innerHTML).toContain('data-atlas-nodes')
    expect(target.body.innerHTML).toContain('data-atlas-node=')
    expect(target.body.innerHTML).toContain('data-atlas-2d')
    expect(target.body.innerHTML).toContain('data-atlas-scene')
    expect(target.body.innerHTML).toContain('data-atlas-inspector')
    expect(target.body.innerHTML).toContain('id="atlas-payload"')
  })

  it('performs exactly one anonymous same-origin GET and no more', async () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi
      .fn()
      .mockResolvedValue(okResponse(readPayload('en.json')))

    await revalidateAtlasRegion(target as never, {
      locale: 'fa',
      fetchFn: fetchFn as never,
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/atlas/fa')
    // No credentials, no reader identifier, no token in the URL.
    expect(init.credentials).toBe('omit')
    const headers = (init.headers ?? {}) as Record<string, string>
    expect(headers.Accept).toBe('application/json')
    expect(Object.keys(headers)).not.toContain('Authorization')
    expect(headers).not.toHaveProperty('If-None-Match')
    expect(url).not.toContain('token')
    expect(url).not.toContain('#')
  })

  it('keeps the honest SSR state when the API has no published version', async () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
    })

    const outcome = await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    expect(outcome.state).toBe('kept-unavailable')
    expect(target.attrs.get('data-atlas-status')).toBe('unavailable')
    expect(target.body.innerHTML).toBe(SSR_UNAVAILABLE_BODY)
  })

  it('keeps the honest SSR state when the network fails', async () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'))

    const outcome = await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    expect(outcome.state).toBe('kept-error')
    expect(target.attrs.get('data-atlas-status')).toBe('unavailable')
    expect(target.body.innerHTML).toBe(SSR_UNAVAILABLE_BODY)
  })

  it('never reshapes an invalid payload into partial content', async () => {
    const target = region('invalid', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        okResponse({ contractVersion: 'atlas01-1.0.0', nodes: 'nope' }),
      )

    const outcome = await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    expect(outcome.state).toBe('kept-invalid')
    expect(target.attrs.get('data-atlas-status')).toBe('invalid')
    expect(target.body.innerHTML).toBe(SSR_UNAVAILABLE_BODY)
    expect(target.body.innerHTML).not.toContain('data-atlas-node=')
  })

  it('never fetches for an already-ready region', async () => {
    const target = region('ready', '<p>already rendered</p>')
    const fetchFn = vi.fn()

    const outcome = await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    expect(outcome.state).toBe('not-eligible')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('keeps accessibility: no tab stops, presentation stays aria-hidden', async () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const fetchFn = vi
      .fn()
      .mockResolvedValue(okResponse(readPayload('en.json')))

    await revalidateAtlasRegion(target as never, {
      locale: 'en',
      fetchFn: fetchFn as never,
    })

    const html = target.body.innerHTML
    // Presentation layers are never focusable.
    expect(html).not.toMatch(/tabindex/i)
    // The 2D projection is decorative and hidden from assistive tech.
    expect(html).toContain('aria-hidden="true"')
    // Every interactive fact is a native control, not a div with a handler.
    expect(html).toContain('<button')
    expect(html).toContain('<input')
    expect(html).not.toMatch(/<div[^>]*onclick/i)
  })
})

describe('resolveRevalidationTarget — runtime wiring', () => {
  it('selects an unavailable region and asks for revalidation', () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    const found = resolveRevalidationTarget({
      querySelector: () => target,
    })
    expect(found).not.toBeNull()
    expect(found?.needsRevalidation).toBe(true)
    expect(found?.locale).toBe('en')
  })

  it('selects an invalid region and asks for revalidation', () => {
    const target = region('invalid', SSR_UNAVAILABLE_BODY)
    const found = resolveRevalidationTarget({
      querySelector: () => target,
    })
    expect(found?.needsRevalidation).toBe(true)
  })

  it('selects a ready region but never revalidates it', () => {
    const target = region('ready', '<p>ready</p>')
    const found = resolveRevalidationTarget({
      querySelector: () => target,
    })
    expect(found).not.toBeNull()
    expect(found?.needsRevalidation).toBe(false)
  })

  it('reads the fa locale from the region contract', () => {
    const target = region('unavailable', SSR_UNAVAILABLE_BODY)
    target.attrs.set('data-atlas-locale', 'fa')
    const found = resolveRevalidationTarget({
      querySelector: () => target,
    })
    expect(found?.locale).toBe('fa')
  })

  it('returns null when the page has no Atlas region', () => {
    expect(resolveRevalidationTarget({ querySelector: () => null })).toBeNull()
  })
})

describe('atlas-runtime entry wiring (regression guard)', () => {
  const source = readFileSync(
    join(here, '..', '..', '..', 'scripts', 'atlas-runtime.ts'),
    'utf8',
  )

  it('no longer selects only ready regions (the production defect)', () => {
    expect(source).not.toContain(
      '[data-atlas-region][data-atlas-status="ready"]',
    )
    expect(source).toContain('resolveRevalidationTarget')
  })

  it('does not add a second renderer or new copy', () => {
    expect(source).toContain("from '../lib/visual/atlas/revalidate'")
    // Recovery must reuse the shared presentation path, not a local builder.
    expect(source).not.toContain('buildSharedAtlasBodyHtml')
  })
})
