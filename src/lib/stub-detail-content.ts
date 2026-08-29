/**
 * Draft-safe stub detail records for home featured cards (seed v1.1 — not API).
 */

import {
  getHomeFeaturedContent,
  getHomePublicationsContent,
  type FeaturedProjectCard,
  type PublicationCard,
} from './home-content';
import type { Locale } from './navigation';

export const stubProjectSlugs = ['pars-sql-vtd-edge', 'organizational-dashboard-research'] as const;

export const stubPublicationSlugs = ['visual-discourse-elections', 'vtd-edge-manuscript'] as const;

export function getStubProject(locale: Locale, slug: string): FeaturedProjectCard | undefined {
  return getHomeFeaturedContent(locale).projects.find((project) => project.slug === slug);
}

export function getStubPublication(locale: Locale, slug: string): PublicationCard | undefined {
  return getHomePublicationsContent(locale).items.find((item) => item.slug === slug);
}

const stubDraftNote: Record<Locale, string> = {
  en: 'Draft preview from owner seed — not yet published via API.',
  fa: 'پیش‌نمایش پیش‌نویس از seed مالک — هنوز از API منتشر نشده است.',
};

const stubPublicationDraftNote: Record<Locale, string> = {
  en: 'Manuscript records from seed — not peer-reviewed publications until approved.',
  fa: 'رکوردهای پیش‌نویس انگلیسی از seed — ترجمه و انتشار هنوز تأیید نشده است.',
};

const backToProjects: Record<Locale, string> = {
  en: 'All projects',
  fa: 'همهٔ پروژه‌ها',
};

const backToWriting: Record<Locale, string> = {
  en: 'All writing',
  fa: 'همهٔ نوشتار',
};

const backToHome: Record<Locale, string> = {
  en: 'Home',
  fa: 'صفحهٔ اصلی',
};

export function getStubProjectDraftNote(locale: Locale): string {
  return stubDraftNote[locale];
}

export function getStubPublicationDraftNote(locale: Locale): string {
  return stubPublicationDraftNote[locale];
}

export function getStubBackToProjectsLabel(locale: Locale): string {
  return backToProjects[locale];
}

export function getStubBackToWritingLabel(locale: Locale): string {
  return backToWriting[locale];
}

export function getStubBackToHomeLabel(locale: Locale): string {
  return backToHome[locale];
}

export function listStubProjects(locale: Locale): FeaturedProjectCard[] {
  return getHomeFeaturedContent(locale).projects;
}

export function listStubPublications(locale: Locale): PublicationCard[] {
  return getHomePublicationsContent(locale).items;
}
