/**
 * Localized labels for CMS catalog tokens.
 *
 * The public API stores choice values (`metadata_only`, `book_chapter`).
 * Pages must show the same words a reader would see in either locale.
 * A value that is not one of those tokens is returned unchanged, so
 * already-written labels stay intact.
 */

import type { Locale } from './navigation'

type LabelPair = { en: string; fa: string }

const ACCESS_STATE: Record<string, LabelPair> = {
  public: { en: 'Public', fa: 'عمومی' },
  restricted: { en: 'Restricted', fa: 'محدود' },
  metadata_only: { en: 'Metadata only', fa: 'فقط فراداده' },
}

const PUBLICATION_TYPE: Record<string, LabelPair> = {
  journal: { en: 'Journal article', fa: 'مقالهٔ مجله' },
  conference: { en: 'Conference paper', fa: 'مقالهٔ کنفرانس' },
  book_chapter: { en: 'Book chapter', fa: 'فصل کتاب' },
  manuscript: { en: 'Manuscript', fa: 'دست‌نوشته' },
  other: { en: 'Other', fa: 'سایر' },
}

const ACADEMIC_STAGE: Record<string, LabelPair> = {
  preprint: { en: 'Preprint', fa: 'پیش‌چاپ' },
  in_press: { en: 'In press', fa: 'در نوبت چاپ' },
  published: { en: 'Published', fa: 'منتشرشده' },
  other: { en: 'Other', fa: 'سایر' },
}

const DOWNLOAD_TYPE: Record<string, LabelPair> = {
  pdf: { en: 'PDF', fa: 'PDF' },
  dataset: { en: 'Dataset', fa: 'مجموعهٔ داده' },
  code: { en: 'Code archive', fa: 'بایگانی کد' },
  archive: { en: 'Archive', fa: 'بایگانی' },
  other: { en: 'Other', fa: 'سایر' },
}

const COURSE_LEVEL: Record<string, LabelPair> = {
  beginner: { en: 'Beginner', fa: 'مقدماتی' },
  intermediate: { en: 'Intermediate', fa: 'متوسط' },
  advanced: { en: 'Advanced', fa: 'پیشرفته' },
  all_levels: { en: 'All levels', fa: 'همهٔ سطح‌ها' },
}

const COURSE_FORMAT: Record<string, LabelPair> = {
  online: { en: 'Online', fa: 'برخط' },
  in_person: { en: 'In person', fa: 'حضوری' },
  hybrid: { en: 'Hybrid', fa: 'ترکیبی' },
  self_paced: { en: 'Self-paced', fa: 'خودآموز' },
  workshop: { en: 'Workshop', fa: 'کارگاه' },
}

const COURSE_LANGUAGE: Record<string, LabelPair> = {
  fa: { en: 'Persian', fa: 'فارسی' },
  en: { en: 'English', fa: 'انگلیسی' },
  bilingual: { en: 'Bilingual', fa: 'دوزبانه' },
}

const AVAILABILITY: Record<string, LabelPair> = {
  public: { en: 'Public', fa: 'عمومی' },
  available_on_request: { en: 'Available on request', fa: 'با درخواست' },
  private: { en: 'Private', fa: 'خصوصی' },
  not_available: { en: 'Not available', fa: 'در دسترس نیست' },
  not_applicable: { en: 'Not applicable', fa: 'موضوعیت ندارد' },
  restricted: { en: 'Restricted', fa: 'محدود' },
}

const LICENSE: Record<string, LabelPair> = {
  'cc-by-4': { en: 'CC BY 4.0', fa: 'CC BY 4.0' },
  'cc-by-nc-4': { en: 'CC BY-NC 4.0', fa: 'CC BY-NC 4.0' },
  'all-rights-reserved': {
    en: 'All rights reserved',
    fa: 'همهٔ حقوق محفوظ است',
  },
}

const CREATIVE_WORK_TYPE: Record<string, LabelPair> = {
  design: { en: 'Design', fa: 'طراحی' },
  visual: { en: 'Visual', fa: 'تصویری' },
  photography: { en: 'Photography', fa: 'عکاسی' },
  experiment: { en: 'Experiment', fa: 'تجربه' },
  other: { en: 'Other', fa: 'سایر' },
}

function lookup(
  table: Record<string, LabelPair>,
  value: string | null | undefined,
  locale: Locale,
): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const known = table[raw.toLowerCase()]
  if (!known) return raw
  return known[locale]
}

export function formatAccessState(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(ACCESS_STATE, value, locale)
}

export function formatPublicationType(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(PUBLICATION_TYPE, value, locale)
}

export function formatAcademicStage(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(ACADEMIC_STAGE, value, locale)
}

export function formatDownloadType(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(DOWNLOAD_TYPE, value, locale)
}

export function formatCourseLevel(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(COURSE_LEVEL, value, locale)
}

export function formatCourseFormat(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(COURSE_FORMAT, value, locale)
}

export function formatCourseLanguage(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(COURSE_LANGUAGE, value, locale)
}

export function formatAvailability(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(AVAILABILITY, value, locale)
}

export function formatLicense(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(LICENSE, value, locale)
}

export function formatCreativeWorkType(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  return lookup(CREATIVE_WORK_TYPE, value, locale)
}
