/**
 * Research page family loaders — topics, statements, and related projects (PUBLIC-201).
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

export type ResearchTopicListOut = components['schemas']['ResearchTopicListOut']
export type ResearchTopicDetailOut =
  components['schemas']['ResearchTopicDetailOut']
export type ResearchStatementOut = components['schemas']['ResearchStatementOut']
export type ProjectListOut = components['schemas']['ProjectListOut']

export type ResearchIndexModel =
  | { status: 'unavailable' }
  | {
      status: 'ready'
      topics: ResearchTopicListOut[]
      statement: ResearchStatementOut | null
      projects: ProjectListOut[]
    }

export type ResearchDetailKind = 'topic' | 'statement'

export type ResearchDetailModel =
  | { status: 'unavailable' }
  | {
      status: 'ready'
      kind: ResearchDetailKind
      record: ResearchTopicDetailOut | ResearchStatementOut
    }

const researchNavItem = primaryNav.find((item) => item.slug === 'research')

export function getResearchRouteTitle(locale: Locale): string {
  return (
    researchNavItem?.label[locale] ?? (locale === 'en' ? 'Research' : 'پژوهش')
  )
}

export function getResearchUnavailableCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: getResearchRouteTitle('en'),
        message: 'Published research content is not available yet.',
      }
    : {
        title: getResearchRouteTitle('fa'),
        message: 'محتوای منتشرشدهٔ پژوهشی هنوز در دسترس نیست.',
      }
}

export function getResearchEmptyTopicsCopy(locale: Locale): {
  title: string
  message: string
} {
  return locale === 'en'
    ? {
        title: 'No research topics yet',
        message:
          'Published research topics will appear here when they are available.',
      }
    : {
        title: 'هنوز موضوع پژوهشی منتشر نشده است',
        message:
          'موضوعات پژوهشی منتشرشده پس از آماده‌شدن در اینجا نمایش داده می‌شوند.',
      }
}

export function splitBodyParagraphs(body: string | null | undefined): string[] {
  if (!body?.trim()) return []
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  })
  return parseJsonResponse<T>(response)
}

async function fetchAllPagedItems<T extends { published_at?: string | null }>(
  pathPrefix: string,
): Promise<T[]> {
  const pageSize = 100
  let page = 1
  const collected: T[] = []

  while (true) {
    const query = `?page=${page}&page_size=${pageSize}`
    const payload = await fetchJson<{ count: number; items: T[] }>(
      `${pathPrefix}${query}`,
    )
    collected.push(...filterPublishedOnly(payload.items ?? []))
    if (
      collected.length >= (payload.count ?? 0) ||
      (payload.items?.length ?? 0) < pageSize
    ) {
      break
    }
    page += 1
  }

  return collected
}

export async function listResearchTopics(
  locale: Locale,
): Promise<ResearchTopicListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<ResearchTopicListOut>(
      `/api/research/topics/${locale}`,
    )
  } catch {
    return []
  }
}

export async function listResearchProjects(
  locale: Locale,
): Promise<ProjectListOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    return await fetchAllPagedItems<ProjectListOut>(
      `/api/research/projects/${locale}`,
    )
  } catch {
    return []
  }
}

export async function listResearchStatements(
  locale: Locale,
): Promise<ResearchStatementOut[]> {
  if (!canFetchPublicApi()) return []
  try {
    const statements = await fetchJson<ResearchStatementOut[]>(
      `/api/research/statements/${locale}`,
    )
    return filterPublishedOnly(Array.isArray(statements) ? statements : [])
  } catch {
    return []
  }
}

export async function fetchResearchIndex(
  locale: Locale,
): Promise<ResearchIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const [topics, projects, statements] = await Promise.all([
    listResearchTopics(locale),
    listResearchProjects(locale),
    listResearchStatements(locale),
  ])

  const statement = statements[0] ?? null

  if (!topics.length && !statement && !projects.length) {
    return { status: 'unavailable' }
  }

  return { status: 'ready', topics, statement, projects }
}

export async function getResearchTopic(
  locale: Locale,
  slug: string,
): Promise<ResearchTopicDetailOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const topic = await fetchJson<ResearchTopicDetailOut>(
      `/api/research/topics/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(topic)
    if (topic.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return topic
  } catch (error) {
    if (
      error instanceof PublicApiError &&
      (error.kind === 'unavailable' || error.status === 404)
    ) {
      return null
    }
    return null
  }
}

export async function getResearchStatement(
  locale: Locale,
  slug: string,
): Promise<ResearchStatementOut | null> {
  if (!canFetchPublicApi()) return null
  try {
    const statement = await fetchJson<ResearchStatementOut>(
      `/api/research/statements/${locale}/${encodeURIComponent(slug)}`,
    )
    assertPublishedOnly(statement)
    if (statement.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation')
    }
    return statement
  } catch {
    return null
  }
}

export async function fetchResearchDetail(
  locale: Locale,
  slug: string,
): Promise<ResearchDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' }
  }

  const topic = await getResearchTopic(locale, slug)
  if (topic) {
    return { status: 'ready', kind: 'topic', record: topic }
  }

  const statement = await getResearchStatement(locale, slug)
  if (statement) {
    return { status: 'ready', kind: 'statement', record: statement }
  }

  return { status: 'unavailable' }
}

export async function listResearchDetailSlugs(
  locale: Locale,
): Promise<string[]> {
  const [topics, statements] = await Promise.all([
    listResearchTopics(locale),
    listResearchStatements(locale),
  ])
  const slugs = new Set<string>()
  for (const topic of topics) slugs.add(topic.slug)
  for (const statement of statements) slugs.add(statement.slug)
  return [...slugs]
}

export async function resolveResearchAlternateAvailability(
  locale: Locale,
): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en'
  const model = await fetchResearchIndex(alternate)
  return model.status === 'ready'
}
