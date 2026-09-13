/**
 * RU-02 — Universe theming.
 *
 * The palette authority is the existing CSS design tokens (`src/styles/tokens.css`
 * → `ScenePalette` roles) — this module adds NO second colour system. Both
 * themes share ONE scene implementation: only material/lighting/opacity
 * parameters differ, so a theme switch never rebuilds geometry.
 *
 * `tokens.css` already ships the light and dark values for the same role names,
 * so reading the computed custom properties is enough to follow the active
 * theme; the `data-theme` attribute is only used to pick *rendering* parameters
 * that have no CSS representation (light intensities, glow, line opacity).
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
  rimLightIntensity: number
  coreEmissive: number
  nodeEmissive: number
  orbitOpacity: number
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
      rimLightIntensity: 0.3,
      coreEmissive: 0.18,
      nodeEmissive: 0.1,
      orbitOpacity: 0.3,
      markOpacity: 0.36,
      edgeOpacity: 0.34,
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
    rimLightIntensity: 0.55,
    coreEmissive: 0.42,
    nodeEmissive: 0.26,
    orbitOpacity: 0.22,
    markOpacity: 0.3,
    edgeOpacity: 0.3,
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
