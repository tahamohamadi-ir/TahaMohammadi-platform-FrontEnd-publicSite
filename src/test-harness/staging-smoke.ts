/**
 * Integrated staging smoke harness (PUBLIC-320).
 * Live probes run only when PUBLIC_STAGING_SITE_URL is set; otherwise callers skip honestly.
 */

export const STAGING_ENV_KEYS = {
  siteUrl: 'PUBLIC_STAGING_SITE_URL',
  apiBaseUrl: 'PUBLIC_STAGING_API_BASE_URL',
} as const

export type StagingSmokeProbe = {
  id: string
  description: string
  method: 'GET'
  /** Path relative to the API origin (includes leading slash). */
  path: string
  expectStatus: number | readonly number[]
}

/** Accepted public API probes — status only; response bodies are not asserted in smoke. */
export const STAGING_API_PROBES: readonly StagingSmokeProbe[] = [
  {
    id: 'health',
    description: 'Backend health endpoint',
    method: 'GET',
    path: '/health/',
    expectStatus: 200,
  },
  {
    id: 'site-settings',
    description: 'Public site settings',
    method: 'GET',
    path: '/api/site',
    expectStatus: 200,
  },
  {
    id: 'landings-en',
    description: 'Published EN landing index',
    method: 'GET',
    path: '/api/landings/en',
    expectStatus: 200,
  },
  {
    id: 'landings-fa',
    description: 'Published FA landing index',
    method: 'GET',
    path: '/api/landings/fa',
    expectStatus: 200,
  },
] as const

export type StagingSiteRoute = {
  id: string
  path: string
  locale?: 'en' | 'fa'
}

/** Representative static routes served by the deployed public site artifact. */
export const STAGING_SITE_ROUTES: readonly StagingSiteRoute[] = [
  { id: 'gateway', path: '/' },
  { id: 'home-en', path: '/en/', locale: 'en' },
  { id: 'home-fa', path: '/fa/', locale: 'fa' },
  { id: 'about-en', path: '/en/about/', locale: 'en' },
  { id: 'about-fa', path: '/fa/about/', locale: 'fa' },
] as const

export type StagingSmokeConfig =
  | {
      ready: true
      siteUrl: string
      apiBaseUrl: string
      skipReason: null
    }
  | {
      ready: false
      siteUrl: null
      apiBaseUrl: null
      skipReason: string
    }

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function readEnvString(env: NodeJS.ProcessEnv, key: string): string {
  return String(env[key] ?? '').trim()
}

export function resolveStagingSmokeConfig(
  env: NodeJS.ProcessEnv = process.env,
): StagingSmokeConfig {
  const siteUrl = trimTrailingSlash(
    readEnvString(env, STAGING_ENV_KEYS.siteUrl),
  )

  if (!siteUrl) {
    return {
      ready: false,
      siteUrl: null,
      apiBaseUrl: null,
      skipReason: `${STAGING_ENV_KEYS.siteUrl} is not set; integrated staging smoke requires BACKEND-180 staging deployment (see docs/quality/PUBLIC-320-STAGING-SMOKE.md)`,
    }
  }

  const explicitApiBase = trimTrailingSlash(
    readEnvString(env, STAGING_ENV_KEYS.apiBaseUrl),
  )
  const apiBaseUrl = explicitApiBase || siteUrl

  return {
    ready: true,
    siteUrl,
    apiBaseUrl,
    skipReason: null,
  }
}

export function buildStagingApiUrl(
  config: Extract<StagingSmokeConfig, { ready: true }>,
  probePath: string,
): string {
  return `${config.apiBaseUrl}${probePath}`
}

export function acceptsStatus(
  actual: number,
  expected: number | readonly number[],
): boolean {
  const allowed = Array.isArray(expected) ? expected : [expected]
  return allowed.includes(actual)
}

export function isSameOriginStaging(
  config: Extract<StagingSmokeConfig, { ready: true }>,
): boolean {
  return config.apiBaseUrl === config.siteUrl
}
