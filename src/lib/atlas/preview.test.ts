import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import { ATLAS_CONTRACT_VERSION, type AtlasPayload } from './model'
import { consumePreviewFragment, fetchPreviewSnapshot } from './preview'
import {
  applyPreviewPresentation,
  buildSharedAtlasBodyHtml,
} from './presentation'
import { buildAtlasIndexModel } from './snapshot'
import { LOCALES, LOCALE_INDEX_ROUTES as TsRoutes } from '../seo-route-registry'
import { LOCALE_INDEX_ROUTES as MjsRoutes } from '../../../scripts/seo-route-registry.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const previewSourcePath = join(here, 'preview.ts')

function payloadFixture(): AtlasPayload {
  return {
    contractVersion: ATLAS_CONTRACT_VERSION,
    locale: 'en',
    version: {
      id: 12,
      revision: '12-2026-09-20T10:31:04.221000+00:00',
      publishedAt: '2026-09-20T10:31:04.221000+00:00',
      nodeCount: 1,
      relationCount: 0,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'identity',
        label: 'Identity',
        semanticRole: 'identity',
        visualRole: 'identity',
        allowAsRoot: true,
        allowChildren: false,
        filterVisible: false,
      },
    ],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'identity-2b3c4d5e',
        type: 'identity',
        label: 'Taha Mohammadi',
        importance: 90,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    relations: [],
  }
}

describe('atlas draft preview (Plan C Task 8)', () => {
  it('reads the capability from the fragment and strips it before any fetch', () => {
    const replaceState = vi.fn()
    const capability = consumePreviewFragment(
      { replaceState } as unknown as History,
      {
        hash: '#token=cap.abc',
        pathname: '/en/atlas/preview/',
        search: '',
      } as Location,
    )
    expect(capability).toBe('cap.abc')
    expect(replaceState).toHaveBeenCalledWith(null, '', '/en/atlas/preview/')
  })

  it('strips a malformed or absent fragment to a clean preview URL and returns null', () => {
    const replaceState = vi.fn()
    expect(
      consumePreviewFragment(
        { replaceState } as unknown as History,
        {
          hash: '#token=',
          pathname: '/fa/atlas/preview/',
          search: '?x=1',
        } as Location,
      ),
    ).toBeNull()
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/fa/atlas/preview/?x=1',
    )
    replaceState.mockClear()
    expect(
      consumePreviewFragment(
        { replaceState } as unknown as History,
        {
          hash: '',
          pathname: '/en/atlas/preview/',
          search: '',
        } as Location,
      ),
    ).toBeNull()
    expect(replaceState).toHaveBeenCalledWith(null, '', '/en/atlas/preview/')
  })

  it('sends the capability only in the Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ ETag: '"p-1"' }),
      json: async () => payloadFixture(),
    })
    const result = await fetchPreviewSnapshot('fa', 'cap.abc', {
      fetch: fetchMock as unknown as typeof fetch,
      apiBase: 'https://example.test',
    })
    expect(result).toMatchObject({ state: 'ready', preview: true })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.test/api/atlas/preview?locale=fa')
    expect(url).not.toContain('cap.abc')
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer cap.abc')
    expect(init.credentials === undefined || init.credentials === 'omit').toBe(
      true,
    )
  })

  it('does not fetch when the capability is missing', async () => {
    const fetchMock = vi.fn()
    const result = await fetchPreviewSnapshot('en', null, {
      fetch: fetchMock as unknown as typeof fetch,
      apiBase: 'https://example.test',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      state: 'unavailable',
      preview: false,
      reason: 'missing_preview_token',
    })
  })

  it('falls back to the honest active framing when the capability is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'preview_forbidden' }),
    })
    expect(
      await fetchPreviewSnapshot('en', 'cap.expired', {
        fetch: fetchMock as unknown as typeof fetch,
        apiBase: 'https://example.test',
      }),
    ).toEqual({
      state: 'unavailable',
      preview: false,
      reason: 'preview_forbidden',
    })
  })

  it('keeps API failures honest without public Active Atlas fallback', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    expect(
      await fetchPreviewSnapshot('en', 'cap.abc', {
        fetch: fetchMock as unknown as typeof fetch,
        apiBase: 'https://example.test',
      }),
    ).toEqual({
      state: 'unavailable',
      preview: false,
      reason: 'preview_error',
    })
  })

  it('rejects an invalid payload with the Task-2 validator (no invented graph)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        contractVersion: ATLAS_CONTRACT_VERSION,
        nodes: 'bad',
      }),
    })
    expect(
      await fetchPreviewSnapshot('en', 'cap.abc', {
        fetch: fetchMock as unknown as typeof fetch,
        apiBase: 'https://example.test',
      }),
    ).toEqual({
      state: 'invalid',
      preview: false,
      reason: 'nodes-not-array',
    })
  })

  it('never persists the capability anywhere', () => {
    const source = readFileSync(previewSourcePath, 'utf8')
    for (const forbidden of [
      'localStorage',
      'sessionStorage',
      'document.cookie',
      'indexedDB',
      'sendBeacon',
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('never registers preview as an indexable locale route', () => {
    expect([...TsRoutes]).toContain('atlas')
    expect([...TsRoutes]).not.toContain('atlas/preview')
    expect([...MjsRoutes]).not.toContain('atlas/preview')
    expect([...MjsRoutes].sort()).toEqual([...TsRoutes].sort())
    expect([...LOCALES].sort()).toEqual(['en', 'fa'])
  })

  it('applies shared presentation markup after a successful preview fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ ETag: '"p-1"' }),
      json: async () => payloadFixture(),
    })
    const result = await fetchPreviewSnapshot('en', 'cap.abc', {
      fetch: fetchMock as unknown as typeof fetch,
      apiBase: 'https://example.test',
    })
    const body = { innerHTML: '<div data-content-state="empty">stale</div>' }
    const region = {
      dataset: {
        atlasPreview: 'false',
        atlasStatus: 'unavailable',
      } as Record<string, string | undefined>,
      querySelector(selector: string) {
        return selector === '[data-atlas-body]' ? body : null
      },
    }
    applyPreviewPresentation(region, 'en', result)
    expect(region.dataset.atlasPreview).toBe('true')
    expect(region.dataset.atlasStatus).toBe('ready')
    expect(body.innerHTML).toContain('data-atlas-node="identity-2b3c4d5e"')
    expect(body.innerHTML).toContain('id="atlas-payload"')
    expect(body.innerHTML).toContain('Taha Mohammadi')
    expect(body.innerHTML).not.toContain('data-content-state="empty"')
  })

  it('builds the same ready body markup used by AtlasPageContent', () => {
    const payload = {
      ...payloadFixture(),
      nodes: [
        {
          ...payloadFixture().nodes[0],
          label: 'Evil </script><script>',
        },
      ],
    }
    const html = buildSharedAtlasBodyHtml('en', {
      status: 'ready',
      payload,
      etag: '"x"',
      html: buildAtlasIndexModel(payload),
    })
    expect(html).toContain('data-atlas-node="identity-2b3c4d5e"')
    expect(html).toContain('id="atlas-payload"')
    expect(html).toContain('\\u003c')
    expect(html).not.toContain('</script><script>')
  })
})
