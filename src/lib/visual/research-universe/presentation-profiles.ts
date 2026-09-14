/**
 * RU-4B / RU-4C — Presentation profiles (semantic material language + placement).
 *
 * The direction is a small 3D network of related ideas: one shared sphere
 * geometry, and every difference between nodes comes from scale, material
 * profile, position, depth, label, graph semantics and interaction state.
 *
 * Architecturally this file is the PRESENTATION side of one boundary:
 *
 *   CONTENT / SEMANTICS   `lib/research-universe/*`  — published records, kinds,
 *                                                    levels, edges, labels.
 *   PRESENTATION          this file                  — role, colour, material
 *                                                    character, scale, variation.
 *
 * A published record is never renamed, re-typed or invented here.
 *
 * RU-4C refined the material art direction only; no profile was added or
 * removed, and no new colour token was introduced. Each profile resolves from an
 * EXISTING `--color-*` role and then MINERALISES it: a small mix toward a
 * neutral role that removes the saturated "UI colour" cast. That is a material
 * treatment, not a new palette entry.
 */

import type { ScenePalette } from '../scene-contract'
import type { UniverseNode } from '../../research-universe/model'

export const RU_MATERIAL_PROFILES = [
  'identity',
  'human',
  'language',
  'data',
  'systems',
  'stone',
] as const

export type RuMaterialProfile = (typeof RU_MATERIAL_PROFILES)[number]

/** Which neutral a profile's colour is mineralised toward, per theme. */
export interface RuMineralMix {
  /** Role to mix toward. */
  readonly toward: keyof ScenePalette
  /** Mix amount in the dark theme (0…1). */
  readonly dark: number
  /** Mix amount in the light theme (0…1). */
  readonly light: number
}

/**
 * Physically-based character per profile, for `THREE.MeshStandardMaterial`.
 *
 * The direction is "carefully made physical object": matte mineral, ceramic,
 * subtly tactile, low-gloss, quiet. Expressed as HIGH roughness, ZERO metalness
 * and only a fractional emissive term. Deliberately NOT: glossy planet,
 * chrome, glass, strong emissive glow, perfect plastic or clay/pastel toy —
 * every one of which is a low roughness, a non-zero metalness, or a large
 * emissive contribution.
 *
 * `roughness` sits in a band that produces a BROAD soft highlight rather than a
 * tight specular dot (0.70 … 0.88). Below ~0.6 the sphere starts to read as
 * polished/glazed; above ~0.92 it flattens into unlit clay.
 *
 * `emissive` is now a very low term everywhere: the brief wants "very low or zero
 * visible emissive feel", so even the identity barely lifts off the canvas.
 */
export interface RuMaterialCharacter {
  /** Palette role this profile resolves its base colour from. */
  readonly colorRole: keyof ScenePalette
  readonly roughness: number
  readonly metalness: number
  /**
   * Emissive floor as a fraction of the profile colour, multiplied by the
   * theme's emissive budget.
   */
  readonly emissive: number
  /** How the token colour is mineralised for this profile. */
  readonly mix?: RuMineralMix
}

export const RU_PROFILE_CHARACTER: Readonly<
  Record<RuMaterialProfile, RuMaterialCharacter>
> = {
  // Identity — deep mineral teal / petrol. Perceptually the centre, so it is the
  // largest node and the only one with a noticeably deeper, richer body colour.
  identity: {
    colorRole: 'brand',
    roughness: 0.7,
    metalness: 0,
    emissive: 0.1,
    // Dark: pull the bright turquoise token down toward the night canvas until it
    // reads as deep petrol rather than UI accent. Light: a touch of ink so the
    // teal stays restrained on ivory instead of glowing.
    mix: { toward: 'canvas', dark: 0.32, light: 0.16 },
  },
  // Human / HCI — muted ochre / aged brass / warm mineral.
  human: {
    colorRole: 'signature',
    roughness: 0.78,
    metalness: 0,
    emissive: 0.1,
    // Not metallic gold, not muddy brown: the champagne token softened toward the
    // canvas/surface neutral keeps it a warm mineral.
    mix: { toward: 'canvas', dark: 0.22, light: 0.24 },
  },
  // Language / intelligent systems — restrained, academic, less UI purple.
  language: {
    colorRole: 'research',
    roughness: 0.8,
    metalness: 0,
    emissive: 0.12,
    // The research token is the most saturated UI colour in the palette; mixing
    // it toward neutral is what makes it read as mineral rather than product UI.
    mix: { toward: 'canvas', dark: 0.26, light: 0.3 },
  },
  // Data / visualisation — restrained emerald, slightly desaturated.
  data: {
    colorRole: 'context',
    roughness: 0.84,
    metalness: 0,
    emissive: 0.08,
    mix: { toward: 'canvas', dark: 0.16, light: 0.2 },
  },
  // Systems / impact — soft stone.
  systems: {
    colorRole: 'signature',
    roughness: 0.82,
    metalness: 0,
    emissive: 0.08,
    mix: { toward: 'canvas', dark: 0.3, light: 0.32 },
  },
  // Neutral stone: every unmapped published domain lands here.
  stone: {
    colorRole: 'ink',
    roughness: 0.88,
    metalness: 0,
    emissive: 0.06,
  },
} as const

/**
 * Normalise a published label for comparison.
 *
 * Covers the drift a CMS retype actually produces: dash variants, whitespace
 * runs, case, and the zero-width joiners / non-joiners Persian text uses (the
 * live fa dashboard label carries a ZWNJ that an editorial retype easily drops,
 * which would silently un-map the record).
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
 * the published graph (`research-topic-1..3`, `research-topic-4..6` in the other
 * locale), so a re-ordered CMS would silently re-skin the wrong domain.
 *
 * Extending the universe for a new published domain is a ONE-ROW change here.
 */
export const RU_PROFILE_BY_LABEL: ReadonlyArray<{
  readonly labels: readonly string[]
  readonly profile: RuMaterialProfile
}> = [
  { labels: ['taha mohammadi', 'طه محمدی'], profile: 'identity' },
  // Design-science dashboard framework — warm mineral / aged brass.
  {
    labels: [
      'story-driven dashboard design framework',
      'چارچوب طراحی داشبورد روایت‌محور',
    ],
    profile: 'human',
  },
  // PARS-SQL / VTD-Edge — language / intelligent systems.
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
 * The anchor is structural (`identity`); an unmapped main domain is neutral.
 * Levels 2–3 are deliberately NOT given a coloured profile: they are the quiet
 * markers of the progressive-disclosure pass.
 */
export function profileForKind(kind: UniverseNode['kind']): RuMaterialProfile {
  return kind === 'person' ? 'identity' : 'stone'
}

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
 * (`nodeRadiusFor` in `layout.ts`).
 *
 * These values define the identity invariant the brief imposes (the anchor must
 * present at approximately 1.4–1.6× a main domain's diameter) and `layout.ts`
 * exposes `identityDiameterEnvelope()`, which computes the WORST CASE of the
 * whole system. The envelope is asserted in `presentation.test.ts`, so editing
 * this table cannot silently break the ratio.
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
 * Derived from the node id, so it is stable across renders, locales and reloads,
 * and independent of content. Amplitude is small: it multiplies the profile
 * scale, so a large value would widen the identity envelope past 1.6.
 */
export const SCALE_VARIATION_AMPLITUDE = 0.02

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
 * The identity anchor is EXCLUDED from hash variation: it is a single node with
 * no siblings to be differentiated from, so a hash-derived size would only add a
 * second, arbitrary spread source to the identity envelope.
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
 * Interaction response. Small on purpose: the brief caps hover at +2% and
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
 * A profile as the scene needs it: colour already resolved from the design
 * tokens and mineralised for the active theme.
 */
export interface RuResolvedProfile {
  readonly profile: RuMaterialProfile
  readonly color: string
  readonly roughness: number
  readonly metalness: number
  readonly emissive: number
}

/** Mix a hex colour toward another hex colour by `amount` (0…1). */
export function mixHex(from: string, to: string, amount: number): string {
  const clamp = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)
  const a = clamp(amount)
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.trim().replace('#', '')
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean
    const int = Number.parseInt(full.slice(0, 6), 16)
    if (!Number.isFinite(int)) return [0, 0, 0]
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  }
  const toHex = (value: number) =>
    Math.round(clamp(value / 255) * 255)
      .toString(16)
      .padStart(2, '0')
  const [r1, g1, b1] = parse(from)
  const [r2, g2, b2] = parse(to)
  return `#${toHex(r1 + (r2 - r1) * a)}${toHex(g1 + (g2 - g1) * a)}${toHex(
    b1 + (b2 - b1) * a,
  )}`
}

/**
 * Resolve one profile against a palette, theme brightness and theme mode.
 *
 * `emissiveLift` is the theme's emissive budget (0 = no emissive at all). It is
 * supplied by the theme module so a theme never changes which profile a node has
 * — only how strongly that profile's character is expressed.
 */
export function resolveProfileMaterial(
  profile: RuMaterialProfile,
  palette: ScenePalette,
  emissiveLift: number,
  mode: 'light' | 'dark' = 'dark',
): RuResolvedProfile {
  const character = RU_PROFILE_CHARACTER[profile]
  const base = palette[character.colorRole] ?? palette.brand ?? '#16b8a6'
  const neutralMix = character.mix
  const color = neutralMix
    ? mixHex(
        base,
        palette[neutralMix.toward] ?? palette.canvas ?? '#071225',
        mode === 'dark' ? neutralMix.dark : neutralMix.light,
      )
    : base
  const lift = Number.isFinite(emissiveLift) ? Math.max(0, emissiveLift) : 0
  return {
    profile,
    color,
    roughness: character.roughness,
    metalness: character.metalness,
    emissive: character.emissive * lift,
  }
}

/** Every profile resolved for one palette/theme — the scene's material registry. */
export function resolveProfileRegistry(
  palette: ScenePalette,
  emissiveLift: number,
  mode: 'light' | 'dark' = 'dark',
): Readonly<Record<RuMaterialProfile, RuResolvedProfile>> {
  return Object.fromEntries(
    RU_MATERIAL_PROFILES.map((profile) => [
      profile,
      resolveProfileMaterial(profile, palette, emissiveLift, mode),
    ]),
  ) as Readonly<Record<RuMaterialProfile, RuResolvedProfile>>
}
