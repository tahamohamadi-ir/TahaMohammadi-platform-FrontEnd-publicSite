/** Validated public environment configuration (PUBLIC-120). */

export interface PublicEnv {
  /** Empty string means same-origin `/api` via dev proxy or production reverse proxy. */
  apiBaseUrl: string;
  siteUrl: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getPublicEnv(): PublicEnv {
  const apiBaseUrl = trimTrailingSlash(
    String(import.meta.env.PUBLIC_API_BASE_URL ?? '').trim(),
  );
  const siteUrl = trimTrailingSlash(
    String(import.meta.env.PUBLIC_SITE_URL ?? '').trim(),
  );

  if (!siteUrl) {
    throw new Error('PUBLIC_SITE_URL is not configured');
  }

  return { apiBaseUrl, siteUrl };
}
