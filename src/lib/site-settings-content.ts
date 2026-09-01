/**
 * Public site settings loader — canonical `GET /api/site` (PUBLIC-230).
 * Exposes only locale-neutral operational fields per API-CONTRACT.md.
 */

import type { components } from '../generated/public-api';
import { parseJsonResponse } from './api/client';
import { buildPublicApiUrl, canFetchPublicApi } from './api/resolve-url';

export type PublicSiteSettingsOut = components['schemas']['PublicSiteSettingsOut'];
export type PublicContactBlockOut = components['schemas']['PublicContactBlockOut'];
export type PublicDownloadOut = components['schemas']['PublicDownloadOut'];

export async function fetchPublicSiteSettings(): Promise<PublicSiteSettingsOut | null> {
  if (!canFetchPublicApi()) {
    return null;
  }

  try {
    const response = await fetch(buildPublicApiUrl('/api/site'), {
      headers: { Accept: 'application/json' },
    });
    return await parseJsonResponse<PublicSiteSettingsOut>(response);
  } catch {
    return null;
  }
}

export function hasPublishedContactDetails(
  contact: PublicContactBlockOut | undefined,
): boolean {
  if (!contact) return false;
  return Boolean(
    contact.email ||
      contact.linkedin ||
      contact.orcid ||
      contact.location ||
      contact.employer,
  );
}

export function isContactFormAvailable(contact: PublicContactBlockOut | undefined): boolean {
  return Boolean(contact?.formEnabled && contact.email);
}

export function hasPublishedDownloads(downloads: PublicDownloadOut[] | undefined): boolean {
  return Boolean(downloads?.length);
}
