import type { RuntimeAssetId } from './media/authority-checksums'
import {
  GATEWAY_ATMOSPHERE_ASSETS,
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
} from './media/project-mappings'
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

/** Approved placeholder when concept shows CMS copy slots — not invented records. */
export function getCmsPlaceholderCopy(locale: Locale): string {
  return locale === 'en'
    ? 'Awaiting approved CMS copy'
    : 'در انتظار تأیید محتوای CMS'
}

/** Honest CMS-record slot label — not invented contact or publication values. */
export function getApprovedCmsRecordLabel(locale: Locale): string {
  return locale === 'en' ? 'From approved CMS record' : 'از رکورد تأییدشده CMS'
}

/** Structural constellation headline (PF-05) — UI chrome, not CMS copy. */
export function getResearchConstellationHeadline(locale: Locale): string {
  return locale === 'en'
    ? 'Interconnected themes. Unified by human impact.'
    : 'موضوعات به‌هم‌پیوسته. یکپارچه با اثر انسانی.'
}

/** Structural contact topic-band heading (PF-08) — UI chrome, not CMS copy. */
export function getContactTopicSectionLabel(locale: Locale): string {
  return locale === 'en'
    ? "I'd like to discuss"
    : 'مایلم دربارهٔ این موضوع گفتگو کنم'
}

/** Structural contact form privacy note (PF-08) — UI chrome, not CMS copy. */
export function getContactFormPrivacyNote(locale: Locale): string {
  return locale === 'en'
    ? 'Messages are emailed directly and are not stored in the site database.'
    : 'پیام‌ها مستقیم ایمیل می‌شوند و در پایگاه‌دادهٔ سایت ذخیره نمی‌شوند.'
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
