/** Responsive derivative widths approved for atmosphere / hero slots. */
export const ATMOSPHERE_WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1672] as const;

/** Responsive derivative widths approved for project and rail preview slots. */
export const PREVIEW_WIDTHS = [320, 480, 640, 800, 1024] as const;

/** Graph backplate responsive derivative widths (canonical source 1254×1254; no 1254px runtime width). */
export const GRAPH_BACKPLATE_WIDTHS = [320, 480, 640, 768, 1024] as const;

export const PROMOTED_FORMATS = ['avif', 'webp'] as const;

export type PromotedFormat = (typeof PROMOTED_FORMATS)[number];

export type TransformRecipe =
  | { kind: 'atmosphere'; widths: typeof ATMOSPHERE_WIDTHS; sizes: string }
  | { kind: 'preview'; widths: typeof PREVIEW_WIDTHS; sizes: string }
  | { kind: 'brand'; widths: readonly [256]; sizes: string }
  | { kind: 'graph-backplate'; widths: typeof GRAPH_BACKPLATE_WIDTHS; sizes: string };

export const ATMOSPHERE_SIZES =
  '(min-width: 1440px) 1672px, (min-width: 1280px) 1440px, (min-width: 1024px) 1280px, (min-width: 768px) 1024px, (min-width: 390px) 768px, 100vw';

export const PREVIEW_SIZES =
  '(min-width: 1024px) 640px, (min-width: 768px) 480px, (min-width: 480px) 320px, 100vw';

export const BRAND_MARK_SIZES = '256px';

export const GRAPH_BACKPLATE_SIZES =
  '(min-width: 768px) 640px, (min-width: 480px) 480px, 320px';

export function getTransformRecipe(slot: string): TransformRecipe {
  switch (slot) {
    case 'gateway.atmosphere':
    case 'home.hero.atmosphere':
      return { kind: 'atmosphere', widths: ATMOSPHERE_WIDTHS, sizes: ATMOSPHERE_SIZES };
    case 'home.project.preview':
    case 'home.rail.preview':
      return { kind: 'preview', widths: PREVIEW_WIDTHS, sizes: PREVIEW_SIZES };
    case 'brand.mark':
      return { kind: 'brand', widths: [256], sizes: BRAND_MARK_SIZES };
    case 'home.graph.backplate':
      return { kind: 'graph-backplate', widths: GRAPH_BACKPLATE_WIDTHS, sizes: GRAPH_BACKPLATE_SIZES };
    default:
      throw new Error(`Unknown media slot for transform recipe: ${slot}`);
  }
}
