/**
 * Scaffold copy from content-records.v1.1-seed.json (draft — not published API).
 * Do not treat as live CMS data until owner approval and publication gate pass.
 * Locale rule: exact-locale records only; no fallback content.
 */

import type { Locale } from './navigation'
import { shellCopy } from './navigation'
import type { RuntimeAssetId } from './media/authority-checksums'
import {
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
} from './media/project-mappings'

/** profile.identity.{locale}.data.name */
const displayName: Record<Locale, string> = {
  en: 'Taha Mohammadi',
  fa: 'طه محمدی',
}

/** profile.identity.{locale}.data.professional_title */
const professionalRole: Record<Locale, string> = {
  en: 'Software Engineer & Researcher in Human-Centered AI, Data Systems, and Visual Analytics',
  fa: 'مهندس نرم‌افزار و پژوهشگر در حوزه هوش مصنوعی انسان‌محور، سامانه‌های داده و تحلیل بصری',
}

/** route.home.{locale}.body_markdown */
const introCopy: Record<Locale, string> = {
  en: 'I work across software engineering, AI, data systems, visual analytics, and interaction design—with a focus on systems that remain inspectable, controllable, and useful in real decisions.',
  fa: 'در مرز مهندسی نرم‌افزار، هوش مصنوعی، سامانه‌های داده، تحلیل بصری و طراحی تعامل کار می‌کنم؛ با تمرکز بر سامانه‌هایی که در تصمیم‌های واقعی قابل‌فهم، کنترل‌پذیر و مفید باقی بمانند.',
}

/** Home research-focus slot — research.focus.*.en titles (EN-only records in seed). */
const focusChipsEn = [
  'Human-Centered AI',
  'Trustworthy & Controllable AI',
  'Visual Analytics & Decision Support',
  'Behavioral Data & Personalization',
  'Digital Health & Wearable AI',
] as const

/** research.statement.fa.data.focus_areas */
const focusChipsFa = [
  'هوش مصنوعی انسان‌محور و تعامل انسان و هوش مصنوعی',
  'سامانه‌های هوشمند قابل‌اعتماد، کنترل‌پذیر و عامل‌محور',
  'تحلیل بصری و پشتیبانی از تصمیم با کمک هوش مصنوعی',
  'سامانه‌های داده رفتاری و شخصی‌سازی توضیح‌پذیر',
  'هوش مصنوعی محلی و لبه با ملاحظات حریم خصوصی',
] as const

const focusAreasLabel: Record<Locale, string> = {
  en: 'Focus areas',
  fa: 'حوزه‌های تمرکز',
}

/** research.statement.{locale}.title */
const researchTitle: Record<Locale, string> = {
  en: 'Research Statement',
  fa: 'بیانیه پژوهشی',
}

/** research.statement.{locale}.excerpt */
const researchExcerpt: Record<Locale, string> = {
  en: 'How can intelligent systems extend human capability without obscuring evidence, uncertainty, or control?',
  fa: 'سامانه‌های هوشمند چگونه می‌توانند توانایی انسان را افزایش دهند، بدون آن‌که شواهد، عدم‌قطعیت یا کنترل را پنهان کنند؟',
}

/** research.statement.{locale}.body_markdown — first paragraph only for home. */
const researchLead: Record<Locale, string> = {
  en: 'My research interest is centered on a practical question: how can intelligent systems extend human capability without obscuring evidence, uncertainty, or control?',
  fa: 'محور اصلی علاقه پژوهشی من یک پرسش عملی است: سامانه‌های هوشمند چگونه می‌توانند توانایی انسان را افزایش دهند، بدون آن‌که شواهد، عدم‌قطعیت یا امکان کنترل را پنهان کنند؟',
}

const featuredTitle: Record<Locale, string> = {
  en: 'Featured projects',
  fa: 'پروژه‌های برجسته',
}

const featuredDraftNote: Record<Locale, string> = {
  en: 'Draft preview from owner seed — not yet published via API.',
  fa: 'پیش‌نمایش پیش‌نویس از seed مالک — هنوز از API منتشر نشده است.',
}

const viewAllProjects: Record<Locale, string> = {
  en: 'View all projects',
  fa: 'همهٔ پروژه‌ها',
}

const viewProjectLabel: Record<Locale, string> = {
  en: 'View project',
  fa: 'مشاهدهٔ پروژه',
}

export interface FeaturedProjectCard {
  slug: string
  title: string
  excerpt: string
  statusLabel: string
  tags: readonly string[]
  assetId: RuntimeAssetId
}

/** Public draft-safe featured projects from seed v1.1 (not API-backed). */
const featuredProjects: Record<Locale, FeaturedProjectCard[]> = {
  en: [
    {
      slug: 'pars-sql-vtd-edge',
      title: 'PARS-SQL / VTD-Edge',
      excerpt:
        'Reliable Persian natural-language interaction with structured data.',
      statusLabel: 'Ongoing research and engineering project',
      tags: ['human-centered-ai', 'nlp-to-sql', 'trustworthy-ai', 'local-ai'],
      assetId: HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
    },
    {
      slug: 'organizational-dashboard-research',
      title: 'Organizational Dashboard Research & Design',
      excerpt:
        'Research and design across nine organizational dashboard suites.',
      statusLabel: '2022–2025',
      tags: [
        'visual-analytics',
        'dashboard-design',
        'information-visualization',
      ],
      assetId: HOME_PROJECT_ASSET_BY_SLUG['organizational-dashboard-research'],
    },
  ],
  fa: [
    {
      slug: 'pars-sql-vtd-edge',
      title: 'PARS-SQL / VTD-Edge',
      excerpt: 'تعامل قابل‌اعتماد زبان طبیعی فارسی با داده‌های ساختاریافته.',
      statusLabel: 'پروژه پژوهشی و مهندسی در حال توسعه',
      tags: ['human-centered-ai', 'nlp-to-sql', 'trustworthy-ai', 'local-ai'],
      assetId: HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge'],
    },
    {
      slug: 'organizational-dashboard-research',
      title: 'پژوهش و طراحی داشبوردهای سازمانی',
      excerpt: 'پژوهش و طراحی در نه مجموعه داشبورد سازمانی.',
      statusLabel: '۱۴۰۱–۱۴۰۴',
      tags: [
        'visual-analytics',
        'dashboard-design',
        'information-visualization',
      ],
      assetId: HOME_PROJECT_ASSET_BY_SLUG['organizational-dashboard-research'],
    },
  ],
}

export interface HomeHeroContent {
  name: string
  namePrimary: string
  nameAccent: string
  role: string
  intro: string
  focusChips: readonly string[]
  focusAreasLabel: string
}

export function getHomeHeroContent(locale: Locale): HomeHeroContent {
  const name = displayName[locale]

  if (locale === 'en') {
    const [given, ...rest] = name.split(' ')
    return {
      name,
      namePrimary: given,
      nameAccent: rest.length > 0 ? ` ${rest.join(' ')}` : '',
      role: professionalRole.en,
      intro: introCopy.en,
      focusChips: focusChipsEn,
      focusAreasLabel: focusAreasLabel.en,
    }
  }

  return {
    name,
    namePrimary: name,
    nameAccent: '',
    role: professionalRole.fa,
    intro: introCopy.fa,
    focusChips: focusChipsFa,
    focusAreasLabel: focusAreasLabel.fa,
  }
}

export interface HomeResearchContent {
  title: string
  excerpt: string
  lead: string
}

export interface HomeFeaturedContent {
  title: string
  draftNote: string
  viewAll: string
  viewProject: string
  projects: FeaturedProjectCard[]
}

export function getHomeResearchContent(locale: Locale): HomeResearchContent {
  return {
    title: researchTitle[locale],
    excerpt: researchExcerpt[locale],
    lead: researchLead[locale],
  }
}

export function getHomeFeaturedContent(locale: Locale): HomeFeaturedContent {
  return {
    title: featuredTitle[locale],
    draftNote: featuredDraftNote[locale],
    viewAll: viewAllProjects[locale],
    viewProject: viewProjectLabel[locale],
    projects: featuredProjects[locale],
  }
}

type ConstellationAccent =
  'brand' | 'signature' | 'research' | 'context' | 'ink'

const constellationAccents: ConstellationAccent[] = [
  'brand',
  'research',
  'signature',
  'context',
  'ink',
]

const constellationPositions: ConstellationNode['position'][] = [
  'a',
  'b',
  'c',
  'd',
  'e',
]

export interface ConstellationNode {
  slug: string
  label: string
  accent: ConstellationAccent
  position: 'a' | 'b' | 'c' | 'd' | 'e'
}

function buildConstellationNodes(
  cards: readonly { slug: string; title: string }[],
): ConstellationNode[] {
  return cards.map((card, index) => ({
    slug: card.slug,
    label: card.title,
    accent: constellationAccents[index] ?? 'brand',
    position: constellationPositions[index] ?? 'a',
  }))
}

const interestsSectionTitle: Record<Locale, string> = {
  en: 'Research interests & fit',
  fa: 'علاقه‌مندی‌ها و تناسب پژوهشی',
}

const interestsSectionLead: Record<Locale, string> = {
  en: 'Five interconnected areas where research questions, system design, and real-world constraints meet.',
  fa: 'پنج حوزهٔ به‌هم‌پیوسته که پرسش‌های پژوهشی، طراحی سامانه و محدودیت‌های دنیای واقعی در آن‌ها تلاقی می‌کنند.',
}

/** research.focus.*.en — EN-only seed records. */
const researchInterestsEn = [
  {
    slug: 'human-centered-ai',
    title: 'Human-Centered AI',
    excerpt:
      'Designing AI systems around human goals, interpretation, agency, and real-world use—not only model capability.',
  },
  {
    slug: 'trustworthy-controllable-ai',
    title: 'Trustworthy & Controllable AI',
    excerpt:
      'Clarification, validation, provenance, abstention, human approval, and failure-aware system behavior.',
  },
  {
    slug: 'visual-analytics-decision-support',
    title: 'Visual Analytics & Decision Support',
    excerpt:
      'Turning complex data into inspectable, interactive evidence for strategic, tactical, and operational decisions.',
  },
  {
    slug: 'behavioral-data-personalization',
    title: 'Behavioral Data & Personalization',
    excerpt:
      'Building event and data models that separate observed evidence from inferred user state and preserve traceability.',
  },
  {
    slug: 'digital-health-wearable-ai',
    title: 'Digital Health & Wearable AI',
    excerpt:
      'A developing research direction focused on responsible use of health, behavioral, and multimodal human data.',
  },
] as const

const researchFitTitle: Record<Locale, string> = {
  en: 'Research fit',
  fa: 'تناسب پژوهشی',
}

/** route.about.{locale}.body_markdown */
const researchFitCopy: Record<Locale, string> = {
  en: 'My path is intentionally interdisciplinary: from architecture and visual communication to production software, data systems, and applied AI. That combination shapes the questions I work on today.',
  fa: 'مسیر حرفه‌ای و پژوهشی من عمداً میان‌رشته‌ای بوده است: از معماری و ارتباط تصویری تا توسعه نرم‌افزار، سامانه‌های داده و هوش مصنوعی کاربردی.',
}

const journeyTitle: Record<Locale, string> = {
  en: 'My journey',
  fa: 'مسیر من',
}

const journeyHeadline: Record<Locale, string> = {
  en: 'Architecture → Visual Design → Software → Data → AI',
  fa: 'معماری → طراحی بصری → نرم‌افزار → داده → هوش مصنوعی',
}

const journeyMilestones: Record<Locale, readonly { title: string }[]> = {
  en: [
    { title: 'Architecture' },
    { title: 'Visual communication' },
    { title: 'Production software' },
    { title: 'Data systems' },
    { title: 'Applied AI' },
  ],
  fa: [
    { title: 'معماری' },
    { title: 'ارتباط تصویری' },
    { title: 'توسعه نرم‌افزار' },
    { title: 'سامانه‌های داده' },
    { title: 'هوش مصنوعی کاربردی' },
  ],
}

const publicationsTitle: Record<Locale, string> = {
  en: 'Selected publications',
  fa: 'انتشارات منتخب',
}

const viewAllPublications: Record<Locale, string> = {
  en: 'View all publications',
  fa: 'همهٔ انتشارات',
}

const manuscriptLabel: Record<Locale, string> = {
  en: 'Manuscript draft',
  fa: 'پیش‌نویس پژوهشی',
}

const publicationsDraftNote: Record<Locale, string> = {
  en: 'Manuscript records from seed — not peer-reviewed publications until approved.',
  fa: 'رکوردهای پیش‌نویس انگلیسی از seed — ترجمه و انتشار هنوز تأیید نشده است.',
}

/** writing.visual-discourse.en / writing.vtd-edge.en — EN-only manuscript records. */
const featuredPublicationsEn: readonly {
  slug: string
  title: string
  excerpt: string
  statusLabel: string
}[] = [
  {
    slug: 'visual-discourse-elections',
    title:
      'A Comparative Analysis of Reformist and Principlist Visual Discourses in Presidential Elections (1997–2017)',
    excerpt:
      'Research manuscript extending M.A. work on visual communication and comparative visual discourse analysis.',
    statusLabel: 'Manuscript in final revision',
  },
  {
    slug: 'vtd-edge-manuscript',
    title:
      'VTD-Edge: Reliable, Privacy-Preserving Persian NLP-to-SQL on Resource-Constrained Devices',
    excerpt:
      'Technical manuscript in preparation on reliable Persian NLP-to-SQL.',
    statusLabel: 'Manuscript in preparation',
  },
]

const exploreRailsTitle: Record<Locale, string> = {
  en: 'Explore more',
  fa: 'کاوش بیشتر',
}

/** seed.empty.teaching.{locale} / seed.empty.creative.{locale} — seed-backed unavailable states. */
const seedEmptyStates: Record<
  'teaching' | 'creative',
  Record<Locale, string>
> = {
  teaching: {
    en: 'No public teaching record is available yet.',
    fa: 'هنوز رکورد عمومی تأییدشده‌ای برای تدریس در دسترس نیست.',
  },
  creative: {
    en: 'Selected visual and design work will be added after authorship, credits, and publication rights are confirmed.',
    fa: 'آثار منتخب بصری و طراحی پس از تأیید مالکیت، اعتباردهی و حقوق انتشار اضافه می‌شوند.',
  },
}

/** route_copy excerpts for secondary home rails. */
const exploreRails: Record<
  Locale,
  readonly {
    pathSegment: 'creative' | 'writing' | 'teaching'
    title: string
    excerpt: string
    viewLabel: string
  }[]
> = {
  en: [
    {
      pathSegment: 'creative',
      title: 'Creative Work',
      excerpt:
        'Selected visual and design work, published only with clear rights and credits.',
      viewLabel: 'View gallery',
    },
    {
      pathSegment: 'writing',
      title: 'Writing',
      excerpt: 'Long-form technical and research writing.',
      viewLabel: 'View writing',
    },
    {
      pathSegment: 'teaching',
      title: 'Teaching',
      excerpt: 'Selected structured learning and professional development.',
      viewLabel: 'View teaching',
    },
  ],
  fa: [
    {
      pathSegment: 'creative',
      title: 'آثار خلاقه',
      excerpt:
        'آثار بصری و طراحی منتخب، فقط با حقوق و اعتبار روشن منتشر می‌شوند.',
      viewLabel: 'مشاهده گالری',
    },
    {
      pathSegment: 'writing',
      title: 'نوشتار',
      excerpt: 'نوشتارهای پژوهشی و فنی بلند.',
      viewLabel: 'مشاهده نوشتار',
    },
    {
      pathSegment: 'teaching',
      title: 'تدریس',
      excerpt:
        'منتخبی از آموزش‌های ساختاریافته و توسعه حرفه‌ای که مستقیماً از مسیر پژوهشی و مهندسی من پشتیبانی می‌کنند.',
      viewLabel: 'مشاهده تدریس',
    },
  ],
}

export interface HomeConstellationContent {
  sectionLabel: string
  heading: string
  research: HomeResearchContent
  nodes: ConstellationNode[]
}

export interface ResearchInterestCard {
  slug: string
  title: string
  excerpt: string
}

export interface HomeInterestsContent {
  sectionTitle: string
  sectionLead: string
  cards: readonly ResearchInterestCard[]
  fitTitle: string
  fitCopy: string
}

export interface HomeJourneyContent {
  title: string
  headline: string
  milestones: readonly { title: string }[]
}

export interface PublicationCard {
  slug: string
  title: string
  excerpt: string
  statusLabel: string
}

export interface HomePublicationsContent {
  title: string
  draftNote: string
  viewAll: string
  manuscriptLabel: string
  items: readonly PublicationCard[]
}

export interface ExploreRail {
  pathSegment: 'creative' | 'writing' | 'teaching'
  title: string
  excerpt: string
  viewLabel?: string
  /** seed-backed empty-state text; set only when the route is unavailable. */
  unavailableStatus?: string
  assetId: RuntimeAssetId
}

export interface HomeExploreContent {
  title: string
  rails: readonly ExploreRail[]
}

export function getHomeConstellationContent(
  locale: Locale,
): HomeConstellationContent {
  return {
    sectionLabel: researchTitle[locale],
    heading: researchExcerpt[locale],
    research: getHomeResearchContent(locale),
    nodes: buildConstellationNodes(
      locale === 'en'
        ? researchInterestsEn
        : focusChipsFa.map((label, index) => ({
            slug: researchInterestsEn[index]?.slug ?? `focus-${index}`,
            title: label,
          })),
    ),
  }
}

export function getHomeInterestsContent(locale: Locale): HomeInterestsContent {
  return {
    sectionTitle: interestsSectionTitle[locale],
    sectionLead: interestsSectionLead[locale],
    cards: locale === 'en' ? researchInterestsEn : [],
    fitTitle: researchFitTitle[locale],
    fitCopy: researchFitCopy[locale],
  }
}

export function getHomeJourneyContent(locale: Locale): HomeJourneyContent {
  return {
    title: journeyTitle[locale],
    headline: journeyHeadline[locale],
    milestones: journeyMilestones[locale],
  }
}

export function getHomePublicationsContent(
  locale: Locale,
): HomePublicationsContent {
  return {
    title: publicationsTitle[locale],
    draftNote: publicationsDraftNote[locale],
    viewAll: viewAllPublications[locale],
    manuscriptLabel: manuscriptLabel[locale],
    items: locale === 'en' ? featuredPublicationsEn : [],
  }
}

export function getHomeExploreContent(locale: Locale): HomeExploreContent {
  return {
    title: exploreRailsTitle[locale],
    rails: exploreRails[locale].map((rail) => {
      if (rail.pathSegment === 'writing') {
        return { ...rail, assetId: HOME_RAIL_ASSET_BY_PATH.writing }
      }
      return {
        ...rail,
        assetId: HOME_RAIL_ASSET_BY_PATH[rail.pathSegment],
        unavailableStatus: seedEmptyStates[rail.pathSegment][locale],
      }
    }),
  }
}

/** availability.phd-2027.{locale} — home collaboration band copy. */
const collaborationTitle: Record<Locale, string> = {
  en: '2027 Research Availability',
  fa: 'آمادگی برای فرصت‌های پژوهشی ۲۰۲۷',
}

const collaborationMessage: Record<Locale, string> = {
  en: 'Open to funded PhD and research opportunities for 2027 in Human-Centered AI, Human-AI Interaction, trustworthy AI, visual analytics, intelligent data systems, and digital health.',
  fa: 'برای فرصت‌های پژوهشی و دکترای دارای تأمین مالی در سال ۲۰۲۷ در حوزه‌های هوش مصنوعی انسان‌محور، تعامل انسان و هوش مصنوعی، هوش مصنوعی قابل‌اعتماد، تحلیل بصری، سامانه‌های هوشمند داده و سلامت دیجیتال آماده گفت‌وگو و همکاری هستم.',
}

export interface HomeCollaborationContent {
  title: string
  message: string
  connectLabel: string
  cvLabel: string
}

export function getHomeCollaborationContent(
  locale: Locale,
): HomeCollaborationContent {
  return {
    title: collaborationTitle[locale],
    message: collaborationMessage[locale],
    connectLabel: shellCopy.contact[locale],
    cvLabel: shellCopy.cv[locale],
  }
}
