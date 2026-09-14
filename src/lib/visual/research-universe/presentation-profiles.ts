/**
 * RU-4B — Presentation profiles (semantic material language + placement).
 *
 * The FINAL visual direction is a procedural 3D relational topology: one shared
 * sphere geometry, and every difference between nodes comes from scale, material
 * profile, position, depth, label, graph semantics and interaction state. Nothing
 * here is a custom mesh, and nothing here is content.
 *
 * Architecturally this file is the PRESENTATION side of one boundary:
 *
 *   CONTENT / SEMANTICS   `lib/research-universe/*`  — published records, kinds,
 *                                                    levels, edges, labels.
 *   PRESENTATION          this file                  — role, colour, material
 *                                                    character, scale, variation.
 *
 * A published record is never renamed, re-typed or invented here. When the
 * published taxonomy does not match a design mock's conceptual taxonomy, the
 * nearest PRESENTATION role is chosen and the mismatch is reported — it is never
 * resolved by editing content (see the semantic-role table below).
 *
 * Materials are resolved from the SAME `ScenePalette` design tokens the rest of
 * the scene uses (`scene-contract.ts` → `--color-*` custom properties). No
 * arbitrary RGB literal lives in scene code.
 */

import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'

/**
 * The semantic material vocabulary. One profile per visual character, not per
 * record: several published records may share a profile, and one record always
 * maps to exactly one profile.
 *
 * The characters are presentation-only. `stone` is the neutral material every
 * unmapped domain falls back to, so a future published domain can never be
 * dropped by a missing mapping.
 */
export const RU_MATERIAL_PROFILES = [
  'identity',
  'human',
  'language',
  'data',
  'systems',
  'stone',
] as const

export type RuMaterialProfile = (typeof RU_MATERIAL_PROFILES)[number]

/**
 * Physically-based character per profile, for `THREE.MeshStandardMaterial`.
 *
 * The brief's direction is "carefully made physical object": matte ceramic, fine
 * mineral, satin enamel, soft stone. That is expressed as HIGH roughness and NO
 * metalness with a tiny emissive floor only where the material has to separate
 * from the background. It is deliberately NOT: lunar roughness with crater
 * variance, chrome, glass, neon, LED or hologram — every one of which is either
 * `metalness > 0.1`, `roughness < 0.4` or a large emissive term.
 *
 * `roughness` is the single micro-variation knob the brief allows ("use
 * restrained micro-roughness; texture variation must be subtle"). The characters
 * are spread across 0.74 … 0.90, which is legible up close and indistinguishable
 * from a planet surface at UI size — exactly the intended read.
 *
 * Only the four fields below are declared, because they are the four a
 * `MeshStandardMaterial` actually consumes. A field with no renderer side effect
 * would be documentation pretending to be implementation.
 */
export interface RuMaterialCharacter {
  /** Palette role this profile resolves its base colour from. */
  readonly colorRole: keyof ScenePalette
  readonly roughness: number
  readonly metalness: number
  /**
   * Emissive floor as a fraction of the profile colour. The scene multiplies
   * this by the theme's emissive budget, so the light theme (which needs no lift
   * off an ivory canvas) stays lower than the dark one.
   */
  readonly emissive: number
}

export const RU_PROFILE_CHARACTER: Readonly<
  Record<RuMaterialProfile, RuMaterialCharacter>
> = {
  // Identity: matte ceramic, the calmest and most present object.
  identity: {
    colorRole: 'brand',
    roughness: 0.78,
    metalness: 0,
    emissive: 0.3,
  },
  // Human / HCI: muted jade ceramic.
  human: {
    colorRole: 'brand',
    roughness: 0.82,
    metalness: 0,
    emissive: 0.24,
  },
  // Language / intelligent systems: restrained satin enamel.
  language: {
    colorRole: 'research',
    roughness: 0.74,
    metalness: 0,
    emissive: 0.22,
  },
  // Data / visualisation: cool stone / pearl grey ceramic.
  data: {
    colorRole: 'context',
    roughness: 0.88,
    metalness: 0,
    emissive: 0.2,
  },
  // Systems / impact: warm sand ceramic with the softest sheen.
  systems: {
    colorRole: 'signature',
    roughness: 0.84,
    metalness: 0,
    emissive: 0.18,
  },
  // Neutral stone: every unmapped published domain lands here.
  stone: {
    colorRole: 'ink',
    roughness: 0.9,
    metalness: 0,
    emissive: 0.14,
  },
} as const

/**
 * Normalise a published label for comparison.
 *
 * Covers the drift a CMS retype actually produces: dash variants (the published
 * vocabulary mixes them across locales), whitespace runs, case, and the
 * zero-width joiners / non-joiners Persian text uses. The live fa label for the
 * dashboard framework contains a ZWNJ (`U+200C`) that an editorial retype easily
 * drops, which would silently un-map the record and re-skin it as neutral stone —
 * so the zero-width class is stripped rather than trusted.
 *
 * Returning the normalised form is the ONLY transformation applied to a label;
 * nothing here ever produces a label for display.
 */
export function normalizeLabel(value: string): string {
  return (
    value
      .replace(/[\u2010-\u2015]/g, '-')
      // ZWSP, ZWNJ, ZWJ, BOM: formatting, never semantic content.
      .replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  )
}

/**
 * SEMANTIC ROLE TABLE — published node → presentation profile.
 *
 * Matching is by published LABEL, never by published id: ids are positional in
 * the published graph (`research-topic-1..3`, and `research-topic-4..6` in the
 * other locale), so a re-ordered CMS would silently re-skin the wrong domain.
 * Labels are the only semantic identifier the payload carries.
 *
 * Extending the universe for a new published domain is a ONE-ROW change here
 * (plus its profile above if it needs a new character) — no scene code, no
 * geometry and no backend record changes.
 */
export const RU_PROFILE_BY_LABEL: ReadonlyArray<{
  readonly labels: readonly string[]
  readonly profile: RuMaterialProfile
}> = [
  // "Taha Mohammadi" — actually resolved structurally by kind, listed for clarity.
  { labels: ['taha mohammadi', 'طه محمدی'], profile: 'identity' },
  // Design-science dashboard framework — the Human/HCI presentation role.
  // The fa label is written here with its published ZWNJ; `normalizeLabel`
  // strips the zero-width class, so an editorial retype without it still maps.
  {
    labels: [
      'story-driven dashboard design framework',
      'چارچوب طراحی داشبورد روایت‌محور',
    ],
    profile: 'human',
  },
  // PARS-SQL / VTD-Edge — Language / intelligent systems role.
  { labels: ['pars-sql / vtd-edge'], profile: 'language' },
  // Visual political communication — comparative visual discourse corpora.
  {
    labels: [
      'visual political communication research',
      'پژوهش ارتباطات سیاسی بصری',
    ],
    profile: 'data',
  },
] as const

/**
 * Kind → profile fallback for a published node whose label is unmapped.
 *
 * The anchor is structural (`identity`), and an unmapped main domain is neutral
 * (never mis-coloured into a role it did not earn). Levels 2–3 are deliberately
 * NOT given a coloured profile: they are the small markers of the progressive
 * disclosure pass, and the brief keeps them quiet.
 */
export function profileForKind(kind: UniverseNode['kind']): RuMaterialProfile {
  return kind === 'person' ? 'identity' : 'stone'
}

/**
 * Resolve the presentation profile for a published node.
 *
 * Label first (semantic), then kind (structural). Never throws, never returns
 * undefined: an unrecognised published record is still rendered.
 */
export function resolvePresentationProfile(
  node: Pick<UniverseNode, 'label' | 'kind'>,
): RuMaterialProfile {
  const label = normalizeLabel(node.label ?? '')
  if (label.length > 0) {
    for (const entry of RU_PROFILE_BY_LABEL) {
      if (
        entry.labels.some((candidate) => normalizeLabel(candidate) === label)
      ) {
        return entry.profile
      }
    }
  }
  return profileForKind(node.kind)
}

/**
 * Visual scale per profile, relative to the kind's radius authority
 * (`nodeRadiusFor` in `layout.ts`). Restrained on purpose — the brief allows
 * scale differences "within a restrained range" and forbids a giant nucleus.
 *
 * These values are not decorative. Together with `SCALE_VARIATION_AMPLITUDE`
 * they define the identity invariant the brief imposes (the anchor must present
 * at approximately 1.4–1.6× a main domain's diameter), and `layout.ts` exposes
 * `identityDiameterEnvelope()` which computes the WORST CASE of the whole system
 * from these numbers. The envelope is asserted in `presentation.test.ts`, so
 * editing this table cannot silently break the ratio: the test fails first.
 *
 * The three current domain profiles deliberately differ from each other
 * (0.99 / 1.01 / 1.03) so "primary nodes have different visual scale" is true
 * from the presentation tables rather than from hash noise alone.
 */
export const RU_PROFILE_SCALE: Readonly<Record<RuMaterialProfile, number>> = {
  identity: 1.03,
  human: 1.01,
  language: 0.99,
  data: 1.03,
  systems: 1,
  stone: 1,
} as const

/**
 * Deterministic per-node scale variation, in [1 - amplitude, 1 + amplitude].
 *
 * Rationale: "primary nodes should have different x distance, y distance, z
 * depth AND visual scale within a restrained range". Deriving it from the node
 * id keeps it stable across renders, across the two locales and across reloads,
 * and keeps it independent of content — no frontend code invents a research fact
 * to decide how large a node looks.
 *
 * Amplitude is small on purpose: the variation multiplies the profile scale, so
 * a large value would widen the identity envelope until the 1.4–1.6 requirement
 * could no longer be guaranteed (see `identityDiameterEnvelope()`).
 */
export const SCALE_VARIATION_AMPLITUDE = 0.02

/** FNV-1a → [0,1). Same derivation family as the layout's `hashToUnit`. */
function hashUnit(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) / 4294967296
}

export function scaleVariationFor(nodeId: string): number {
  const unit = hashUnit(`ru-presentation:${nodeId}`)
  return 1 + (unit * 2 - 1) * SCALE_VARIATION_AMPLITUDE
}

/**
 * The visual scale a node is presented at, before interaction state.
 *
 * The identity anchor is deliberately EXCLUDED from hash variation. It is a
 * single node with no siblings to be differentiated from, so a hash-derived size
 * for it would only add a second, arbitrary spread source to the identity
 * envelope without buying any visual information.
 */
export function visualScaleFor(
  node: Pick<UniverseNode, 'label' | 'kind' | 'id'>,
): number {
  const profile = resolvePresentationProfile(node)
  const profileScale = RU_PROFILE_SCALE[profile]
  if (profile === 'identity') return profileScale
  return profileScale * scaleVariationFor(node.id)
}

/**
 * Interaction response. Deliberately small: the brief caps hover at +2% and
 * selection at +3–4%, with no pulsing, no spin and no halo.
 */
export const RU_NODE_RESPONSE = {
  hoverScale: 1.02,
  selectScale: 1.04,
  dimmedScale: 0.94,
} as const

/**
 * How far unrelated nodes dim on selection. Expressed as a lerp toward the
 * canvas colour rather than an opacity change: real materials do not fade, they
 * lose contrast against their background.
 */
export const RU_DIM_LERP = 0.62

/**
 * A profile as the scene needs it: base colour already resolved from the design
 * tokens, and material parameters resolved for one theme's emissive budget.
 */
export interface RuResolvedProfile {
  readonly profile: RuMaterialProfile
  readonly color: string
  readonly roughness: number
  readonly metalness: number
  readonly emissive: number
}

/**
 * Resolve one profile against a palette and theme brightness.
 *
 * `emissiveLift` is the theme's emissive budget (0 = no emissive at all). It is
 * supplied by the theme module so a theme never changes which profile a node has
 * — only how strongly that profile's character is expressed.
 */
export function resolveProfileMaterial(
  profile: RuMaterialProfile,
  palette: ScenePalette,
  emissiveLift: number,
): RuResolvedProfile {
  const character = RU_PROFILE_CHARACTER[profile]
  const hex = palette[character.colorRole] ?? palette.brand ?? '#16b8a6'
  const lift = Number.isFinite(emissiveLift) ? Math.max(0, emissiveLift) : 0
  return {
    profile,
    color: hex,
    roughness: character.roughness,
    metalness: character.metalness,
    emissive: character.emissive * lift,
  }
}

/** Every profile resolved for one palette/theme — the scene's material registry. */
export function resolveProfileRegistry(
  palette: ScenePalette,
  emissiveLift: number,
): Readonly<Record<RuMaterialProfile, RuResolvedProfile>> {
  return Object.fromEntries(
    RU_MATERIAL_PROFILES.map((profile) => [
      profile,
      resolveProfileMaterial(profile, palette, emissiveLift),
    ]),
  ) as Readonly<Record<RuMaterialProfile, RuResolvedProfile>>
}
