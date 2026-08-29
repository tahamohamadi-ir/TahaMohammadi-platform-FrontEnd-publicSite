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

/** research.statement.{locale}.title */
const researchTitle: Record<Locale, string> = {
  en: 'Research Statement',
  fa: 'بیانیه پژوهشی',
};

/** research.statement.{locale}.excerpt */
const researchExcerpt: Record<Locale, string> = {
  en: 'How can intelligent systems extend human capability without obscuring evidence, uncertainty, or control?',
  fa: 'سامانه‌های هوشمند چگونه می‌توانند توانایی انسان را افزایش دهند، بدون آن‌که شواهد، عدم‌قطعیت یا کنترل را پنهان کنند؟',
};

/** research.statement.{locale}.body_markdown — first paragraph only for home. */
const researchLead: Record<Locale, string> = {
  en: 'My research interest is centered on a practical question: how can intelligent systems extend human capability without obscuring evidence, uncertainty, or control?',
  fa: 'محور اصلی علاقه پژوهشی من یک پرسش عملی است: سامانه‌های هوشمند چگونه می‌توانند توانایی انسان را افزایش دهند، بدون آن‌که شواهد، عدم‌قطعیت یا امکان کنترل را پنهان کنند؟',
};

const researchCta: Record<Locale, string> = {
  en: 'Read research profile',
  fa: 'مشاهدهٔ پروژه‌های پژوهشی',
};

const featuredTitle: Record<Locale, string> = {
  en: 'Featured projects',
  fa: 'پروژه‌های برجسته',
};

const featuredDraftNote: Record<Locale, string> = {
  en: 'Draft preview from owner seed — not yet published via API.',
  fa: 'پیش‌نمایش پیش‌نویس از seed مالک — هنوز از API منتشر نشده است.',
};

const viewAllProjects: Record<Locale, string> = {
  en: 'View all projects',
  fa: 'همهٔ پروژه‌ها',
};

export interface FeaturedProjectCard {
  slug: string;
  title: string;
  excerpt: string;
  statusLabel: string;
}

/** Public draft-safe featured projects from seed v1.1 (not API-backed). */
const featuredProjects: Record<Locale, FeaturedProjectCard[]> = {
  en: [
    {
      slug: 'pars-sql-vtd-edge',
      title: 'PARS-SQL / VTD-Edge',
      excerpt: 'Reliable Persian natural-language interaction with structured data.',
      statusLabel: 'Ongoing research and engineering project',
    },
    {
      slug: 'organizational-dashboard-research',
      title: 'Organizational Dashboard Research & Design',
      excerpt: 'Research and design across nine organizational dashboard suites.',
      statusLabel: '2022–2025',
    },
  ],
  fa: [
    {
      slug: 'pars-sql-vtd-edge',
      title: 'PARS-SQL / VTD-Edge',
      excerpt: 'تعامل قابل‌اعتماد زبان طبیعی فارسی با داده‌های ساختاریافته.',
      statusLabel: 'پروژه پژوهشی و مهندسی در حال توسعه',
    },
    {
      slug: 'organizational-dashboard-research',
      title: 'پژوهش و طراحی داشبوردهای سازمانی',
      excerpt: 'پژوهش و طراحی در نه مجموعه داشبورد سازمانی.',
      statusLabel: '۱۴۰۱–۱۴۰۴',
    },
  ],
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

export interface HomeResearchContent {
  title: string;
  excerpt: string;
  lead: string;
  cta: string;
}

export interface HomeFeaturedContent {
  title: string;
  draftNote: string;
  viewAll: string;
  projects: FeaturedProjectCard[];
}

export function getHomeResearchContent(locale: Locale): HomeResearchContent {
  return {
    title: researchTitle[locale],
    excerpt: researchExcerpt[locale],
    lead: researchLead[locale],
    cta: researchCta[locale],
  };
}

export function getHomeFeaturedContent(locale: Locale): HomeFeaturedContent {
  return {
    title: featuredTitle[locale],
    draftNote: featuredDraftNote[locale],
    viewAll: viewAllProjects[locale],
    projects: featuredProjects[locale],
  };
}
