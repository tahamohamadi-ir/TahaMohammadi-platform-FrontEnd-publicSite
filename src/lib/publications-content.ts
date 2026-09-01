/**
 * Publications page family loaders — canonical `/api/publications/*` (PUBLIC-201).
 * Fetches only published API records; never substitutes seed or draft content.
 */

import type { components } from '../generated/public-api';
import {
  assertPublishedOnly,
  filterPublishedOnly,
  parseJsonResponse,
  PublicApiError,
} from './api/client';
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url';
import type { Locale } from './navigation';

export type PublicationListOut = components['schemas']['PublicationListOut'];
export type PublicationDetailOut = components['schemas']['PublicationDetailOut'];

/** Route titles from owner route_copy seed (structural labels only). */
export const publicationsRouteTitle: Record<Locale, string> = {
  en: 'Research Outputs',
  fa: 'خروجی‌های پژوهشی',
};

export type PublicationsIndexModel =
  | { status: 'unavailable' }
  | { status: 'ready'; publications: PublicationListOut[] };

export type PublicationDetailModel =
  | { status: 'unavailable' }
  | { status: 'ready'; publication: PublicationDetailOut };

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildPublicApiUrl(path), {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<T>(response);
}

export function getPublicationsUnavailableCopy(locale: Locale): { title: string; message: string } {
  return locale === 'en'
    ? {
        title: publicationsRouteTitle.en,
        message: 'Published research outputs are not available yet.',
      }
    : {
        title: publicationsRouteTitle.fa,
        message: 'خروجی‌های پژوهشی منتشرشده هنوز در دسترس نیست.',
      };
}

export function getPublicationsEmptyCopy(locale: Locale): { title: string; message: string } {
  return locale === 'en'
    ? {
        title: 'No publications yet',
        message: 'Published outputs will appear here when they are available.',
      }
    : {
        title: 'هنوز خروجی منتشر نشده است',
        message: 'خروجی‌های منتشرشده پس از آماده‌شدن در اینجا نمایش داده می‌شوند.',
      };
}

export async function listPublications(locale: Locale): Promise<PublicationListOut[]> {
  if (!canFetchPublicApi()) return [];
  const pageSize = 100;
  let page = 1;
  const collected: PublicationListOut[] = [];

  try {
    while (true) {
      const payload = await fetchJson<components['schemas']['PagedPublicationListOut']>(
        `/api/publications/${locale}?page=${page}&page_size=${pageSize}`,
      );
      collected.push(...filterPublishedOnly(payload.items ?? []));
      if (collected.length >= (payload.count ?? 0) || (payload.items?.length ?? 0) < pageSize) {
        break;
      }
      page += 1;
    }
  } catch {
    return [];
  }

  return collected;
}

export async function fetchPublicationsIndex(locale: Locale): Promise<PublicationsIndexModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' };
  }

  const publications = await listPublications(locale);
  if (!publications.length) {
    return { status: 'unavailable' };
  }

  return { status: 'ready', publications };
}

export async function fetchPublicationDetail(
  locale: Locale,
  slug: string,
): Promise<PublicationDetailModel> {
  if (!canFetchPublicApi()) {
    return { status: 'unavailable' };
  }

  try {
    const publication = await fetchJson<PublicationDetailOut>(
      `/api/publications/${locale}/${encodeURIComponent(slug)}`,
    );
    assertPublishedOnly(publication);
    if (publication.locale !== locale) {
      throw new PublicApiError('Locale mismatch', 'validation');
    }
    return { status: 'ready', publication };
  } catch (error) {
    if (error instanceof PublicApiError && (error.kind === 'unavailable' || error.status === 404)) {
      return { status: 'unavailable' };
    }
    return { status: 'unavailable' };
  }
}

export async function listPublicationSlugs(locale: Locale): Promise<string[]> {
  const publications = await listPublications(locale);
  return publications.map((item) => item.slug);
}

export async function resolvePublicationsAlternateAvailability(locale: Locale): Promise<boolean> {
  const alternate: Locale = locale === 'en' ? 'fa' : 'en';
  const model = await fetchPublicationsIndex(alternate);
  return model.status === 'ready';
}
