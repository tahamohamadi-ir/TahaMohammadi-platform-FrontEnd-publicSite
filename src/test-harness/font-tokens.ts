/**
 * PUBLIC-060 locale font token contract.
 * Mirrors Docs/04-design/FONT-ACQUISITION-PLAN.md and src/styles/tokens.css.
 */
export const LOCALE_FONT_STACKS = {
  en: {
    display: {
      primary: 'Newsreader Variable',
      computedPattern: /Newsreader Variable/i,
    },
    body: {
      primary: 'Inter Variable',
      computedPattern: /Inter Variable/i,
    },
  },
  fa: {
    display: {
      primary: 'Estedad Variable',
      computedPattern: /Estedad Variable|Vazirmatn Variable/i,
    },
    body: {
      primary: 'Vazirmatn Variable',
      computedPattern: /Vazirmatn Variable/i,
    },
  },
} as const;

/** Representative routes for computed-style font probes (PUBLIC-060). */
export const FONT_COMPUTED_PROBE_ROUTES = [
  { id: 'home-en', path: '/en/', locale: 'en' as const, label: 'Home (EN)' },
  { id: 'home-fa', path: '/fa/', locale: 'fa' as const, label: 'Home (FA)' },
] as const;

export type LocaleFontStack = (typeof LOCALE_FONT_STACKS)[keyof typeof LOCALE_FONT_STACKS];
export type FontComputedProbeRoute = (typeof FONT_COMPUTED_PROBE_ROUTES)[number];
