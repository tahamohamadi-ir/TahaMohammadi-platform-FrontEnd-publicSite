/** Primary navigation — paths from ROUTE-REGISTRY; labels from seed route_copy titles. */

export type Locale = 'en' | 'fa'

/** Approved structural role line for the language gateway (design authority). */
export const GATEWAY_ROLE_LINE = 'Researcher · Engineer · Designer'

export interface NavItem {
  slug: string
  pathSegment: string
  label: Record<Locale, string>
}

/** Footer resource links — structural navigation, not CMS records. */
export const footerResourceNav: NavItem[] = [
  {
    slug: 'cv',
    pathSegment: 'cv',
    label: { en: 'Academic CV', fa: 'رزومه آکادمیک' },
  },
  {
    slug: 'publications',
    pathSegment: 'publications',
    label: { en: 'Publications', fa: 'انتشارات' },
  },
  {
    slug: 'teaching',
    pathSegment: 'education',
    label: { en: 'Education', fa: 'آموزش' },
  },
]

export const primaryNav: NavItem[] = [
  { slug: 'about', pathSegment: 'about', label: { en: 'About', fa: 'درباره' } },
  {
    slug: 'research',
    pathSegment: 'research',
    label: { en: 'Research', fa: 'پژوهش' },
  },
  {
    slug: 'projects',
    pathSegment: 'projects',
    label: { en: 'Projects', fa: 'پروژه‌ها' },
  },
  {
    slug: 'creative',
    pathSegment: 'gallery',
    label: { en: 'Gallery', fa: 'گالری' },
  },
  {
    slug: 'writing',
    pathSegment: 'blog',
    label: { en: 'Blog', fa: 'وبلاگ' },
  },
  {
    slug: 'teaching',
    pathSegment: 'education',
    label: { en: 'Education', fa: 'آموزش' },
  },
]

export function localePath(locale: Locale, pathSegment = ''): string {
  if (!pathSegment) return `/${locale}/`
  return `/${locale}/${pathSegment}/`
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'en' ? 'fa' : 'en'
}

export function localeDisplayCode(locale: Locale): 'EN' | 'FA' {
  return locale === 'en' ? 'EN' : 'FA'
}

export function buildLanguageToggleHref(
  currentLocale: Locale,
  pathSegment: string,
  alternateAvailable: boolean,
): string | undefined {
  if (!alternateAvailable) return undefined
  return localePath(alternateLocale(currentLocale), pathSegment)
}

export function isNavActive(
  pathname: string,
  locale: Locale,
  pathSegment: string,
): boolean {
  const base = localePath(locale, pathSegment)
  return pathname === base || pathname.startsWith(`${base}`)
}

/** Shell chrome copy — aligned with owner-content-seed-v1 route_copy and availability drafts. */
export const shellCopy = {
  skipLink: {
    en: 'Skip to main content',
    fa: 'رفتن به محتوای اصلی',
  },
  mainMenu: { en: 'Main menu', fa: 'منوی اصلی' },
  menuToggle: { en: 'Menu', fa: 'منو' },
  localeSwitch: { en: 'Language', fa: 'زبان' },
  localeUnavailable: {
    en: 'Persian version not available for this page',
    fa: 'نسخهٔ انگلیسی برای این صفحه در دسترس نیست',
  },
  footerCta: {
    en: 'Open to funded PhD and research opportunities for 2027 in Human-Centered AI, Human-AI Interaction, trustworthy AI, visual analytics, intelligent data systems, and digital health.',
    fa: 'برای فرصت‌های پژوهشی و دکترای دارای تأمین مالی در سال ۲۰۲۷ در حوزه‌های هوش مصنوعی انسان‌محور، تعامل انسان و هوش مصنوعی، هوش مصنوعی قابل‌اعتماد، تحلیل بصری، سامانه‌های هوشمند داده و سلامت دیجیتال آماده گفت‌وگو و همکاری هستم.',
  },
  footerExplore: { en: 'Explore', fa: 'بخش‌ها' },
  footerResources: { en: 'Resources', fa: 'منابع' },
  footerConnect: { en: 'Connect', fa: 'ارتباط' },
  footerSocialGithub: { en: 'GitHub', fa: 'گیت‌هاب' },
  footerSocialLinkedin: { en: 'LinkedIn', fa: 'لینکدین' },
  footerSocialEmail: { en: 'Email', fa: 'ایمیل' },
  footerContactEmailPlaceholder: {
    en: 'Email — pending CMS publication',
    fa: 'ایمیل — منتظر انتشار CMS',
  },
  footerContactLocationPlaceholder: {
    en: 'Location — pending CMS publication',
    fa: 'موقعیت — منتظر انتشار CMS',
  },
  footerLocation: { en: 'Location', fa: 'موقعیت' },
  footerSocialPendingNote: {
    en: 'Social links pending CMS publication',
    fa: 'پیوندهای اجتماعی منتظر انتشار CMS',
  },
  contact: { en: 'Contact', fa: 'تماس' },
  cv: { en: 'CV', fa: 'رزومه' },
  brandName: { en: 'Taha Mohammadi', fa: 'طه محمدی' },
  themeToggle: { en: 'Toggle color theme', fa: 'تغییر پوستهٔ رنگی' },
} as const satisfies Record<string, Record<Locale, string>>
