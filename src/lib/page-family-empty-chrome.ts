import type { RuntimeAssetId } from './media/authority-checksums'
import {
  GATEWAY_ATMOSPHERE_ASSETS,
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
} from './media/project-mappings'
import type { MediaSlot } from './media/promoted-media-registry'
import type { Locale } from './navigation'

const PROJECT_ROW_PREVIEW_ASSETS = [
  HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
  HOME_PROJECT_ASSET_BY_SLUG['organizational-dashboard-research'],
] as const satisfies readonly RuntimeAssetId[]

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
  'projects',
])

const PATH_FAMILIES = new Set<PageFamilyChromeId>(['teaching'])

const LIST_CARD_FAMILIES = new Set<PageFamilyChromeId>(['teaching'])

const SKILLS_FAMILIES = new Set<PageFamilyChromeId>(['about'])

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
        assetId: HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
        mediaSlot: 'home.project.preview',
      }
    case 'research':
    case 'publications':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
        mediaSlot: 'home.rail.preview',
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
export function getPageFamilyPreviewAsset(family: PageFamilyChromeId): {
  assetId: RuntimeAssetId
  mediaSlot: MediaSlot
} {
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
        assetId: HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
        mediaSlot: 'home.project.preview',
      }
    case 'research':
    case 'publications':
      return {
        assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
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

  if (family === 'projects') {
    return locale === 'en' ? 'Featured project' : 'پروژه برجسته'
  }

  return locale === 'en' ? 'Featured' : 'برگزیده'
}

/** Decorative preview assets cycled across empty-state row shells. */
export function getPageFamilyRowPreviewAssets(
  family: PageFamilyChromeId,
): ReadonlyArray<{ assetId: RuntimeAssetId; mediaSlot: MediaSlot }> {
  switch (family) {
    case 'projects':
      return PROJECT_ROW_PREVIEW_ASSETS.map((assetId) => ({
        assetId,
        mediaSlot: 'home.project.preview' as const,
      }))
    case 'creative':
      return [
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.creative,
          mediaSlot: 'home.rail.preview',
        },
      ]
    case 'writing':
      return [
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.writing,
          mediaSlot: 'home.rail.preview',
        },
      ]
    case 'teaching':
    case 'research':
    case 'publications':
      return [
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
          mediaSlot: 'home.rail.preview',
        },
      ]
    case 'about':
    case 'cv':
    case 'contact':
      return [
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.writing,
          mediaSlot: 'home.rail.preview',
        },
      ]
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
}

/** Structural card eyebrow inside featured shell — UI chrome, not CMS record copy. */
export function getPageFamilyFeaturedCardLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!FEATURED_FAMILIES.has(family)) {
    return null
  }

  if (locale === 'en') {
    switch (family) {
      case 'creative':
        return 'Selected visual work'
      case 'writing':
        return 'Featured'
      case 'teaching':
        return 'Featured course'
      case 'projects':
        return 'Featured project'
      default: {
        const neverFamily: never = family
        throw new Error(`Unknown page family chrome id: ${neverFamily}`)
      }
    }
  }

  switch (family) {
    case 'creative':
      return 'اثر بصری برگزیده'
    case 'writing':
      return 'برگزیده'
    case 'teaching':
      return 'دوره برجسته'
    case 'projects':
      return 'پروژه برجسته'
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
}

/** Structural disabled CTA label for featured empty shell — not CMS record copy. */
export function getPageFamilyFeaturedActionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!FEATURED_FAMILIES.has(family)) {
    return null
  }

  if (locale === 'en') {
    switch (family) {
      case 'creative':
        return 'View work'
      case 'writing':
        return 'Read article'
      case 'teaching':
        return 'View course'
      case 'projects':
        return 'View case study'
      default: {
        const neverFamily: never = family
        throw new Error(`Unknown page family chrome id: ${neverFamily}`)
      }
    }
  }

  switch (family) {
    case 'creative':
      return 'مشاهده اثر'
    case 'writing':
      return 'خواندن مقاله'
    case 'teaching':
      return 'مشاهده دوره'
    case 'projects':
      return 'مشاهده مطالعه موردی'
    default: {
      const neverFamily: never = family
      throw new Error(`Unknown page family chrome id: ${neverFamily}`)
    }
  }
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

/** Structural section label for list-card shell (PF-06) — not CMS record copy. */
export function getPageFamilyListSectionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!LIST_CARD_FAMILIES.has(family)) {
    return null
  }

  return locale === 'en' ? 'Learning library' : 'کتابخانه یادگیری'
}

/** Structural section label for skills shell (PF-07 About) — not CMS record copy. */
export function getPageFamilySkillsSectionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!SKILLS_FAMILIES.has(family)) {
    return null
  }

  return locale === 'en' ? 'Skills' : 'مهارت‌ها'
}

const THEME_EXPLORE_FAMILIES = new Set<PageFamilyChromeId>(['writing'])

/** Structural section label for explore-by-theme band (PF-03) — not CMS record copy. */
export function getPageFamilyThemeExploreSectionLabel(
  locale: Locale,
  family: PageFamilyChromeId,
): string | null {
  if (!THEME_EXPLORE_FAMILIES.has(family)) {
    return null
  }

  return locale === 'en' ? 'Explore by theme' : 'کاوش بر اساس موضوع'
}

/** Approved placeholder when concept shows CMS copy slots — not invented records. */
export function getCmsPlaceholderCopy(locale: Locale): string {
  return locale === 'en'
    ? 'Awaiting approved CMS copy'
    : 'در انتظار تأیید محتوای CMS'
}

/** Structural About sub-navigation tabs — UI chrome, not CMS sections. */
export function getAboutSubNavLabels(locale: Locale): readonly string[] {
  return locale === 'en'
    ? [
        'Overview',
        'Experience',
        'Education',
        'Skills',
        'Research',
        'Publications',
        'Certificates',
      ]
    : [
        'نمای کلی',
        'تجربه',
        'تحصیلات',
        'مهارت‌ها',
        'پژوهش',
        'انتشارات',
        'گواهینامه‌ها',
      ]
}

/** Structural How I Work pillars (PF-07) — UI chrome, not CMS copy. */
export function getAboutHowIWorkPillars(
  locale: Locale,
): readonly { title: string; tone: string }[] {
  return locale === 'en'
    ? [
        { title: 'Human-centered', tone: 'human' },
        { title: 'Systems thinking', tone: 'systems' },
        { title: 'Evidence-led', tone: 'evidence' },
        { title: 'Visual clarity', tone: 'visual' },
      ]
    : [
        { title: 'انسان‌محور', tone: 'human' },
        { title: 'تفکر سیستمی', tone: 'systems' },
        { title: 'مبتنی بر شواهد', tone: 'evidence' },
        { title: 'وضوح بصری', tone: 'visual' },
      ]
}

/** Structural skills category labels (PF-07) — UI chrome, not CMS skill records. */
export function getAboutSkillsCategories(locale: Locale): readonly string[] {
  return locale === 'en'
    ? ['Research', 'Engineering', 'Data / AI', 'Design']
    : ['پژوهش', 'مهندسی', 'داده / هوش مصنوعی', 'طراحی']
}

/** Structural selected-output category labels (PF-07) — UI chrome, not CMS records. */
export function getAboutSelectedOutputCategories(
  locale: Locale,
): readonly { title: string; tone: string }[] {
  return locale === 'en'
    ? [
        { title: 'Research projects', tone: 'projects' },
        { title: 'Publications', tone: 'publications' },
        { title: 'Certificates', tone: 'certificates' },
        { title: 'Resources', tone: 'resources' },
      ]
    : [
        { title: 'پروژه‌های پژوهشی', tone: 'projects' },
        { title: 'انتشارات', tone: 'publications' },
        { title: 'گواهینامه‌ها', tone: 'certificates' },
        { title: 'منابع', tone: 'resources' },
      ]
}

/** Structural teaching path process steps (PF-06) — UI chrome, not CMS records. */
export function getTeachingPathProcessSteps(locale: Locale): readonly string[] {
  return locale === 'en'
    ? ['Overview', 'Lessons', 'Resources', 'References']
    : ['نمای کلی', 'درس‌ها', 'منابع', 'مراجع']
}

/** Structural contact before-you-write checklist (PF-08) — UI chrome, not CMS copy. */
export function getContactBeforeYouWriteItems(
  locale: Locale,
): readonly { title: string; tone: string }[] {
  return locale === 'en'
    ? [
        { title: 'Research fit', tone: 'fit' },
        { title: 'Context', tone: 'context' },
        { title: 'Requested next step', tone: 'step' },
        { title: 'Links / attachments', tone: 'links' },
      ]
    : [
        { title: 'تناسب پژوهشی', tone: 'fit' },
        { title: 'زمینه', tone: 'context' },
        { title: 'گام بعدی درخواستی', tone: 'step' },
        { title: 'پیوندها / پیوست‌ها', tone: 'links' },
      ]
}

/** Structural contact FAQ rows (PF-08) — UI chrome, not CMS copy. */
export function getContactFaqItems(
  locale: Locale,
): readonly { title: string; tone: string }[] {
  return locale === 'en'
    ? [
        {
          title: 'How long does it take to receive a response?',
          tone: 'response',
        },
        { title: 'Do you take new PhD students?', tone: 'phd' },
        { title: 'How should I share materials or links?', tone: 'materials' },
      ]
    : [
        { title: 'پاسخ‌دهی چقدر طول می‌کشد؟', tone: 'response' },
        { title: 'آیا دانشجوی دکتری جدید می‌پذیرید؟', tone: 'phd' },
        { title: 'چگونه مطالب یا پیوندها را ارسال کنم؟', tone: 'materials' },
      ]
}

/** Structural send workflow states (PF-08) — UI chrome, not live form state. */
export function getContactSendWorkflowStates(
  locale: Locale,
): readonly { title: string; tone: string }[] {
  return locale === 'en'
    ? [
        { title: 'Ready', tone: 'ready' },
        { title: 'Sending', tone: 'sending' },
        { title: 'Sent', tone: 'sent' },
        { title: 'Could not send', tone: 'error' },
      ]
    : [
        { title: 'آماده', tone: 'ready' },
        { title: 'در حال ارسال', tone: 'sending' },
        { title: 'ارسال شد', tone: 'sent' },
        { title: 'ارسال نشد', tone: 'error' },
      ]
}

/** Structural hero CTA labels for profile/home shells — routes only, not CMS copy. */
export function getProfileHeroCtaLabels(locale: Locale): {
  research: string
  cv: string
  contact: string
} {
  return locale === 'en'
    ? {
        research: 'Research profile',
        cv: 'Academic CV',
        contact: 'Contact',
      }
    : {
        research: 'پروفایل پژوهشی',
        cv: 'رزومه آکادمیک',
        contact: 'تماس',
      }
}

/** Structural theme chip labels for explore band (PF-03) — UI chrome, not CMS records. */
export function getPageFamilyThemeExploreLabels(
  locale: Locale,
  family: PageFamilyChromeId,
): readonly string[] | null {
  if (!THEME_EXPLORE_FAMILIES.has(family)) {
    return null
  }

  if (locale === 'en') {
    return ['Essays', 'Notes', 'Memories', 'Society', 'Archive']
  }

  return ['مقالات', 'یادداشت‌ها', 'خاطرات', 'جامعه', 'آرشیو']
}
