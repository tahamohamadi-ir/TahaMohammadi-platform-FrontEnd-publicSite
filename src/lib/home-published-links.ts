/**
 * Home featured-card link resolution — only link when slug exists in published API (F-16).
 */

import { localePath, type Locale } from './navigation'
import { listProjectSlugs } from './projects-content'
import { listArticleSlugs } from './writing-content'

export interface PublishedHomeLinkSlugs {
  projectSlugs: ReadonlySet<string>
  articleSlugs: ReadonlySet<string>
}

export async function fetchPublishedHomeLinkSlugs(
  locale: Locale,
): Promise<PublishedHomeLinkSlugs> {
  const [projectSlugs, articleSlugs] = await Promise.all([
    listProjectSlugs(locale),
    listArticleSlugs(locale),
  ])
  return {
    projectSlugs: new Set(projectSlugs),
    articleSlugs: new Set(articleSlugs),
  }
}

export function resolveFeaturedProjectHref(
  locale: Locale,
  slug: string,
  publishedSlugs: ReadonlySet<string>,
): string | undefined {
  if (!publishedSlugs.has(slug)) return undefined
  return localePath(locale, `projects/${slug}`)
}

export function resolveFeaturedPublicationHref(
  locale: Locale,
  slug: string,
  publishedSlugs: ReadonlySet<string>,
): string | undefined {
  if (!publishedSlugs.has(slug)) return undefined
  return localePath(locale, `blog/${slug}`)
}
