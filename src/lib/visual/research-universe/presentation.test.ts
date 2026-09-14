/**
 * RU-4B — procedural final path: geometry reuse, material registry, scale response.
 *
 * What this file covers, and why each assertion is here rather than in a browser
 * suite: these are the properties that make the FINAL direction what it is —
 * one shared sphere, a deterministic profile registry, and an interaction
 * response that is a nudge rather than a spectacle. All of them are provable
 * without WebGL, a DOM or a canvas, so they run in the unit layer where a
 * regression is caught in seconds.
 *
 * The scene-level behaviour (scroll states, drag, selection, mobile containment)
 * stays covered by the RU browser suites.
 */

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'
import { UniverseLedger } from './dispose'
import { createUniverseMaterials, NODE_TIERS } from './materials'
import { createUniverseNodes } from './nodes'
import {
  RU_MATERIAL_PROFILES,
  RU_NODE_RESPONSE,
  RU_PROFILE_BY_LABEL,
  RU_PROFILE_CHARACTER,
  RU_PROFILE_SCALE,
  normalizeLabel,
  resolvePresentationProfile,
  resolveProfileRegistry,
  scaleVariationFor,
  visualScaleFor,
  type RuMaterialProfile,
} from './presentation-profiles'
import {
  disposeSharedSphereGeometry,
  sharedSphereGeometry,
  sharedSphereTriangles,
  SPHERE_SEGMENTS,
} from './spheres'
import { buildUniverseTheme } from './theme'
import { computeUniverseLayout } from './layout'

/** The published palette roles, as `scenePaletteFromCss` reads them. */
const PALETTE: ScenePalette = {
  canvas: '#071225',
  ink: '#f7f3ea',
  brand: '#16b8a6',
  signature: '#c89b3c',
  research: '#8b75dc',
  context: '#42a98c',
  surface: '#0b1630',
}

/**
 * The labels the live graph actually publishes, BOTH locales.
 *
 * Pinned here on purpose: this is the fixture the "no fabricated label" test
 * compares the mapping table against, so adding a label the CMS does not publish
 * fails the suite instead of silently inventing content.
 */
const PUBLISHED_LABELS = [
  'Taha Mohammadi',
  'طه محمدی',
  'PARS-SQL / VTD-Edge',
  'Story-Driven Dashboard Design Framework',
  'چارچوب طراحی داشبورد روایت‌محور',
  'Visual Political Communication Research',
  'پژوهش ارتباطات سیاسی بصری',
] as const

function darkTheme() {
  return buildUniverseTheme(PALETTE, 'dark')
}

/** A minimal ready-ish node, shaped exactly like the adapter's projection. */
function node(over: Partial<UniverseNode> & { id: string }): UniverseNode {
  return {
    label: 'Unlabelled record',
    accessibleLabel: 'Unlabelled record',
    type: 'research-topic',
    kind: 'domain',
    level: 1,
    classification: 'type-map',
    weight: 1,
    summary: null,
    colorRole: 'research',
    iconRole: 'disc',
    x: 0,
    y: -76,
    z: -8,
    layoutSource: 'api',
    related: [],
    ...over,
  }
}

describe('spheres — ONE shared sphere for every node', () => {
  it('hands out the same geometry object to every caller', () => {
    disposeSharedSphereGeometry()
    const first = sharedSphereGeometry()
    const second = sharedSphereGeometry()
    // Object identity, not equality: a per-node allocation would pass `toEqual`
    // but is exactly the regression this asserts against.
    expect(first).toBe(second)
    expect(first.name).toBe('ru-shared-sphere')
    disposeSharedSphereGeometry()
  })

  it('is a simple sphere at the declared segment count', () => {
    const geometry = sharedSphereGeometry()
    const [width, height] = SPHERE_SEGMENTS.primary
    expect(geometry.type).toBe('SphereGeometry')
    // SphereGeometry stores the segment counts on the instance; reading them back
    // proves the primitive is the one the contract names.
    expect((geometry as THREE.SphereGeometry).parameters.widthSegments).toBe(
      width,
    )
    expect((geometry as THREE.SphereGeometry).parameters.heightSegments).toBe(
      height,
    )
    // A sphere, not a crystal, a shell or a faceted instrument: the previous
    // generation's anchor used an IcosahedronGeometry for exactly that effect.
    expect(geometry.type).not.toBe('IcosahedronGeometry')
    expect(sharedSphereTriangles()).toBeGreaterThan(0)
  })

  it('the node layer draws with that same object, not a copy', () => {
    const ledger = new UniverseLedger()
    const theme = darkTheme()
    const materials = createUniverseMaterials(ledger, theme)
    const layout = computeUniverseLayout(
      [
        node({ id: 'identity', kind: 'person', level: 0, colorRole: 'brand' }),
        node({ id: 'research-topic-1' }),
      ],
      [
        {
          id: 'identity->research-topic-1:research-focus',
          source: 'identity',
          target: 'research-topic-1',
          relationType: 'research-focus',
          weight: 1,
          directed: true,
          explanation: null,
        },
      ],
    )
    const visuals = createUniverseNodes(ledger, theme, layout.nodes, materials)
    expect(visuals.geometry).toBe(sharedSphereGeometry())

    // Every batch mesh must reference it too — a batch that allocated its own
    // sphere would still be "a sphere" while breaking the reuse contract.
    let meshes = 0
    visuals.group.traverse((object) => {
      if (!(object instanceof THREE.InstancedMesh)) return
      meshes += 1
      expect(object.geometry).toBe(sharedSphereGeometry())
    })
    expect(meshes).toBeGreaterThan(0)
    ledger.dispose()
  })
})

describe('presentation — deterministic, token-driven material profiles', () => {
  it('exposes a character for every profile, with no celestial or chrome recipe', () => {
    for (const profile of RU_MATERIAL_PROFILES) {
      const character = RU_PROFILE_CHARACTER[profile]
      expect(character).toBeDefined()
      // The brief's material language is matte ceramic / fine mineral / satin
      // enamel / soft stone. Metalness is what turns any of those into chrome or
      // a glass ball, and low roughness is what turns them into a planet surface.
      expect(character.metalness).toBe(0)
      expect(character.roughness).toBeGreaterThanOrEqual(0.7)
      // A small emissive floor only; a large one is the neon / LED / hologram
      // reading the brief rejects outright.
      expect(character.emissive).toBeGreaterThan(0)
      expect(character.emissive).toBeLessThanOrEqual(0.3)
    }
  })

  it('resolves every profile from an EXISTING design token', () => {
    for (const profile of RU_MATERIAL_PROFILES) {
      const role = RU_PROFILE_CHARACTER[profile].colorRole
      expect(Object.keys(PALETTE)).toContain(role)
    }
    const resolved = resolveProfileRegistry(PALETTE, 0.34)
    for (const profile of RU_MATERIAL_PROFILES) {
      const entry = resolved[profile]
      // The colour is the palette value verbatim — no interpolation, no literal.
      expect(entry.color).toBe(PALETTE[RU_PROFILE_CHARACTER[profile].colorRole])
    }
  })

  it('maps the language profile to the existing `research` token, not a new one', () => {
    // Owner decision: no cobalt token is added. `research` is the existing
    // semantic role for research/inquiry, so the language profile uses it.
    expect(RU_PROFILE_CHARACTER.language.colorRole).toBe('research')
    expect(resolveProfileRegistry(PALETTE, 0.34).language.color).toBe(
      PALETTE.research,
    )
  })

  it('resolves the same profile for the same label, every call', () => {
    const labels = [
      'PARS-SQL / VTD-Edge',
      'Story-Driven Dashboard Design Framework',
      'Visual Political Communication Research',
    ]
    for (const label of labels) {
      const first = resolvePresentationProfile({ label, kind: 'domain' })
      const second = resolvePresentationProfile({ label, kind: 'domain' })
      expect(first).toBe(second)
    }
  })

  it('resolves EN and FA records of the same domain to the same role', () => {
    // The published payload numbers topics independently per locale
    // (research-topic-1..3 vs 4..6), so the mapping must key on the LABEL.
    const pairs: Array<[string, string]> = [
      [
        'Story-Driven Dashboard Design Framework',
        'چارچوب طراحی داشبورد روایت‌محور',
      ],
      ['Visual Political Communication Research', 'پژوهش ارتباطات سیاسی بصری'],
      ['PARS-SQL / VTD-Edge', 'PARS-SQL / VTD-Edge'],
      ['Taha Mohammadi', 'طه محمدی'],
    ]
    for (const [en, fa] of pairs) {
      const enProfile = resolvePresentationProfile({
        label: en,
        kind: 'domain',
      })
      const faProfile = resolvePresentationProfile({
        label: fa,
        kind: 'domain',
      })
      expect(faProfile).toBe(enProfile)
    }
  })

  it('never invents a published label', () => {
    // Every label the mapping table mentions must be a label the CMS publishes.
    // A new row referencing a non-published string fails here.
    const published = new Set(PUBLISHED_LABELS.map(normalizeLabel))
    for (const entry of RU_PROFILE_BY_LABEL) {
      for (const label of entry.labels) {
        expect(published.has(normalizeLabel(label))).toBe(true)
      }
    }
  })

  it('falls back to neutral stone for an unmapped domain instead of hiding it', () => {
    // A future published domain must still render: the mapping is an
    // enhancement, never a gate on content.
    expect(
      resolvePresentationProfile({
        label: 'Some Future Domain',
        kind: 'domain',
      }),
    ).toBe('stone')
    expect(resolvePresentationProfile({ label: '', kind: 'domain' })).toBe(
      'stone',
    )
    // …but the anchor is structural, so it never depends on a label either.
    expect(
      resolvePresentationProfile({ label: 'Anyone', kind: 'person' }),
    ).toBe('identity')
  })

  it('keeps every node inside the restrained scale range', () => {
    const ids = [
      'identity',
      'research-topic-1',
      'research-topic-2',
      'research-topic-3',
      'research-topic-4',
      'research-topic-5',
      'research-topic-6',
    ]
    for (const id of ids) {
      const variation = scaleVariationFor(id)
      expect(variation).toBeGreaterThanOrEqual(0.98)
      expect(variation).toBeLessThanOrEqual(1.02)
      // Deterministic per id: the same node is the same size on every render.
      expect(scaleVariationFor(id)).toBe(variation)
    }
    const scales = Object.values(RU_PROFILE_SCALE)
    expect(Math.max(...scales) - Math.min(...scales)).toBeLessThan(0.06)
  })

  it('presents the anchor larger than a domain and a domain larger than a marker', () => {
    const anchor = visualScaleFor({
      id: 'identity',
      label: 'Taha Mohammadi',
      kind: 'person',
    })
    const domain = visualScaleFor({
      id: 'research-topic-1',
      label: 'PARS-SQL / VTD-Edge',
      kind: 'domain',
    })
    const marker = visualScaleFor({
      id: 'topic-1-project-a',
      label: 'Some project',
      kind: 'project',
    })
    // The kind radius authority separates the tiers; the profile scale only ever
    // nudges within them.
    expect(anchor).toBeGreaterThan(domain)
    expect(domain).toBeGreaterThanOrEqual(marker)
  })
})

describe('nodes — interaction response is a nudge, never a spectacle', () => {
  function build() {
    const ledger = new UniverseLedger()
    const theme = darkTheme()
    const materials = createUniverseMaterials(ledger, theme)
    const layout = computeUniverseLayout(
      [
        node({ id: 'identity', kind: 'person', level: 0, colorRole: 'brand' }),
        node({
          id: 'research-topic-1',
          colorRole: 'research',
          label: 'PARS-SQL / VTD-Edge',
        }),
        node({
          id: 'research-topic-2',
          colorRole: 'signature',
          label: 'Story-Driven Dashboard Design Framework',
        }),
      ],
      [
        {
          id: 'e1',
          source: 'identity',
          target: 'research-topic-1',
          relationType: 'research-focus',
          weight: 1,
          directed: true,
          explanation: null,
        },
        {
          id: 'e2',
          source: 'identity',
          target: 'research-topic-2',
          relationType: 'research-focus',
          weight: 1,
          directed: true,
          explanation: null,
        },
      ],
    )
    const visuals = createUniverseNodes(ledger, theme, layout.nodes, materials)
    return { ledger, visuals, layout }
  }

  /** Instance scale actually written for a node id. */
  function instanceScale(
    visuals: ReturnType<typeof build>['visuals'],
    id: string,
  ): number {
    const visual = visuals.visuals.find((entry) => entry.id === id)
    expect(visual).toBeDefined()
    if (!visual) return 0
    let found: number | null = null
    visuals.group.traverse((object) => {
      if (found != null || !(object instanceof THREE.InstancedMesh)) return
      if (!object.name.endsWith(visual.profile)) return
      const matrix = new THREE.Matrix4()
      object.getMatrixAt(visual.instance, matrix)
      found = new THREE.Vector3().setFromMatrixScale(matrix).x
    })
    expect(found).not.toBeNull()
    return found ?? 0
  }

  it('applies normal, hover, selected and dimmed scales from one constant set', () => {
    const { visuals, ledger } = build()
    const id = 'research-topic-1'
    const visual = visuals.visuals.find((entry) => entry.id === id)!
    const base = visual.baseRadius

    visuals.setEmphasis({
      selectedId: null,
      incidentIds: null,
      selectedEdge: null,
    })
    const normal = instanceScale(visuals, id)
    expect(normal).toBeCloseTo(base, 4)

    visuals.setEmphasis({
      selectedId: null,
      incidentIds: null,
      selectedEdge: null,
      hoveredId: id,
    })
    const hovered = instanceScale(visuals, id)
    expect(hovered / base).toBeCloseTo(RU_NODE_RESPONSE.hoverScale, 4)

    // Selecting the OTHER domain dims this one.
    visuals.setEmphasis({
      selectedId: 'research-topic-2',
      incidentIds: new Set(['research-topic-2', 'identity']),
      selectedEdge: null,
    })
    const dimmed = instanceScale(visuals, id)
    expect(dimmed / base).toBeCloseTo(RU_NODE_RESPONSE.dimmedScale, 4)

    // Selecting it brings the +3–4% response, not the retired 1.3x.
    visuals.setEmphasis({
      selectedId: id,
      incidentIds: new Set([id, 'identity']),
      selectedEdge: null,
    })
    const selected = instanceScale(visuals, id)
    expect(selected / base).toBeCloseTo(RU_NODE_RESPONSE.selectScale, 4)
    // The whole response band stays inside the brief's ceiling.
    expect(RU_NODE_RESPONSE.selectScale).toBeLessThanOrEqual(1.05)
    expect(RU_NODE_RESPONSE.hoverScale).toBeLessThanOrEqual(1.025)
    expect(RU_NODE_RESPONSE.dimmedScale).toBeGreaterThanOrEqual(0.9)

    ledger.dispose()
  })

  it('never instances the anchor, and never drops it from the records', () => {
    const { visuals, ledger } = build()
    // One visible identity: the dedicated central sphere owns the anchor, so it
    // must not also exist as a generic instance.
    expect(visuals.anchorVisuals.map((entry) => entry.id)).toEqual(['identity'])
    expect(visuals.visuals.some((entry) => entry.id === 'identity')).toBe(false)
    // …while every published node still has exactly one record.
    expect(visuals.anchorVisuals.length + visuals.visuals.length).toBe(3)
    ledger.dispose()
  })

  it('batches by tier and profile so each profile keeps its own material', () => {
    const { visuals, ledger } = build()
    // Two published domains resolve to two different profiles; a single batch per
    // tier would have forced them through one material and one roughness.
    expect(Object.keys(visuals.batches).length).toBeGreaterThanOrEqual(2)
    for (const key of Object.keys(visuals.batches)) {
      const [tier, profile] = key.split(':')
      expect(NODE_TIERS).toContain(tier)
      expect(RU_MATERIAL_PROFILES).toContain(profile as RuMaterialProfile)
    }
    ledger.dispose()
  })
})
