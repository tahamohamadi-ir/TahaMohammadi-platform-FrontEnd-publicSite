/** Home reads only published, exact-locale CMS projections. No seed fallback. */
import type { components } from '../generated/public-api'
import type { Locale } from './navigation'
import type { RuntimeAssetId } from './media/authority-checksums'
import { parseJsonResponse } from './api/client'
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url'
import {
  fetchLocalizedSiteSettings,
  getManagedCopy,
} from './site-settings-content'
import { listResearchTopics, listResearchStatements } from './research-content'
import { fetchRecordResolutions, workRefToHref } from './hero-graph-content'

export type ProfileOut = components['schemas']['ProfileOut']
export type HomeCompositionOut = components['schemas']['HomeCompositionOut']
export type LandingOut = components['schemas']['LandingOut']
type WorkRef = components['schemas']['WorkRefOut']

async function read<T>(path: string): Promise<T | null> {
  if (!canFetchPublicApi()) return null
  try {
    return await parseJsonResponse<T>(
      await fetch(buildPublicApiUrl(path), {
        headers: { Accept: 'application/json' },
      }),
    )
  } catch {
    return null
  }
}
export async function fetchPrimaryProfile(
  locale: Locale,
): Promise<ProfileOut | null> {
  const profiles = await read<ProfileOut[]>('/api/profiles/' + locale)
  return Array.isArray(profiles)
    ? (profiles.find(
        (item) => item.locale === locale && item.published_at != null,
      ) ?? null)
    : null
}
export async function fetchHomeComposition(
  locale: Locale,
): Promise<HomeCompositionOut | null> {
  return read<HomeCompositionOut>('/api/home-composition/' + locale)
}
export async function fetchHomeLanding(
  locale: Locale,
): Promise<LandingOut | null> {
  const landing = await read<LandingOut>('/api/landings/' + locale + '/home')
  return landing?.locale === locale && landing.published_at != null
    ? landing
    : null
}
export interface HomeHeroContent {
  name: string
  namePrimary: string
  nameAccent: string
  role: string
  intro: string
  focusChips: readonly string[]
  focusAreasLabel: string
}
export async function getHomeHeroContent(
  locale: Locale,
): Promise<HomeHeroContent> {
  const [settings, profile, landing, topics, copy] = await Promise.all([
    fetchLocalizedSiteSettings(locale),
    fetchPrimaryProfile(locale),
    fetchHomeLanding(locale),
    listResearchTopics(locale),
    getManagedCopy(locale),
  ])
  const localized = settings?.locale === locale ? settings : null
  const name = localized?.brandName ?? profile?.title ?? ''
  const [given, ...rest] = name.split(' ')
  return {
    name,
    namePrimary: locale === 'en' ? given : name,
    nameAccent: locale === 'en' && rest.length ? ' ' + rest.join(' ') : '',
    role: localized?.tagline ?? '',
    intro: landing?.body ?? '',
    focusChips: topics
      .filter((item) => item.locale === locale)
      .map((item) => item.title),
    focusAreasLabel: copy['hero.focus_areas'] ?? '',
  }
}
export const loadHomeHeroContent = getHomeHeroContent
export interface HomeResearchContent {
  title: string
  excerpt: string
  lead: string
}
export async function getHomeResearchContent(
  locale: Locale,
): Promise<HomeResearchContent> {
  const statements = await listResearchStatements(locale)
  const statement = statements.find((item) => item.locale === locale)
  return {
    title: statement?.title ?? '',
    excerpt: statement?.body ?? '',
    lead: statement?.body ?? '',
  }
}
export interface FeaturedProjectCard {
  slug: string
  title: string
  excerpt: string
  statusLabel: string
  tags: readonly string[]
  assetId?: RuntimeAssetId
  href?: string
}
export interface HomeFeaturedContent {
  title: string
  draftNote: string
  viewAll: string
  viewProject: string
  projects: FeaturedProjectCard[]
}
async function featured(
  locale: Locale,
): Promise<Array<WorkRef & { href: string }>> {
  const settings = await fetchLocalizedSiteSettings(locale)
  if (settings?.locale !== locale) return []
  // Additive settings field supplied by the coordinated backend packet.
  const refs = (
    settings as typeof settings & {
      featuredRecords?: Array<{ family: string; id: string }>
    }
  ).featuredRecords
  if (!Array.isArray(refs) || !refs.length) return []
  const resolved = await fetchRecordResolutions(locale, refs)
  return refs.flatMap((ref) => {
    const item = resolved.get(ref.family + ':' + ref.id)
    const href = workRefToHref(item, locale)
    return item && href ? [{ ...item, href }] : []
  })
}
export async function getHomeFeaturedContent(
  locale: Locale,
): Promise<HomeFeaturedContent> {
  const [records, copy] = await Promise.all([
    featured(locale),
    getManagedCopy(locale),
  ])
  return {
    title: copy['home.projects.title'] ?? '',
    draftNote: '',
    viewAll: copy['home.projects.view_all'] ?? '',
    viewProject: copy['home.projects.view_record'] ?? '',
    projects: records
      .filter((item) => item.family === 'project')
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        excerpt: item.summary,
        statusLabel: '',
        tags: [],
        href: item.href,
      })),
  }
}
export interface ResearchInterestCard {
  slug: string
  title: string
  excerpt: string
}
export interface HomeInterestsContent {
  sectionTitle: string
  sectionLead: string
  cards: readonly ResearchInterestCard[]
  fitTitle: string
  fitCopy: string
}
export async function getHomeInterestsContent(
  locale: Locale,
): Promise<HomeInterestsContent> {
  const [topics, copy] = await Promise.all([
    listResearchTopics(locale),
    getManagedCopy(locale),
  ])
  return {
    sectionTitle: copy['home.interests.title'] ?? '',
    sectionLead: copy['home.interests.lead'] ?? '',
    cards: topics
      .filter((item) => item.locale === locale)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        excerpt: item.summary,
      })),
    fitTitle: copy['home.interests.fit_title'] ?? '',
    fitCopy: copy['home.interests.fit_body'] ?? '',
  }
}
export interface HomeJourneyContent {
  title: string
  headline: string
  milestones: readonly { title: string }[]
}
export async function getHomeJourneyContent(
  locale: Locale,
): Promise<HomeJourneyContent> {
  const copy = await getManagedCopy(locale)
  // Public ProfileOut has no timeline fields; do not fabricate timeline records.
  return {
    title: copy['home.journey.title'] ?? '',
    headline: copy['home.journey.headline'] ?? '',
    milestones: [],
  }
}
export interface PublicationCard {
  slug: string
  title: string
  excerpt: string
  statusLabel: string
  href?: string
}
export interface HomePublicationsContent {
  title: string
  draftNote: string
  viewAll: string
  manuscriptLabel: string
  items: PublicationCard[]
}
export async function getHomePublicationsContent(
  locale: Locale,
): Promise<HomePublicationsContent> {
  const [records, copy] = await Promise.all([
    featured(locale),
    getManagedCopy(locale),
  ])
  return {
    title: copy['home.publications.title'] ?? '',
    draftNote: '',
    viewAll: copy['home.publications.view_all'] ?? '',
    manuscriptLabel: '',
    items: records
      .filter((item) => item.family === 'publication')
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        excerpt: item.summary,
        statusLabel: '',
        href: item.href,
      })),
  }
}
export interface ExploreRail {
  pathSegment: 'gallery' | 'blog' | 'education'
  title: string
  excerpt: string
  viewLabel?: string
  unavailableStatus?: string
  assetId?: RuntimeAssetId
}
export interface HomeExploreContent {
  title: string
  rails: readonly ExploreRail[]
}
export async function getHomeExploreContent(
  locale: Locale,
): Promise<HomeExploreContent> {
  const copy = await getManagedCopy(locale)
  return {
    title: copy['home.explore.title'] ?? '',
    rails: (['gallery', 'blog', 'education'] as const).flatMap(
      (pathSegment) => {
        const title = copy['home.explore.' + pathSegment + '.title']
        return title
          ? [
              {
                pathSegment,
                title,
                excerpt: copy['home.explore.' + pathSegment + '.body'] ?? '',
                viewLabel:
                  copy['home.explore.' + pathSegment + '.action'] ?? '',
              },
            ]
          : []
      },
    ),
  }
}
export interface HomeCollaborationContent {
  title: string
  message: string
  connectLabel: string
  cvLabel: string
}
export async function getHomeCollaborationContent(
  locale: Locale,
): Promise<HomeCollaborationContent> {
  const copy = await getManagedCopy(locale)
  return {
    title: copy['home.collaboration.title'] ?? '',
    message: copy['home.collaboration.body'] ?? '',
    connectLabel: copy['home.collaboration.contact'] ?? '',
    cvLabel: copy['home.collaboration.cv'] ?? '',
  }
}
type ConstellationAccent =
  'brand' | 'signature' | 'research' | 'context' | 'ink'
export interface ConstellationNode {
  slug: string
  label: string
  accent: ConstellationAccent
  position: 'a' | 'b' | 'c' | 'd' | 'e'
}
export interface HomeConstellationContent {
  sectionLabel: string
  heading: string
  research: HomeResearchContent
  nodes: ConstellationNode[]
}
export async function getHomeConstellationContent(
  locale: Locale,
): Promise<HomeConstellationContent> {
  const [research, interests] = await Promise.all([
    getHomeResearchContent(locale),
    getHomeInterestsContent(locale),
  ])
  const accents: ConstellationAccent[] = [
    'brand',
    'research',
    'signature',
    'context',
    'ink',
  ]
  const positions: ConstellationNode['position'][] = ['a', 'b', 'c', 'd', 'e']
  return {
    sectionLabel: research.title,
    heading: research.excerpt,
    research,
    nodes: interests.cards.map((item, i) => ({
      slug: item.slug,
      label: item.title,
      accent: accents[i % accents.length],
      position: positions[i % positions.length],
    })),
  }
}
export type HomeModuleKey =
  | 'identity'
  | 'graph'
  | 'research-fit'
  | 'journey'
  | 'projects'
  | 'publications'
  | 'previews'
  | 'cta'
/** Identity and graph remain one hero; all other visible modules retain CMS order. */
export function homeModuleOrder(
  composition: HomeCompositionOut | null,
): HomeModuleKey[] {
  const allowed = new Set([
    'identity',
    'graph',
    'research-fit',
    'journey',
    'projects',
    'publications',
    'previews',
    'cta',
  ])
  const ordered = [...(composition?.modules ?? [])]
    .sort((a, b) => a.order - b.order)
    .filter((item) => allowed.has(item.key))
  const hasIdentity = ordered.some((item) => item.key === 'identity')
  return [
    ...new Set(
      ordered
        .filter((item) => item.key !== 'graph' || !hasIdentity)
        .map((item) => item.key as HomeModuleKey),
    ),
  ]
}
