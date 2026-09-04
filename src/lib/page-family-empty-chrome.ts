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
        kind: 'theme',
        lightAssetId: GATEWAY_ATMOSPHERE_ASSETS.light,
        darkAssetId: GATEWAY_ATMOSPHERE_ASSETS.dark,
        mediaSlot: 'gateway.atmosphere',
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
        assetId: HOME_RAIL_ASSET_BY_PATH.writing,
        mediaSlot: 'home.rail.preview',
      }
    case 'about':
    case 'cv':
      return {
        kind: 'single',
        assetId: HOME_RAIL_ASSET_BY_PATH.creative,
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
        {
          assetId: HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
          mediaSlot: 'home.project.preview',
        },
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.teaching,
          mediaSlot: 'home.rail.preview',
        },
        {
          assetId:
            HOME_PROJECT_ASSET_BY_SLUG['organizational-dashboard-research'],
          mediaSlot: 'home.project.preview',
        },
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.writing,
          mediaSlot: 'home.rail.preview',
        },
      ]
    case 'writing':
      return [
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.writing,
          mediaSlot: 'home.rail.preview',
        },
        {
          assetId: HOME_RAIL_ASSET_BY_PATH.creative,
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

/** Structural contact hero copy (PF-08) — UI chrome, not CMS records. */
export function getContactHeroCopy(locale: Locale): {
  eyebrow: string
  title: string
  summary: string
  availabilityLabel: string
} {
  return locale === 'en'
    ? {
        eyebrow: 'Collaboration',
        title: "Let's talk",
        summary:
          'For PhD supervision fit, research collaboration, technical opportunities, or selected creative work.',
        availabilityLabel: 'Availability: from approved CMS record',
      }
    : {
        eyebrow: 'همکاری',
        title: 'گفتگو کنیم',
        summary:
          'برای تناسب دکتری، همکاری پژوهشی، فرصت‌های فنی یا کار خلاقه منتخب.',
        availabilityLabel: 'دسترس‌پذیری: از رکورد تأییدشده CMS',
      }
}

/** Structural contact topic cards (PF-08) — UI chrome, not CMS copy. */
export function getContactTopicCards(
  locale: Locale,
): readonly { title: string; tone: string; description: string }[] {
  const placeholder = getCmsPlaceholderCopy(locale)
  return locale === 'en'
    ? [
        { title: 'PhD / Research', tone: 'phd', description: placeholder },
        {
          title: 'Technical work',
          tone: 'technical',
          description: placeholder,
        },
        { title: 'Creative work', tone: 'creative', description: placeholder },
        { title: 'Other', tone: 'other', description: placeholder },
      ]
    : [
        { title: 'دکتری / پژوهش', tone: 'phd', description: placeholder },
        { title: 'کار فنی', tone: 'technical', description: placeholder },
        { title: 'کار خلاقه', tone: 'creative', description: placeholder },
        { title: 'سایر', tone: 'other', description: placeholder },
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

/** Approved structural role line for profile/research heroes — not CMS copy. */
export function getGatewayRoleLine(locale: Locale): string {
  return locale === 'en'
    ? 'Researcher · Engineer · Designer'
    : 'پژوهشگر · مهندس · طراح'
}

export type ConstellationLegendItem = {
  label: string
  tone: 'brand' | 'research' | 'context' | 'signature' | 'ink'
}

export type ConstellationNodeIcon =
  'center' | 'systems' | 'health' | 'comms' | 'nlp' | 'data'

export type ConstellationDiagramNode = {
  label: string
  tone: ConstellationLegendItem['tone']
  icon: ConstellationNodeIcon
  cx: number
  cy: number
}

/** Structural constellation legend labels (PF-05) — UI chrome, not CMS records. */
export function getResearchConstellationLegend(
  locale: Locale,
): readonly ConstellationLegendItem[] {
  return locale === 'en'
    ? [
        { label: 'AI & Intelligence', tone: 'brand' },
        { label: 'Data & Systems', tone: 'research' },
        { label: 'Health & Society', tone: 'context' },
        { label: 'Language & Culture', tone: 'signature' },
        { label: 'Design & Communication', tone: 'ink' },
      ]
    : [
        { label: 'هوش مصنوعی و شناخت', tone: 'brand' },
        { label: 'داده و سامانه‌ها', tone: 'research' },
        { label: 'سلامت و جامعه', tone: 'context' },
        { label: 'زبان و فرهنگ', tone: 'signature' },
        { label: 'طراحی و ارتباط', tone: 'ink' },
      ]
}

/** Structural constellation diagram nodes (PF-05) — UI chrome, not CMS records. */
export function getResearchConstellationNodes(
  locale: Locale,
): readonly ConstellationDiagramNode[] {
  return locale === 'en'
    ? [
        {
          label: 'Human-Centered AI',
          tone: 'brand',
          icon: 'center',
          cx: 200,
          cy: 200,
        },
        {
          label: 'Systems Thinking',
          tone: 'research',
          icon: 'systems',
          cx: 200,
          cy: 72,
        },
        {
          label: 'Digital Health',
          tone: 'context',
          icon: 'health',
          cx: 318,
          cy: 132,
        },
        {
          label: 'Visual Communication',
          tone: 'signature',
          icon: 'comms',
          cx: 318,
          cy: 268,
        },
        {
          label: 'Persian NLP & Text-to-SQL',
          tone: 'ink',
          icon: 'nlp',
          cx: 82,
          cy: 268,
        },
        {
          label: 'Data Systems',
          tone: 'research',
          icon: 'data',
          cx: 82,
          cy: 132,
        },
      ]
    : [
        {
          label: 'هوش مصنوعی انسان‌محور',
          tone: 'brand',
          icon: 'center',
          cx: 200,
          cy: 200,
        },
        {
          label: 'تفکر سیستمی',
          tone: 'research',
          icon: 'systems',
          cx: 200,
          cy: 72,
        },
        {
          label: 'سلامت دیجیتال',
          tone: 'context',
          icon: 'health',
          cx: 318,
          cy: 132,
        },
        {
          label: 'ارتباط بصری',
          tone: 'signature',
          icon: 'comms',
          cx: 318,
          cy: 268,
        },
        {
          label: 'NLP و Text-to-SQL',
          tone: 'ink',
          icon: 'nlp',
          cx: 82,
          cy: 268,
        },
        {
          label: 'سامانه‌های داده',
          tone: 'research',
          icon: 'data',
          cx: 82,
          cy: 132,
        },
      ]
}

export type ResearchDirectionRow = {
  title: string
  tone: 'brand' | 'research' | 'context' | 'signature' | 'ink'
}

/** Structural research-direction row labels (PF-05) — UI chrome, not CMS records. */
export function getResearchDirectionRows(
  locale: Locale,
): readonly ResearchDirectionRow[] {
  return locale === 'en'
    ? [
        { title: 'Human-Centered AI', tone: 'brand' },
        { title: 'Trustworthy & Controllable AI', tone: 'research' },
        { title: 'Visual Analytics & Decision Support', tone: 'context' },
        { title: 'Behavioral Data & Personalization', tone: 'signature' },
        { title: 'Digital Health & Wearable AI', tone: 'ink' },
      ]
    : [
        { title: 'هوش مصنوعی انسان‌محور', tone: 'brand' },
        { title: 'هوش مصنوعی قابل‌اعتماد', tone: 'research' },
        { title: 'تحلیل بصری و پشتیبانی تصمیم', tone: 'context' },
        { title: 'داده رفتاری و شخصی‌سازی', tone: 'signature' },
        { title: 'سلامت دیجیتال و پوشیدنی', tone: 'ink' },
      ]
}

export type PublicationsInterestItem = {
  label: string
  tone: 'brand' | 'research' | 'context' | 'signature' | 'ink'
}

/** Structural publications sidebar interest labels (PF-05) — UI chrome, not CMS records. */
export function getPublicationsInterestItems(
  locale: Locale,
): readonly PublicationsInterestItem[] {
  return getResearchConstellationLegend(locale)
}

/** Structural action labels for research direction rows (PF-05). */
export function getResearchDirectionActionLabels(locale: Locale): {
  status: string
  related: string
} {
  return locale === 'en'
    ? { status: 'Publication status', related: 'Related records' }
    : { status: 'وضعیت انتشار', related: 'رکوردهای مرتبط' }
}

/** Structural theme chip labels for explore band (PF-03) — UI chrome, not CMS records. */
export function getPageFamilyThemeExploreLabels(
  locale: Locale,
  family: PageFamilyChromeId,
): readonly string[] | null {
  const items = getPageFamilyThemeExploreItems(locale, family)
  return items ? items.map((item) => item.label) : null
}

export type ThemeExploreItem = {
  label: string
  tone: 'essay' | 'note' | 'memory' | 'society' | 'archive'
}

/** Structural theme icon-card items for explore band (PF-03) — UI chrome, not CMS records. */
export function getPageFamilyThemeExploreItems(
  locale: Locale,
  family: PageFamilyChromeId,
): readonly ThemeExploreItem[] | null {
  if (!THEME_EXPLORE_FAMILIES.has(family)) {
    return null
  }

  if (locale === 'en') {
    return [
      { label: 'Essays', tone: 'essay' },
      { label: 'Notes', tone: 'note' },
      { label: 'Memories', tone: 'memory' },
      { label: 'Society', tone: 'society' },
      { label: 'Archive', tone: 'archive' },
    ]
  }

  return [
    { label: 'مقالات', tone: 'essay' },
    { label: 'یادداشت‌ها', tone: 'note' },
    { label: 'خاطرات', tone: 'memory' },
    { label: 'جامعه', tone: 'society' },
    { label: 'آرشیو', tone: 'archive' },
  ]
}

/** Approved structural hero summary placeholders — not CMS record copy. */
export function getPageFamilyHeroSummary(
  locale: Locale,
  family: PageFamilyChromeId,
): string | undefined {
  if (locale === 'en') {
    switch (family) {
      case 'creative':
        return 'A curated collection of visual explorations, experiments, and creative studies. Where research meets form.'
      case 'writing':
        return 'Essays, notes, memories, and reflections—independent from project records.'
      case 'teaching':
        return 'Notes, guides, tutorials, and resources—published when ready.'
      case 'projects':
        return 'Selected systems, prototypes, and research artifacts—sanitized for public review.'
      default:
        return undefined
    }
  }

  switch (family) {
    case 'creative':
      return 'مجموعه‌ای گزینش‌شده از کاوش‌های بصری، آزمایش‌ها و مطالعات خلاقانه؛ جایی که پژوهش با فرم ملاقات می‌کند.'
    case 'writing':
      return 'مقالات، یادداشت‌ها، خاطرات و تأملات—مستقل از رکوردهای پروژه.'
    case 'teaching':
      return 'یادداشت‌ها، راهنماها، آموزش‌ها و منابع—هنگام آماده‌شدن منتشر می‌شوند.'
    case 'projects':
      return 'سامانه‌ها، نمونه‌های اولیه و آرتیفکت‌های پژوهشی منتخب—با داده‌های پاک‌سازی‌شده برای مرور عمومی.'
    default:
      return undefined
  }
}

/** Structural writing index hero eyebrow (PF-03) — UI chrome, not CMS copy. */
export function getWritingHeroEyebrow(locale: Locale): string {
  return locale === 'en' ? 'Independent writing' : 'نوشتار مستقل'
}

/**
 * Structural category chrome for writing list rows (PF-03).
 * Cycles filter/theme tones — not CMS record categories.
 */
export function getWritingRowCategoryLabel(
  locale: Locale,
  index: number,
): string {
  const items = getPageFamilyThemeExploreItems(locale, 'writing')
  if (!items?.length) {
    return locale === 'en' ? 'ESSAY' : 'مقاله'
  }
  const item = items[index % items.length]!
  if (locale === 'fa') {
    return item.label
  }
  switch (item.tone) {
    case 'essay':
      return 'ESSAY'
    case 'note':
      return 'NOTE'
    case 'memory':
      return 'MEMORY'
    case 'society':
      return 'SOCIETY'
    case 'archive':
      return 'ARCHIVE'
    default: {
      const neverTone: never = item.tone
      throw new Error(`Unknown writing theme tone: ${neverTone}`)
    }
  }
}

/** Structural optional-updates / newsletter band chrome (PF-03). */
export function getOptionalUpdatesChrome(locale: Locale): {
  title: string
  action: string
} {
  return locale === 'en'
    ? { title: 'Optional updates', action: 'Follow updates' }
    : { title: 'به‌روزرسانی اختیاری', action: 'دنبال کردن به‌روزرسانی‌ها' }
}

/** Structural writing collaborate band chrome (PF-03). */
export function getWritingCollaborateChrome(locale: Locale): {
  title: string
  copy: string
  connectAction: string
  cvAction: string
} {
  return locale === 'en'
    ? {
        title: "Let's collaborate on writing that matters",
        copy: 'Independent thoughts, shared insight, and meaningful dialogue.',
        connectAction: "Let's Connect",
        cvAction: 'Download CV',
      }
    : {
        title: 'همکاری در نوشتاری که اهمیت دارد',
        copy: 'اندیشه‌های مستقل، بینش مشترک و گفت‌وگوی معنادار.',
        connectAction: 'ارتباط بگیریم',
        cvAction: 'دانلود رزومه',
      }
}

/** Structural view-path CTA for featured learning path (PF-06). */
export function getTeachingViewPathLabel(locale: Locale): string {
  return locale === 'en' ? 'View path' : 'مشاهده مسیر'
}

/** Structural browse-paths CTA label (PF-06) — route chrome, not CMS copy. */
export function getTeachingBrowsePathsLabel(locale: Locale): string {
  return locale === 'en' ? 'Browse paths' : 'مرور مسیرها'
}

export type TeachingFeaturedPathStep = {
  index: string
  label: string
}

/** Structural featured-path step labels (PF-06) — UI chrome, not CMS records. */
export function getTeachingFeaturedPathSteps(
  locale: Locale,
): readonly TeachingFeaturedPathStep[] {
  return locale === 'en'
    ? [
        { index: '01', label: 'Foundations' },
        { index: '02', label: 'Deepen' },
        { index: '03', label: 'Apply' },
        { index: '04', label: 'Expand' },
      ]
    : [
        { index: '۰۱', label: 'مبانی' },
        { index: '۰۲', label: 'تعمیق' },
        { index: '۰۳', label: 'کاربرد' },
        { index: '۰۴', label: 'گسترش' },
      ]
}

export type ProjectsEvidenceCard = {
  title: string
  tone: 'methods' | 'artifacts' | 'code' | 'docs'
  description: string
}

/** Structural Evidence Available cards (PF-04) — UI chrome, not CMS records. */
export function getProjectsEvidenceCards(
  locale: Locale,
): readonly ProjectsEvidenceCard[] {
  return locale === 'en'
    ? [
        {
          title: 'Methods',
          tone: 'methods',
          description: 'Approach, assumptions, and modeling methods.',
        },
        {
          title: 'Artifacts',
          tone: 'artifacts',
          description: 'Diagrams, prototypes, and supporting assets.',
        },
        {
          title: 'Code / Demo',
          tone: 'code',
          description: 'Source code and demos when disclosure is safe.',
        },
        {
          title: 'Documentation',
          tone: 'docs',
          description: 'Papers, notes, and technical documentation.',
        },
      ]
    : [
        {
          title: 'روش‌ها',
          tone: 'methods',
          description: 'رویکرد، مفروضات و روش‌های مدل‌سازی.',
        },
        {
          title: 'آثار',
          tone: 'artifacts',
          description: 'نمودارها، نمونه‌ها و دارایی‌های پشتیبان.',
        },
        {
          title: 'کد / دمو',
          tone: 'code',
          description: 'کد منبع و دمو هنگام مجاز بودن افشا.',
        },
        {
          title: 'مستندات',
          tone: 'docs',
          description: 'مقالات، یادداشت‌ها و مستندات فنی.',
        },
      ]
}

/** Structural sanitized badge label (PF-04) — disclosure chrome, not CMS copy. */
export function getProjectsSanitizedBadgeLabel(locale: Locale): string {
  return locale === 'en' ? 'Sanitized' : 'پالایش‌شده'
}

/** Structural projects hero disclosure notice (PF-04) — UI chrome, not CMS copy. */
export function getProjectsHeroNotice(locale: Locale): string {
  return locale === 'en'
    ? 'No sensitive or real operational data'
    : 'بدون داده حساس یا عملیاتی واقعی'
}
