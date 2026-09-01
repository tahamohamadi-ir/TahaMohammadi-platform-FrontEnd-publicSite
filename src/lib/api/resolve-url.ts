/** Shared public API URL resolution for build-time fetchers (PUBLIC-100+). */

export function canFetchPublicApi(): boolean {
  const baseUrl = String(import.meta.env.PUBLIC_API_BASE_URL ?? '').trim()
  return Boolean(baseUrl) || import.meta.env.DEV
}

export function buildPublicApiUrl(path: string): string {
  const baseUrl = String(import.meta.env.PUBLIC_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}
