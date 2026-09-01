export type PageFamilyIndexCapture = {
  id: string;
  pf: string;
  path: string;
  locale: 'en' | 'fa';
  dir: 'ltr' | 'rtl';
};

/** Index routes for PF-01 and PF-03..PF-08 (PUBLIC-270/280 map). PF-02 detail excluded. */
export const PAGE_FAMILY_INDEX_CAPTURES: PageFamilyIndexCapture[] = [
  { id: 'pf01', pf: 'PF-01', path: '/en/creative/', locale: 'en', dir: 'ltr' },
  { id: 'pf01', pf: 'PF-01', path: '/fa/creative/', locale: 'fa', dir: 'rtl' },
  { id: 'pf03', pf: 'PF-03', path: '/en/writing/', locale: 'en', dir: 'ltr' },
  { id: 'pf03', pf: 'PF-03', path: '/fa/writing/', locale: 'fa', dir: 'rtl' },
  { id: 'pf04', pf: 'PF-04', path: '/en/projects/', locale: 'en', dir: 'ltr' },
  { id: 'pf04', pf: 'PF-04', path: '/fa/projects/', locale: 'fa', dir: 'rtl' },
  { id: 'pf05-research', pf: 'PF-05', path: '/en/research/', locale: 'en', dir: 'ltr' },
  { id: 'pf05-research', pf: 'PF-05', path: '/fa/research/', locale: 'fa', dir: 'rtl' },
  { id: 'pf05-publications', pf: 'PF-05', path: '/en/publications/', locale: 'en', dir: 'ltr' },
  { id: 'pf05-publications', pf: 'PF-05', path: '/fa/publications/', locale: 'fa', dir: 'rtl' },
  { id: 'pf06', pf: 'PF-06', path: '/en/teaching/', locale: 'en', dir: 'ltr' },
  { id: 'pf06', pf: 'PF-06', path: '/fa/teaching/', locale: 'fa', dir: 'rtl' },
  { id: 'pf07-about', pf: 'PF-07', path: '/en/about/', locale: 'en', dir: 'ltr' },
  { id: 'pf07-about', pf: 'PF-07', path: '/fa/about/', locale: 'fa', dir: 'rtl' },
  { id: 'pf07-cv', pf: 'PF-07', path: '/en/cv/', locale: 'en', dir: 'ltr' },
  { id: 'pf07-cv', pf: 'PF-07', path: '/fa/cv/', locale: 'fa', dir: 'rtl' },
  { id: 'pf08', pf: 'PF-08', path: '/en/contact/', locale: 'en', dir: 'ltr' },
  { id: 'pf08', pf: 'PF-08', path: '/fa/contact/', locale: 'fa', dir: 'rtl' },
];

export const RESPONSIVE_MATRIX_THEMES = ['light', 'dark'] as const;
export type ResponsiveMatrixTheme = (typeof RESPONSIVE_MATRIX_THEMES)[number];

export type PageFamilyThemedCapture = PageFamilyIndexCapture & {
  theme: ResponsiveMatrixTheme;
};

export function expandIndexCapturesWithThemes(
  bases: readonly PageFamilyIndexCapture[],
  themes: readonly ResponsiveMatrixTheme[] = RESPONSIVE_MATRIX_THEMES,
): PageFamilyThemedCapture[] {
  return bases.flatMap((base) => themes.map((theme) => ({ ...base, theme })));
}
