/**
 * Projects page family loaders — canonical `/api/projects/*` (PUBLIC-210).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import type { components } from '../generated/public-api'
import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import { primaryNav, type Locale } from './navigation'

export type ProjectListOut = components['schemas']['ProjectListOut']
export type ProjectDetailOut = components['schemas']['ProjectDetailOut']

export type ProjectsIndexModel =
  { status: 'unavailable' } | { status: 'ready'; projects: ProjectListOut[] }

export type ProjectDetailModel =
  { status: 'unavailable' } | { status: 'ready'; project: ProjectDetailOut }

const projectsNavItem = primaryNav.find((item) => item.slug === 'projects')

export function getProjectsRouteTitle(locale: Locale): string {
  return (
    projectsNavItem?.label[locale] ??
    (locale === 'en' ? 'Projects' : 'پروژه‌ها')
  )
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

export function getProjectsUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getProjectsRouteTitle('en'),
        message: 'Published projects are not available yet.',
      }
    : {
        title: getProjectsRouteTitle('fa'),
        message: 'پروژه‌های منتشرشده هنوز در دسترس نیست.',
      }
}

export async function listProjects(locale: Locale): Promise<ProjectListOut[]> {
  if (!canFetchPublicApi()) return []
  const pageSize = 100
  let page = 1
  const collected: ProjectListOut[] = []

  try {
    while (true) {
      const payload = await fetchJson<
        components['schemas']['PagedProjectListOut']
      >(`/api/projects/${locale}?page=${page}&page_size=${pageSize}`)
      collected.push(...filterPublishedOnly(payload.items ?? []))
      if (
        collected.length >= (payload.count ?? 0) ||
        (payload.items?.length ?? 0) < pageSize
      ) {
        break
      }
      page += 1
    }
  } catch {
    return []
  }

  return collected
}

export async function fetchProjectsIndex(
  locale: Locale,
): Promise<ProjectsIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const projects = await listProjects(locale)
  if (!projects.length) {
    return { status: 'unavailable' }
  }

  return { status: 'ready', projects }
}

export async function fetchProjectDetail(
  locale: Locale,
  slug: string,
): Promise<ProjectDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  try {
    const project = await fetchJson<ProjectDetailOut>(
      `/api/projects/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(project)
    if (project.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return { status: 'ready', project }
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return { status: 'unavailable' }
    }
    return { status: 'unavailable' }
  }
}

export async function listProjectSlugs(locale: Locale): Promise<string[]> {
  const projects = await listProjects(locale)
  return projects.map((item) => item.slug)
}

export async function resolveProjectsAlternateAvailability(
  locale: Locale,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const model = await fetchProjectsIndex(alternate)
  return model.status === 'ready'
}

const PROJECT_TYPE_LABELS: Record<string, { en: string; fa: string }> = {
  ai: { en: 'AI', fa: 'هوش مصنوعی' },
  design: { en: 'Design', fa: 'طراحی' },
  research: { en: 'Research', fa: 'پژوهش' },
  software: { en: 'Software', fa: 'نرم‌افزار' },
  data: { en: 'Data systems', fa: 'سامانه‌های داده' },
  public: { en: 'Public', fa: 'عمومی' },
}

const AVAILABILITY_LABELS: Record<string, { en: string; fa: string }> = {
  public: { en: 'Public', fa: 'عمومی' },
  open: { en: 'Open', fa: 'باز' },
  open_source: { en: 'Open source', fa: 'متن‌باز' },
  available_on_request: { en: 'On request', fa: 'با درخواست' },
  restricted: { en: 'Restricted', fa: 'محدود' },
  private: { en: 'Private', fa: 'خصوصی' },
  live: { en: 'Live demo', fa: 'نسخهٔ نمایشی' },
}

const NEGATIVE_AVAILABILITY = new Set([
  'not_available',
  'not_applicable',
  'none',
  'unavailable',
  '',
])

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase())
}

/** Human-readable, localized project type (never a raw enum token). */
export function formatProjectType(
  value: string | null | undefined,
  locale: Locale = 'en',
): string {
  const token = (value ?? '').trim().toLowerCase()
  if (!token) return ''
  return PROJECT_TYPE_LABELS[token]?.[locale] ?? humanizeToken(token)
}

/**
 * Human-readable availability summary. Negative states (`not_available`,
 * `not_applicable`, `none`) are omitted instead of being printed as raw enum
 * tokens; unknown values are humanized rather than shown verbatim.
 */
export function formatProjectAvailability(
  project: ProjectListOut | ProjectDetailOut,
  locale: Locale = 'en',
): string {
  return [
    project.code_availability,
    project.data_availability,
    project.demo_availability,
  ]
    .map((value) => (value ?? '').trim().toLowerCase())
    .filter((value) => !NEGATIVE_AVAILABILITY.has(value))
    .map(
      (value) => AVAILABILITY_LABELS[value]?.[locale] ?? humanizeToken(value),
    )
    .join(' · ')
}
