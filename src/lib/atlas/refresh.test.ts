import { describe, expect, it, vi } from 'vitest'

import { ATLAS_CONTRACT_VERSION, type AtlasPayload } from './model'
import { refreshAtlas, type AtlasRefreshOutcome } from './refresh'

function basePayload(overrides: Partial<AtlasPayload> = {}): AtlasPayload {
  const version = {
    id: 12,
    revision: '12-2026-09-20T10:31:04.221000+00:00',
    publishedAt: '2026-09-20T10:31:04.221000+00:00',
    nodeCount: 2,
    relationCount: 1,
    layoutRevision: 7,
    ...(overrides.version ?? {}),
  }
  return {
    contractVersion: ATLAS_CONTRACT_VERSION,
    locale: 'en',
    version,
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
        hierarchy: false,
        weight: 1,
      },
    ],
    ...overrides,
    version,
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('refreshAtlas (Plan C Task 7)', () => {
  it('sends If-None-Match and keeps the snapshot on 304', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 304 }))
    const onAdopt = vi.fn()
    const onKeep = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '1-2026',
        etag: '"1-abc"',
        publishedAt: '2026-09-20T10:00:00.000Z',
        id: 1,
      },
      fetchFn,
      onAdopt,
      onKeep,
    })
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/atlas/en',
      expect.objectContaining({
        headers: expect.objectContaining({ 'If-None-Match': '"1-abc"' }),
      }),
    )
    expect(outcome).toBe('not-modified')
    expect(onAdopt).not.toHaveBeenCalled()
    expect(onKeep).toHaveBeenCalledWith('not-modified')
  })

  it('adopts a newer revision and preserves the selection when the key survives', async () => {
    const newer = basePayload({
      version: {
        id: 13,
        revision: '13-2026-09-21T00:00:00.000000+00:00',
        publishedAt: '2026-09-21T00:00:00.000Z',
        nodeCount: 2,
        relationCount: 1,
        layoutRevision: 8,
      },
    })
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(newer, { status: 200, headers: { ETag: '"13-etag"' } }),
      )
    const onAdopt = vi.fn()
    const onKeep = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '12-2026-09-20T10:31:04.221000+00:00',
        etag: '"12-etag"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      selectedKey: 'research-area-1a2b3c4d',
      fetchFn,
      onAdopt,
      onKeep,
    })
    expect(outcome).toBe('adopted')
    expect(onAdopt).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: newer,
        etag: '"13-etag"',
        selection: { key: 'research-area-1a2b3c4d', cleared: false },
      }),
    )
    expect(onKeep).not.toHaveBeenCalled()
  })

  it('clears the selection when the selected key disappeared', async () => {
    const newer = basePayload({
      version: {
        id: 13,
        revision: '13-2026-09-21T00:00:00.000000+00:00',
        publishedAt: '2026-09-21T00:00:00.000Z',
        nodeCount: 1,
        relationCount: 0,
        layoutRevision: 8,
      },
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
      groups: [],
    })
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(newer, { status: 200, headers: { ETag: '"13-etag"' } }),
      )
    const onAdopt = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'fa',
      embedded: {
        revision: '12-2026-09-20T10:31:04.221000+00:00',
        etag: '"12-etag"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      selectedKey: 'research-area-1a2b3c4d',
      fetchFn,
      onAdopt,
      onKeep: vi.fn(),
    })
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/atlas/fa',
      expect.objectContaining({
        headers: expect.objectContaining({ 'If-None-Match': '"12-etag"' }),
      }),
    )
    expect(outcome).toBe('adopted')
    expect(onAdopt).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: { key: null, cleared: true },
      }),
    )
  })

  it('keeps the snapshot when the payload is invalid or the request fails', async () => {
    const invalidPayload = {
      contractVersion: ATLAS_CONTRACT_VERSION,
      nodes: 'bad',
    }
    const cases: Array<{ fetchFn: typeof fetch; expectOutcome: RegExp }> = [
      {
        fetchFn: vi
          .fn()
          .mockResolvedValue(jsonResponse(invalidPayload, { status: 200 })),
        expectOutcome: /^kept-invalid$/,
      },
      {
        fetchFn: vi.fn().mockRejectedValue(new Error('offline')),
        expectOutcome: /^kept-error$/,
      },
    ]
    for (const { fetchFn, expectOutcome } of cases) {
      const onKeep = vi.fn()
      const outcome = await refreshAtlas({
        locale: 'en',
        embedded: {
          revision: '12-2026',
          etag: '"12"',
          publishedAt: '2026-09-20T10:31:04.221000+00:00',
          id: 12,
        },
        fetchFn,
        onAdopt: vi.fn(),
        onKeep,
      })
      expect(outcome).toMatch(expectOutcome)
      expect(onKeep).toHaveBeenCalledWith(
        outcome,
        outcome === 'kept-invalid'
          ? { rejection: 'nodes-not-array' }
          : undefined,
      )
    }
  })

  it('never adopts an unknown contract version', async () => {
    const unknown = {
      ...basePayload(),
      contractVersion: 'atlas99-9.9.9',
      version: {
        id: 99,
        revision: '99-future',
        publishedAt: '2099-01-01T00:00:00.000Z',
        nodeCount: 2,
        relationCount: 1,
        layoutRevision: 1,
      },
    }
    const onAdopt = vi.fn()
    const onKeep = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '12-2026',
        etag: '"12"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      fetchFn: vi
        .fn()
        .mockResolvedValue(jsonResponse(unknown, { status: 200 })),
      onAdopt,
      onKeep,
    })
    expect(outcome).toBe('kept-invalid')
    expect(onAdopt).not.toHaveBeenCalled()
    expect(onKeep).toHaveBeenCalledWith('kept-invalid', {
      rejection: 'unknown-contract',
    })
  })

  it('exposes the validator rejection code for data-atlas-refresh diagnostics', async () => {
    const onKeep = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '12-2026',
        etag: '"12"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      fetchFn: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { contractVersion: ATLAS_CONTRACT_VERSION, nodes: 'bad' },
            { status: 200 },
          ),
        ),
      onAdopt: vi.fn(),
      onKeep,
    })
    expect(outcome).toBe('kept-invalid')
    expect(onKeep).toHaveBeenCalledWith('kept-invalid', {
      rejection: 'nodes-not-array',
    })
  })

  it('keeps an equal or older version by (publishedAt, id) and never uses a client clock', async () => {
    const older = basePayload({
      version: {
        id: 11,
        revision: '11-older',
        publishedAt: '2026-09-19T00:00:00.000Z',
        nodeCount: 2,
        relationCount: 1,
        layoutRevision: 6,
      },
    })
    const onAdopt = vi.fn()
    const onKeep = vi.fn()
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '12-2026-09-20T10:31:04.221000+00:00',
        etag: '"12"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      fetchFn: vi.fn().mockResolvedValue(jsonResponse(older, { status: 200 })),
      onAdopt,
      onKeep,
    })
    expect(outcome).toBe('kept-older')
    expect(onAdopt).not.toHaveBeenCalled()
    expect(onKeep).toHaveBeenCalledWith('kept-older')
  })

  it('returns absent on 404 and never sends a reader identifier', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }))
    const outcome = await refreshAtlas({
      locale: 'en',
      embedded: {
        revision: '12-2026',
        etag: '"12"',
        publishedAt: '2026-09-20T10:31:04.221000+00:00',
        id: 12,
      },
      fetchFn,
      onAdopt: vi.fn(),
      onKeep: vi.fn(),
    })
    expect(outcome).toBe('absent')
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('If-None-Match')).toBe('"12"')
    expect(headers.get('Authorization')).toBeNull()
    expect(headers.get('Cookie')).toBeNull()
    expect(init.credentials === undefined || init.credentials === 'omit').toBe(
      true,
    )
  })
})

// Silence unused type import when outcomes are asserted as strings.
void 0 as unknown as AtlasRefreshOutcome
