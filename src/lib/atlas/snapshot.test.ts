import { describe, expect, it, vi } from 'vitest'

import { fetchAtlasSnapshot } from './snapshot'

function validBody() {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 12,
      revision: '12-2026-09-20T10:31:04.221000+00:00',
      publishedAt: '2026-09-20T10:31:04.221000+00:00',
      nodeCount: 2,
      relationCount: 1,
      layoutRevision: 7,
    },
    nodeTypes: [
      {
        key: 'research-area',
        label: 'Research area',
        semanticRole: 'area',
        visualRole: 'domain',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: true,
      },
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
    relationTypes: [
      {
        key: 'research-focus',
        label: 'research focus',
        inverseLabel: 'research focus of',
        directed: true,
        hierarchyRole: false,
        visualPriority: 70,
      },
    ],
    groups: [
      {
        key: 'group-4f1a2b3c',
        label: 'Vision & language',
        description: '',
        nodeKeys: ['research-area-1a2b3c4d'],
      },
    ],
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
      {
        key: 'research-area-1a2b3c4d',
        type: 'research-area',
        label: 'PARS-SQL / VTD-Edge',
        importance: 80,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 41.882, y: 12.021, z: 6.5 },
      },
    ],
    relations: [
      {
        key: 'identity-2b3c4d5e~research-focus~research-area-1a2b3c4d',
        type: 'research-focus',
        source: 'identity-2b3c4d5e',
        target: 'research-area-1a2b3c4d',
        directed: true,
        weight: 1,
        hierarchy: false,
        inverseLabel: 'research focus of',
        explanation: null,
      },
    ],
  }
}

function jsonResponse(
  body: unknown,
  init: { status?: number; etag?: string } = {},
) {
  const headers = new Headers()
  if (init.etag) headers.set('ETag', init.etag)
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  })
}

describe('fetchAtlasSnapshot', () => {
  it('returns unavailable without fetching when no API is configured', async () => {
    const fetchFn = vi.fn()
    const snapshot = await fetchAtlasSnapshot('en', fetchFn, {
      canFetch: () => false,
    })
    // Production build without PUBLIC_API_BASE_URL is honest:
    // unavailable, and no fetch attempted.
    expect(snapshot).toEqual({ status: 'unavailable' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('maps 404 to unavailable', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 404 }))
    const snapshot = await fetchAtlasSnapshot('en', fetchFn, {
      canFetch: () => true,
    })
    expect(snapshot).toEqual({ status: 'unavailable' })
  })

  it('maps malformed payloads to invalid with the reason and no partial model', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ...validBody(), contractVersion: 'atlas02-2.0.0' }),
      )
    const snapshot = await fetchAtlasSnapshot('en', fetchFn, {
      canFetch: () => true,
    })
    expect(snapshot).toEqual({ status: 'invalid', reason: 'unknown-contract' })
    expect(snapshot).not.toHaveProperty('html')
    expect(snapshot).not.toHaveProperty('payload')
  })

  it('returns ready with the ETag and an index model covering every node and relation', async () => {
    const body = validBody()
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(body, { etag: '"12-abc"' }))
    const snapshot = await fetchAtlasSnapshot('en', fetchFn, {
      canFetch: () => true,
    })
    expect(snapshot.status).toBe('ready')
    if (snapshot.status !== 'ready') return
    expect(snapshot.etag).toBe('"12-abc"')
    expect(snapshot.payload).toBeDefined()
    expect(snapshot.html.nodes).toHaveLength(body.nodes.length)
    expect(snapshot.html.relations).toHaveLength(body.relations.length)
  })
})
