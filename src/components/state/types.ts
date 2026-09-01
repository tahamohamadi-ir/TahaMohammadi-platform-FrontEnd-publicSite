export const contentStateVariants = [
  'loading',
  'empty',
  'unavailable',
  'error',
  'untranslated',
  'no-results',
] as const;

export type ContentStateVariant = (typeof contentStateVariants)[number];

export type ContentStateLocale = 'fa' | 'en';
