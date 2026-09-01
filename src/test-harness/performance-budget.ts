/**
 * PUBLIC-290 performance budget contract.
 * Thresholds mirror Docs/06-quality/PERFORMANCE-BUDGET.md.
 */
export const PERFORMANCE_BUDGET = {
  /** Largest Contentful Paint at 75th percentile target (milliseconds). */
  lcpMs: 2500,
  /** Cumulative Layout Shift target. */
  cls: 0.1,
} as const;

/** Representative routes for local build/preview probes (not production telemetry). */
export const PERFORMANCE_PROBE_ROUTES = [
  { id: 'home-en', path: '/en/', locale: 'en' as const, label: 'Home (EN)' },
  { id: 'home-fa', path: '/fa/', locale: 'fa' as const, label: 'Home (FA)' },
  { id: 'index-creative-en', path: '/en/creative/', locale: 'en' as const, label: 'Creative index (EN)' },
] as const;

/** Locale-specific body + display preloads wired in BaseLayout.astro (PUBLIC-050). */
export const LOCALE_FONT_PRELOADS = {
  en: ['/fonts/inter/InterVariable.woff2', '/fonts/newsreader/Newsreader-Variable.woff2'],
  fa: ['/fonts/vazirmatn/Vazirmatn-Variable.woff2', '/fonts/estedad/Estedad-Variable.woff2'],
} as const;

export type PerformanceProbeRoute = (typeof PERFORMANCE_PROBE_ROUTES)[number];
