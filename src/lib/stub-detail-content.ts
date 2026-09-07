/** Legacy component adapters over published CMS data; no static stub records. */
import {
  getHomeFeaturedContent,
  getHomePublicationsContent,
  type FeaturedProjectCard,
  type PublicationCard,
} from './home-content'
import { getManagedCopy } from './site-settings-content'
import type { Locale } from './navigation'

export async function getStubProject(
  locale: Locale,
  slug: string,
): Promise<FeaturedProjectCard | undefined> {
  return (await getHomeFeaturedContent(locale)).projects.find(
    (project) => project.slug === slug,
  )
}
export async function getStubPublication(
  locale: Locale,
  slug: string,
): Promise<PublicationCard | undefined> {
  return (await getHomePublicationsContent(locale)).items.find(
    (item) => item.slug === slug,
  )
}
export async function getStubProjectDraftNote(locale: Locale): Promise<string> {
  return (await getManagedCopy(locale))['home.projects.note'] ?? ''
}
export async function getStubPublicationDraftNote(
  locale: Locale,
): Promise<string> {
  return (await getManagedCopy(locale))['home.publications.note'] ?? ''
}
export async function getStubBackToProjectsLabel(
  locale: Locale,
): Promise<string> {
  return (await getManagedCopy(locale))['home.projects.view_all'] ?? ''
}
export async function getStubBackToWritingLabel(
  locale: Locale,
): Promise<string> {
  return (await getManagedCopy(locale))['home.publications.view_all'] ?? ''
}
export async function getStubBackToHomeLabel(locale: Locale): Promise<string> {
  return (await getManagedCopy(locale))['nav.home'] ?? ''
}
export async function listStubProjects(
  locale: Locale,
): Promise<FeaturedProjectCard[]> {
  return (await getHomeFeaturedContent(locale)).projects
}
export async function listStubPublications(
  locale: Locale,
): Promise<PublicationCard[]> {
  return (await getHomePublicationsContent(locale)).items
}
