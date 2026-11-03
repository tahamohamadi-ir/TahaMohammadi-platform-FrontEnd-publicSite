import type { Locale } from './navigation'

export type { Locale }

export const LOCALES = ['en', 'fa'] as const satisfies readonly Locale[]

/**
 * `getStaticPaths` for `src/pages/[locale]/**`: one entry per locale (and per extra route
 * params the callback returns for that locale). Only the two supported locales are ever
 * emitted, so the `[locale]` segment can never swallow another top-level route.
 */
export async function localeStaticPaths<T extends Record<string, string>>(
  paramsFor?: (locale: Locale) => Promise<T[]> | T[],
): Promise<{ params: { locale: Locale } & T }[]> {
  const paths: { params: { locale: Locale } & T }[] = []
  for (const locale of LOCALES) {
    const rows = paramsFor ? await paramsFor(locale) : [{} as T]
    for (const row of rows) paths.push({ params: { locale, ...row } })
  }
  return paths
}
