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

export interface PublishedAboutProfile extends PublishedRecord {
  locale: Locale
  slug: string
  title: string
  excerpt?: string | null
  body?: string | null
  engineering_title?: string | null
  engineering_body?: string | null
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
    const profile = await parseJsonResponse<PublishedAboutProfile>(response)
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
  if (!body?.trim()) return []
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export async function resolveAboutAlternateAvailability(
  locale: Locale,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const result = await fetchAboutProfile(alternate)
  return result.status === 'ready'
}
