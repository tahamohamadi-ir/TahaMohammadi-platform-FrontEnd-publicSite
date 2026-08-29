/**
 * Scaffold copy from content-records.v1.1-seed.json (draft — not published API).
 * Do not treat as live CMS data until owner approval and publication gate pass.
 */

import type { Locale } from './navigation';

/** profile.identity.{locale}.data.name */
const displayName: Record<Locale, string> = {
  en: 'Taha Mohammadi',
  fa: 'طه محمدی',
};

/** route.home.{locale}.body_markdown */
const introCopy: Record<Locale, string> = {
  en: 'I work across software engineering, AI, data systems, visual analytics, and interaction design—with a focus on systems that remain inspectable, controllable, and useful in real decisions.',
  fa: 'در مرز مهندسی نرم‌افزار، هوش مصنوعی، سامانه‌های داده، تحلیل بصری و طراحی تعامل کار می‌کنم؛ با تمرکز بر سامانه‌هایی که در تصمیم‌های واقعی قابل‌فهم، کنترل‌پذیر و مفید باقی بمانند.',
};

/** Home research-focus slot — research.focus.*.en titles (EN-only records in seed). */
const focusChipsEn = [
  'Human-Centered AI',
  'Trustworthy & Controllable AI',
  'Visual Analytics & Decision Support',
] as const;

/** Hero CTA labels — structural navigation; EN matches home concept, FA from route_copy titles. */
const ctaLabels: Record<Locale, { research: string; cv: string; contact: string }> = {
  en: {
    research: 'Research Profile',
    cv: 'Academic CV',
    contact: 'Contact',
  },
  fa: {
    research: 'پژوهش',
    cv: 'رزومه',
    contact: 'تماس',
  },
};

const focusAreasLabel: Record<Locale, string> = {
  en: 'Focus areas',
  fa: 'حوزه‌های تمرکز',
};

export interface HomeHeroContent {
  name: string;
  namePrimary: string;
  nameAccent: string;
  intro: string;
  focusChips: readonly string[];
  focusAreasLabel: string;
  ctas: { research: string; cv: string; contact: string };
}

export function getHomeHeroContent(locale: Locale): HomeHeroContent {
  const name = displayName[locale];

  if (locale === 'en') {
    const [given, ...rest] = name.split(' ');
    return {
      name,
      namePrimary: given,
      nameAccent: rest.length > 0 ? ` ${rest.join(' ')}` : '',
      intro: introCopy.en,
      focusChips: focusChipsEn,
      focusAreasLabel: focusAreasLabel.en,
      ctas: ctaLabels.en,
    };
  }

  return {
    name,
    namePrimary: name,
    nameAccent: '',
    intro: introCopy.fa,
    focusChips: [],
    focusAreasLabel: focusAreasLabel.fa,
    ctas: ctaLabels.fa,
  };
}
