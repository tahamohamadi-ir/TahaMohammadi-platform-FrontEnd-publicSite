/**
 * PUBLIC-290 performance budget contract.
 * Thresholds mirror Docs/06-quality/PERFORMANCE-BUDGET.md.
 */
export const PERFORMANCE_BUDGET = {
  /** Largest Contentful Paint at 75th percentile target (milliseconds). */
  lcpMs: 2500,
  /** Cumulative Layout Shift target. */
  cls: 0.1,
  /** Interaction to Next Paint target (milliseconds). */
  inpMs: 200,
} as const

/** Representative routes for local build/preview probes (not production telemetry). */
export const PERFORMANCE_PROBE_ROUTES = [
  { id: 'home-en', path: '/en/', locale: 'en' as const, label: 'Home (EN)' },
  { id: 'home-fa', path: '/fa/', locale: 'fa' as const, label: 'Home (FA)' },
  {
    id: 'index-creative-en',
    path: '/en/gallery/',
    locale: 'en' as const,
    label: 'Creative index (EN)',
  },
] as const

/** Locale-specific body + display preloads wired in BaseLayout.astro (PUBLIC-050).
 * PS-10 subsets: latin for EN; arabic for FA (latin on FA pages loads on demand). */
export const LOCALE_FONT_PRELOADS = {
  en: [
    '/fonts/inter/InterVariable-latin.woff2',
    '/fonts/newsreader/Newsreader-Variable-latin.woff2',
  ],
  fa: [
    '/fonts/vazirmatn/Vazirmatn-Variable-arabic.woff2',
    '/fonts/estedad/Estedad-Variable-arabic.woff2',
  ],
} as const

export type PerformanceProbeRoute = (typeof PERFORMANCE_PROBE_ROUTES)[number]
