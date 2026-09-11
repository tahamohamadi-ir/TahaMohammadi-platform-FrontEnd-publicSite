/**
 * About profile loader — fetches only `/api/profiles/{locale}/about` (PUBLIC-200).
 * Renders unavailable when the published profile is absent; never substitutes seed/API draft data.
 */

import {
  assertPublishedOnly,
  parseJsonResponse,
  PublicApiError,
  type PublishedRecord,
} from './api/client'
import { splitAuthoredParagraphs } from './authored-text'
import type { Locale } from './navigation'

function resolveApiBaseUrl(): string {
  return String(import.meta.env.PUBLIC_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
}

/** Minimal published profile shape consumed by the About page (Gap A may extend OpenAPI later). */
export interface AboutEducationEntry {
  id: string
  title: string
  institution?: string | null
  period?: string | null
  summary?: string | null
}

export interface AboutExperienceEntry {
  id: string
  title: string
  organization?: string | null
  period?: string | null
  summary?: string | null
}

/**
 * Normalized published profile consumed by the About page. The public API
 * returns camelCase keys (`shortBio`, `longBio`, `publishedAt`); this model
 * exposes the page-facing names and keeps `published_at` for the shared
 * published-only assertion.
 */
export interface PublishedAboutProfile extends PublishedRecord {
  locale: Locale
  slug: string
  title: string
  excerpt?: string | null
  body?: string | null
  engineering_title?: string | null
  engineering_body?: string | null
  availability?: string | null
  education?: AboutEducationEntry[]
  experience?: AboutExperienceEntry[]
}

export type AboutPageModel =
  | { status: 'ready'; profile: PublishedAboutProfile }
  | { status: 'unavailable' }

const aboutRouteTitle: Record<Locale, string> = {
  en: 'About',
  fa: 'درباره',
}

export function getAboutRouteTitle(locale: Locale): string {
  return aboutRouteTitle[locale]
}

/** Honest unavailable copy — state message only, not profile content. */
export function getAboutUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: aboutRouteTitle.en,
        message: 'The published about profile is not available yet.',
      }
    : {
        title: aboutRouteTitle.fa,
        message: 'پروفایل منتشرشدهٔ درباره هنوز در دسترس نیست.',
      }
}

export async function fetchAboutProfile(
  locale: Locale,
): Promise<AboutPageModel> {
  const baseUrl = resolveApiBaseUrl()
  const path = `/api/profiles/${locale}/about`
  const url = baseUrl ? `${baseUrl}${path}` : path

  if (!baseUrl && !import.meta.env.DEV) {
    return { status: 'unavailable' }
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    const raw = await parseJsonResponse<Record<string, unknown>>(response)
    const asString = (value: unknown): string =>
      typeof value === 'string' ? value : ''
    const asNullable = (value: unknown): string | null =>
      typeof value === 'string' && value.trim() ? value : null
    const mapEntries = <T>(
      value: unknown,
      map: (item: Record<string, unknown>) => T,
    ): T[] =>
      Array.isArray(value)
        ? value
            .filter(
              (item): item is Record<string, unknown> =>
                Boolean(item) && typeof item === 'object',
            )
            .map(map)
        : []
    const profile: PublishedAboutProfile = {
      locale: (typeof raw.locale === 'string' ? raw.locale : locale) as Locale,
      slug: asString(raw.slug),
      title: asString(raw.title) || getAboutRouteTitle(locale),
      excerpt: asNullable(raw.shortBio),
      body: asNullable(raw.longBio),
      engineering_title: null,
      engineering_body: null,
      availability: asNullable(raw.availability),
      published_at: asNullable(raw.publishedAt),
      education: mapEntries(raw.education, (item) => ({
        id: asString(item.slug),
        title: asString(item.degree) || asString(item.field),
        institution: asNullable(item.institution),
        period: asNullable(item.period),
        summary: asNullable(item.thesis),
      })),
      experience: mapEntries(raw.experience, (item) => ({
        id: asString(item.slug),
        title: asString(item.role),
        organization: asNullable(item.organization),
        period: asNullable(item.period),
        summary:
          Array.isArray(item.bullets) && typeof item.bullets[0] === 'string'
            ? item.bullets[0]
            : null,
      })),
    }
    assertPublishedOnly(profile)
    if (profile.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return { status: 'ready', profile }
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return { status: 'unavailable' }
    }
    if (
      error instanceof PublicApiError &&
      (error.kind === 'network' || error.kind === 'validation')
    ) {
      return { status: 'unavailable' }
    }
    return { status: 'unavailable' }
  }
}

export function splitBodyParagraphs(body: string | null | undefined): string[] {
  return splitAuthoredParagraphs(body)
}

export async function resolveAboutAlternateAvailability(
  locale: Locale,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const result = await fetchAboutProfile(alternate)
  return result.status === 'ready'
}
