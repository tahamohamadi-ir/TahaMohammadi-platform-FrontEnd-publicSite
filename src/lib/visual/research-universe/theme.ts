/**
 * RU-02 / RU-4B — Universe theming.
 *
 * The palette authority is the existing CSS design tokens (`src/styles/tokens.css`
 * → `ScenePalette` roles) — this module adds NO second colour system. Both themes
 * share ONE scene implementation: only material/lighting/opacity parameters
 * differ, so a theme switch never rebuilds geometry and never moves a node.
 *
 * That last point is now a hard requirement rather than a description: the brief
 * says Light must use "the SAME topology and SAME object positions as Dark" and
 * must "translate materials only". Since positions are computed by `layout.ts`
 * from the model alone — never from the theme — this module cannot move anything,
 * and `presentation.test.ts` asserts the same layout object results from both
 * theme parameter sets.
 *
 * Emissive is a BUDGET here, not a per-role intensity. The previous generation
 * carried `coreEmissive`/`nodeEmissive` (0.42/0.26 on dark) which were applied
 * straight to the materials and produced the neon/LED reading the brief rejects;
 * the current model keeps only a small per-theme multiplier for the
 * presentation profiles' fractional emissive floor (see `materials.ts`).
 *
 * `tokens.css` already ships light and dark values for the same role names, so
 * reading the computed custom properties is enough to follow the active theme;
 * the `data-theme` attribute is only used to pick *rendering* parameters that
 * have no CSS representation (light intensities, line opacity).
 */

import type { ScenePalette } from '../scene-contract'

export type UniverseThemeMode = 'light' | 'dark'

/**
 * How the same geometry is rendered per theme. Read from the active
 * `data-theme`; defaults to `dark`, which is the site's ratifying direction
 * (`ADR-0031` dark-first) and the `tokens.css` `prefers-color-scheme` fallback.
 */
export function resolveThemeMode(
  root: Element | null | undefined,
): UniverseThemeMode {
  try {
    const value = root?.getAttribute?.('data-theme')
    return value === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export interface UniverseRenderTheme {
  mode: UniverseThemeMode
  palette: ScenePalette
  /** Background haze strength, 0 = none. */
  backgroundIntensity: number
  ambientIntensity: number
  keyLightIntensity: number
  /**
   * Weak fill from the opposite side. The old `rimLightIntensity` (0.55 on dark)
   * was a rim-glow rig, which the brief rejects ("no dramatic rim glow"); this is
   * a plain fill that keeps the shadowed side of a sphere from going flat black.
   */
  fillLightIntensity: number
  /** Fraction of each profile's emissive floor this theme expresses. */
  emissiveLift: number
  /** Direction-tick and marker opacity. */
  markOpacity: number
  edgeOpacity: number
  edgeEmphasisOpacity: number
  edgeDimOpacity: number
  labelOpacity: number
}

/** Numeric rendering parameters per theme. One table, both themes. */
export function themeRenderParams(
  mode: UniverseThemeMode,
): Omit<UniverseRenderTheme, 'palette' | 'mode'> {
  if (mode === 'light') {
    return {
      // Warm sculptural separation: enough key light for silhouette contrast
      // without washing the ivory canvas into flat white clay.
      backgroundIntensity: 0.04,
      ambientIntensity: 1.15,
      keyLightIntensity: 0.55,
      fillLightIntensity: 0.18,
      // Ivory is brighter than the objects, so almost no emissive lift is needed
      // to separate them; a large value here is exactly how "washed-out clay"
      // happens.
      emissiveLift: 0.08,
      markOpacity: 0.34,
      edgeOpacity: 0.4,
      edgeEmphasisOpacity: 0.82,
      edgeDimOpacity: 0.12,
      labelOpacity: 1,
    }
  }
  return {
    // Deep spatial contrast with readable silhouettes.
    backgroundIntensity: 0.09,
    ambientIntensity: 0.72,
    keyLightIntensity: 0.85,
    fillLightIntensity: 0.26,
    emissiveLift: 0.34,
    markOpacity: 0.3,
    edgeOpacity: 0.34,
    edgeEmphasisOpacity: 0.9,
    edgeDimOpacity: 0.08,
    labelOpacity: 1,
  }
}

/** Combine the CSS-derived palette with the mode's rendering parameters. */
export function buildUniverseTheme(
  palette: ScenePalette,
  mode: UniverseThemeMode,
): UniverseRenderTheme {
  return { mode, palette, ...themeRenderParams(mode) }
}
