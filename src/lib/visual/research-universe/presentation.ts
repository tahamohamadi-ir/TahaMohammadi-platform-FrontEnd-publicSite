/**
 * RU-4A — presentation mapping (graph records → authored Blender profiles).
 *
 * The GRAPH stays authoritative: nothing here changes topology, positions or
 * semantics. This registry only answers two questions:
 *
 *   1. which published record gets which authored profile, and
 *   2. how large/oriented that profile is presented in each scene.
 *
 * The presentation metadata lives in the FRONTEND on purpose — no Blender or
 * presentation field is ever written into a backend research record. A published
 * record with no authored profile keeps its procedural node, so no published
 * content can disappear because an asset mapping is missing.
 */

import type { UniverseNode } from '../../research-universe/model'
import { nodeRadiusFor } from './layout'
import type { RuAuthoredGroup } from './authored-assets'

export interface AuthoredProfile {
  readonly key: string
  readonly group: RuAuthoredGroup
  /** Published node kinds this profile accepts. */
  readonly kinds: readonly UniverseNode['kind'][]
  /**
   * Exact published labels. Labels are the only semantic identifier the published
   * graph carries (`id` is positional: `research-topic-1..3`), so a re-ordered CMS
   * cannot silently swap two authored domains.
   */
  readonly labels: readonly string[]
}

/** The four authored profiles this family ships. */
export const RU_AUTHORED_PROFILES: readonly AuthoredProfile[] = [
  {
    key: 'identity',
    group: 'CORE',
    kinds: ['person'],
    labels: [],
  },
  {
    key: 'pars-sql',
    group: 'DOMAIN_PARS_SQL',
    kinds: ['domain'],
    labels: ['PARS-SQL / VTD-Edge'],
  },
  {
    key: 'dashboard',
    group: 'DOMAIN_DASHBOARD',
    kinds: ['domain'],
    labels: ['Story-Driven Dashboard Design Framework'],
  },
  {
    key: 'visual-political',
    group: 'DOMAIN_VISUAL_POLITICAL',
    kinds: ['domain'],
    labels: ['Visual Political Communication Research'],
  },
] as const

/** Normalise a published label for comparison (case/space/typography drift). */
export function normalizeLabel(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Resolve the authored profile for a published node, or null.
 *
 * Label match first (semantic), then the identity kind (structural). Returning null
 * is a normal outcome: the caller renders the procedural node instead.
 */
export function resolveAuthoredProfile(
  node: Pick<UniverseNode, 'label' | 'kind'>,
): AuthoredProfile | null {
  const label = normalizeLabel(node.label ?? '')
  if (label.length > 0) {
    for (const profile of RU_AUTHORED_PROFILES) {
      if (profile.labels.some((entry) => normalizeLabel(entry) === label)) {
        return profile
      }
    }
  }
  for (const profile of RU_AUTHORED_PROFILES) {
    if (profile.labels.length === 0 && profile.kinds.includes(node.kind)) {
      return profile
    }
  }
  return null
}

/** Presentation scene for the scale constants (the two experiences differ). */
export type PresentationScene = 'home' | 'about'

/**
 * Canonical orientations, in degrees, art-directed per group.
 *
 * The authored silhouettes are asymmetric, so orientation is part of the design:
 * default rotations would show the weakest face of each object. Applied by the
 * scene modules when they place an authored clone.
 */
export const RU_CANONICAL_ROTATION: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  CORE: [0, 12, 0],
  DOMAIN_PARS_SQL: [0, -28, 0],
  DOMAIN_DASHBOARD: [0, 24, 0],
  DOMAIN_VISUAL_POLITICAL: [0, -16, 0],
}

/** Hover / selection response. No continuous spin, no permanent RAF. */
export const RU_NODE_RESPONSE = {
  hoverScale: 1.02,
  selectScale: 1.04,
  dimmedScale: 0.94,
} as const

/**
 * Scale for an authored group, in scene units.
 *
 * The scene already owns one radius authority (`nodeRadiusFor` in the layout), so
 * this reuses it instead of introducing a second scale system: the authored object
 * is scaled to the radius its procedural equivalent would have had, which keeps
 * `core > main domain > procedural subnode` true by construction and prevents an
 * authored diameter from being used blindly.
 *
 * @param kind      published node kind (decides the target radius)
 * @param weight    published node weight (layout uses it as a size factor)
 * @param authoredDiameter  measured GLB diameter for the group, in Blender units
 * @param boost     presentation boost (e.g. the About "selected" state)
 */
export function presentationScaleFor(
  kind: UniverseNode['kind'],
  weight: number,
  authoredDiameter: number,
  boost = 1,
): number {
  if (!(authoredDiameter > 0)) return 0
  const targetRadius = nodeRadiusFor(kind, weight) * boost
  return targetRadius / (authoredDiameter / 2)
}

/** Home keeps the guided scale; About is slightly airier and has a selection boost. */
export const RU_PRESENTATION_BOOST: Readonly<
  Record<
    PresentationScene,
    {
      readonly core: number
      readonly domain: number
      readonly selectedDomain: number
    }
  >
> = {
  home: { core: 1, domain: 1, selectedDomain: 1 },
  about: { core: 1, domain: 1.05, selectedDomain: 1.35 },
}

/**
 * Invariant the scale contract must always satisfy: the authored core presents
 * larger than an authored main domain, which presents larger than a procedural
 * subnode. Pure function so the invariant is unit-testable, not just asserted in
 * prose.
 */
export function presentationInvariantHolds(
  authoredDiameterByGroup: Readonly<Record<string, number>>,
): boolean {
  const core = authoredDiameterByGroup.CORE ?? 0
  const domain = authoredDiameterByGroup.DOMAIN_PARS_SQL ?? 0
  if (!(core > 0) || !(domain > 0)) return false
  const coreScale = presentationScaleFor('person', 1, core)
  const domainScale = presentationScaleFor('domain', 1, domain)
  const subnodeScale = presentationScaleFor('subdomain', 1, domain)
  const coreRadius = (core / 2) * coreScale
  const domainRadius = (domain / 2) * domainScale
  const subnodeRadius = (domain / 2) * subnodeScale
  return coreRadius > domainRadius && domainRadius > subnodeRadius
}
