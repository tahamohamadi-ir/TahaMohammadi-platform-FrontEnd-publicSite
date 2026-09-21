import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { validateAtlasPayload } from './validate'

function makeFixture(): AtlasPayload {
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
        summary: '…',
        accessibleLabel: '…',
        importance: 80,
        mobileOverviewPriority: 'featured',
        aliases: ['Persian text-to-SQL'],
        canonical: {
          family: 'researchtopic',
          id: '1',
          slug: 'pars-sql-vtd-edge',
          title: 'PARS-SQL / VTD-Edge',
          routeFamily: 'research',
          href: '/en/research/pars-sql-vtd-edge/',
        },
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

function reason(payload: unknown): string | null {
  const result = validateAtlasPayload(payload)
  return result.ok ? null : result.reason
}

function withRelation(
  payload: AtlasPayload,
  patch: Record<string, unknown>,
): AtlasPayload {
  return {
    ...payload,
    relations: [{ ...payload.relations[0], ...patch }],
  }
}

function withNode(
  payload: AtlasPayload,
  patch: Record<string, unknown>,
): AtlasPayload {
  return {
    ...payload,
    nodes: [
      payload.nodes[0],
      {
        ...payload.nodes[1],
        ...patch,
        position:
          ((patch as { position?: unknown }).position as never) ??
          payload.nodes[1].position,
      },
    ],
  }
}

function withGroup(
  payload: AtlasPayload,
  patch: Record<string, unknown>,
): AtlasPayload {
  return {
    ...payload,
    groups: [{ ...payload.groups[0], ...patch }],
  }
}

describe('validateAtlasPayload', () => {
  it('ignores an unknown contract version instead of guessing', () => {
    const payloadFixture = makeFixture()
    expect(
      validateAtlasPayload({
        ...payloadFixture,
        contractVersion: 'atlas02-2.0.0',
      }),
    ).toEqual({ ok: false, reason: 'unknown-contract' })
  })

  it('returns the payload unchanged on success', () => {
    const payloadFixture = makeFixture()
    const result = validateAtlasPayload(payloadFixture)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload).toBe(payloadFixture) // identity, never a copy
  })

  it('rejects duplicate keys and dangling relations', () => {
    const payloadFixture = makeFixture()
    expect(
      reason({
        ...payloadFixture,
        nodes: [...payloadFixture.nodes, payloadFixture.nodes[0]],
      }),
    ).toBe('duplicate-key')
    expect(
      reason(withRelation(payloadFixture, { target: 'does-not-exist' })),
    ).toBe('dangling-relation')
  })

  it('rejects a node whose type is missing from the catalog', () => {
    const payloadFixture = makeFixture()
    expect(reason({ ...payloadFixture, nodeTypes: [] })).toBe('unknown-type')
  })

  it('rejects non-finite coordinates and unknown group members', () => {
    const payloadFixture = makeFixture()
    expect(
      reason(
        withNode(payloadFixture, { position: { x: Number.NaN, y: 0, z: 0 } }),
      ),
    ).toBe('non-finite-coordinate')
    expect(reason(withGroup(payloadFixture, { nodeKeys: ['missing'] }))).toBe(
      'unknown-group-member',
    )
  })
})
