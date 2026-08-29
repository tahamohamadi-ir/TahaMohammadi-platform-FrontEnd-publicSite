/** Primary navigation — paths from ROUTE-REGISTRY; labels from seed route_copy titles. */

export type Locale = 'en' | 'fa';

/** Approved structural role line for the language gateway (design authority). */
export const GATEWAY_ROLE_LINE = 'Researcher · Engineer · Designer';

export interface NavItem {
  slug: string;
  pathSegment: string;
  label: Record<Locale, string>;
}

export const primaryNav: NavItem[] = [
  { slug: 'about', pathSegment: 'about', label: { en: 'About', fa: 'درباره' } },
  { slug: 'research', pathSegment: 'research', label: { en: 'Research', fa: 'پژوهش' } },
  { slug: 'projects', pathSegment: 'projects', label: { en: 'Projects', fa: 'پروژه‌ها' } },
  { slug: 'creative', pathSegment: 'creative', label: { en: 'Creative', fa: 'آثار خلاقه' } },
  { slug: 'writing', pathSegment: 'writing', label: { en: 'Writing', fa: 'نوشتار' } },
  { slug: 'teaching', pathSegment: 'teaching', label: { en: 'Teaching', fa: 'تدریس' } },
];

export function localePath(locale: Locale, pathSegment = ''): string {
  if (!pathSegment) return `/${locale}/`;
  return `/${locale}/${pathSegment}/`;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'en' ? 'fa' : 'en';
}

export function isNavActive(pathname: string, locale: Locale, pathSegment: string): boolean {
  const base = localePath(locale, pathSegment);
  return pathname === base || pathname.startsWith(`${base}`);
}

/** Shell chrome copy — aligned with owner-content-seed-v1 route_copy and availability drafts. */
export const shellCopy = {
  skipLink: {
    en: 'Skip to main content',
    fa: 'رفتن به محتوای اصلی',
  },
  mainMenu: { en: 'Main menu', fa: 'منوی اصلی' },
  menuToggle: { en: 'Menu', fa: 'منو' },
  localeSwitch: { en: 'فارسی', fa: 'English' },
  footerCta: {
    en: 'Open to funded PhD and research opportunities for 2027 in Human-Centered AI, Human-AI Interaction, trustworthy AI, visual analytics, intelligent data systems, and digital health.',
    fa: 'برای فرصت‌های پژوهشی و دکترای دارای تأمین مالی در سال ۲۰۲۷ در حوزه‌های هوش مصنوعی انسان‌محور، تعامل انسان و هوش مصنوعی، هوش مصنوعی قابل‌اعتماد، تحلیل بصری، سامانه‌های هوشمند داده و سلامت دیجیتال آماده گفت‌وگو و همکاری هستم.',
  },
  footerExplore: { en: 'Explore', fa: 'بخش‌ها' },
  footerConnect: { en: 'Connect', fa: 'ارتباط' },
  contact: { en: 'Contact', fa: 'تماس' },
  cv: { en: 'CV', fa: 'رزومه' },
  brandName: { en: 'Taha Mohammadi', fa: 'طه محمدی' },
  themeToggle: { en: 'Toggle color theme', fa: 'تغییر پوستهٔ رنگی' },
} as const satisfies Record<string, Record<Locale, string>>;
