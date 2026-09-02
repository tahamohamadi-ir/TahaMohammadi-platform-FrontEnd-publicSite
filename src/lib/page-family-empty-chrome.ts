import type { RuntimeAssetId } from './media/authority-checksums'
import {
  GATEWAY_ATMOSPHERE_ASSETS,
  HOME_GRAPH_BACKPLATE_ASSETS,
  HOME_RAIL_ASSET_BY_PATH,
} from './media/project-mappings'
import type { MediaSlot } from './media/promoted-media-registry'
import type { Locale } from './navigation'

export type PageFamilyChromeId =
  | 'creative'
  | 'writing'
  | 'teaching'
  | 'projects'
  | 'research'
  | 'publications'
  | 'about'
  | 'cv'
  | 'contact'

export type PageFamilyHeroMedia =
  | {
      kind: 'single'
      assetId: RuntimeAssetId
      mediaSlot: 'home.rail.preview' | 'home.project.preview'
    }
  | {
      kind: 'theme'
      lightAssetId: RuntimeAssetId
      darkAssetId: RuntimeAssetId
      mediaSlot: 'home.graph.backplate' | 'gateway.atmosphere'
    }

const FEATURED_FAMILIES = new Set<PageFamilyChromeId>([
  'creative',
  'writing',
  'teaching',
])

const PATH_FAMILIES = new Set<PageFamilyChromeId>(['teaching'])

/** Decorative hero media per page family — authority assets only, no CMS copy. */
export function getPageFamilyHeroMedia(
  family: PageFamilyChromeId,
): PageFamilyHeroMedia {
  switch (family) {
    case 'creative':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.creative,
        mediaSlot: 'home.rail.preview',
      }
    case 'writing':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'teaching':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
        mediaSlot: 'home.rail.preview',
      }
    case 'projects':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'research':
    case 'publications':
      return {
        kind: 'theme',
        lightAssetId: HOME_GRAPH_BACKPLATE_ASSETS.light,
        darkAssetId: HOME_GRAPH_BACKPLATE_ASSETS.dark,
        mediaSlot: 'home.graph.backplate',
      }
    case 'about':
    case 'cv':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'contact':
      return {
        kind: 'theme',
        lightAssetId: GATEWAY_ATMOSPHERE_ASSETS.light,
        darkAssetId: GATEWAY_ATMOSPHERE_ASSETS.dark,
        mediaSlot: 'gateway.atmosphere',
      }
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
}

/** List/grid decorative preview asset for empty-state row shells. */
export function getPageFamilyPreviewAsset(
  family: PageFamilyChromeId,
): { assetId: RuntimeAssetId; mediaSlot: MediaSlot } {
  switch (family) {
    case 'creative':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.creative,
        mediaSlot: 'home.rail.preview',
      }
    case 'writing':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'teaching':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
        mediaSlot: 'home.rail.preview',
      }
    case 'projects':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'research':
    case 'publications':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'about':
    case 'cv':
    case 'contact':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
}

/** Structural alt for aria-hidden empty-state previews — not CMS record titles. */
export function getPageFamilyDecorativeAlt(
  locale: Locale,
  family: PageFamilyChromeId,
): string {
  if (locale === 'en') {
    switch (family) {
      case 'projects':
        return 'Decorative project preview'
      case 'creative':
        return 'Decorative gallery preview'
      case 'writing':
        return 'Decorative writing preview'
      case 'teaching':
        return 'Decorative learning preview'
      case 'research':
      case 'publications':
        return 'Decorative research preview'
      case 'about':
      case 'cv':
        return 'Decorative profile preview'
      case 'contact':
        return 'Decorative contact preview'
      default: {
        const neverFamily: never = family
        throw new Error(`Unknown page family chrome id: ${neverFamily}`)
      }
    }
  }

  switch (family) {
    case 'projects':
      return 'پیش‌نمایش تزئینی پروژه'
    case 'creative':
      return 'پیش‌نمایش تزئینی گالری'
    case 'writing':
      return 'پیش‌نمایش تزئینی نوشته'
    case 'teaching':
      return 'پیش‌نمایش تزئینی یادگیری'
    case 'research':
    case 'publications':
      return 'پیش‌نمایش تزئینی پژوهش'
    case 'about':
    case 'cv':
      return 'پیش‌نمایش تزئینی پروفایل'
    case 'contact':
      return 'پیش‌نمایش تزئینی تماس'
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
}

/** Structural section label for optional featured shell — not CMS record copy. */
export function getPageFamilyFeaturedSectionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!FEATURED_FAMILIES.has(family)) {
    return null
  }

  return locale === 'en' ? 'Featured' : 'برگزیده'
}

/** Structural section label for learning-path shell (PF-06) — not CMS record copy. */
export function getPageFamilyPathSectionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!PATH_FAMILIES.has(family)) {
    return null
  }

  return locale === 'en' ? 'Featured path' : 'مسیر برجسته'
}
