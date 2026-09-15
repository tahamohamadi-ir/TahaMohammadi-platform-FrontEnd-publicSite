/** Responsive derivative widths approved for atmosphere / hero slots. */
export const ATMOSPHERE_WIDTHS = [
  320, 390, 768, 1024, 1280, 1440, 1672,
] as const

/** Responsive derivative widths approved for project and rail preview slots. */
export const PREVIEW_WIDTHS = [320, 480, 640, 800, 1024] as const

/** Graph backplate responsive derivative widths (canonical source 1254×1254; no 1254px runtime width). */
export const GRAPH_BACKPLATE_WIDTHS = [320, 480, 640, 768, 1024] as const

/**
 * Hero v2 sequence derivatives. The desktop composition is 1600×1400 and is displayed in a
 * 520–620px scene, so 800 and 1600 cover DPR 1 and 2; the mobile composition is 800×800 in a
 * 280–360px scene, where 800 already covers DPR 2 and 400 keeps DPR 1 light.
 */
export const HERO_SEQUENCE_DESKTOP_WIDTHS = [800, 1600] as const
export const HERO_SEQUENCE_MOBILE_WIDTHS = [400, 800] as const

export const HERO_SEQUENCE_DESKTOP_SIZES =
  '(min-width: 1024px) 620px, (min-width: 768px) 460px, 100vw'

export const HERO_SEQUENCE_MOBILE_SIZES =
  '(min-width: 768px) 480px, (min-width: 480px) 360px, 100vw'

export const PROMOTED_FORMATS = ['avif', 'webp'] as const

export type PromotedFormat = (typeof PROMOTED_FORMATS)[number]

export type TransformRecipe =
  | { kind: 'atmosphere'; widths: typeof ATMOSPHERE_WIDTHS; sizes: string }
  | { kind: 'preview'; widths: typeof PREVIEW_WIDTHS; sizes: string }
  | { kind: 'brand'; widths: readonly [256]; sizes: string }
  | {
      kind: 'graph-backplate'
      widths: typeof GRAPH_BACKPLATE_WIDTHS
      sizes: string
    }
  | {
      kind: 'hero-sequence-desktop'
      widths: typeof HERO_SEQUENCE_DESKTOP_WIDTHS
      sizes: string
    }
  | {
      kind: 'hero-sequence-mobile'
      widths: typeof HERO_SEQUENCE_MOBILE_WIDTHS
      sizes: string
    }

export const ATMOSPHERE_SIZES =
  '(min-width: 1440px) 1672px, (min-width: 1280px) 1440px, (min-width: 1024px) 1280px, (min-width: 768px) 1024px, (min-width: 390px) 768px, 100vw'

export const PREVIEW_SIZES =
  '(min-width: 1024px) 640px, (min-width: 768px) 480px, (min-width: 480px) 320px, 100vw'

export const BRAND_MARK_SIZES = '256px'

export const GRAPH_BACKPLATE_SIZES =
  '(min-width: 768px) 640px, (min-width: 480px) 480px, 320px'

export function getTransformRecipe(slot: string): TransformRecipe {
  switch (slot) {
    case 'gateway.atmosphere':
    case 'home.hero.atmosphere':
      return {
        kind: 'atmosphere',
        widths: ATMOSPHERE_WIDTHS,
        sizes: ATMOSPHERE_SIZES,
      }
    case 'home.project.preview':
    case 'home.rail.preview':
      return { kind: 'preview', widths: PREVIEW_WIDTHS, sizes: PREVIEW_SIZES }
    case 'brand.mark':
      return { kind: 'brand', widths: [256], sizes: BRAND_MARK_SIZES }
    case 'home.graph.backplate':
      return {
        kind: 'graph-backplate',
        widths: GRAPH_BACKPLATE_WIDTHS,
        sizes: GRAPH_BACKPLATE_SIZES,
      }
    case 'home.hero.sequence.desktop':
      return {
        kind: 'hero-sequence-desktop',
        widths: HERO_SEQUENCE_DESKTOP_WIDTHS,
        sizes: HERO_SEQUENCE_DESKTOP_SIZES,
      }
    case 'home.hero.sequence.mobile':
      return {
        kind: 'hero-sequence-mobile',
        widths: HERO_SEQUENCE_MOBILE_WIDTHS,
        sizes: HERO_SEQUENCE_MOBILE_SIZES,
      }
    default:
      throw new Error(`Unknown media slot for transform recipe: ${slot}`)
  }
}
