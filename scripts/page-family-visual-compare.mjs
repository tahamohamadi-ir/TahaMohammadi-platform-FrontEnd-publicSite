import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDir, '..')

/** Coordination-repo design authority (sibling of Front-End/public-site). */
export const defaultDesignAuthorityRoot = path.resolve(
  repositoryRoot,
  '../../Docs/references/frontend-design-authority',
)

export const captureOutputDir = path.join(repositoryRoot, 'test-results/visual')

export const PUBLIC_270_CAPTURE_WIDTHS = [1440, 390]

/** PF-01..PF-08 index captures → concept filenames under concepts/page-families/. */
export const PAGE_FAMILY_VISUAL_ENTRIES = [
  {
    pf: 'PF-01',
    captureId: 'pf01',
    concept: 'creative-index-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-03',
    captureId: 'pf03',
    concept: 'writing-index-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-04',
    captureId: 'pf04',
    concept: 'projects-index-dark.png',
    conceptDir: 'concepts/page-families',
    theme: 'dark',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-05',
    captureId: 'pf05-research',
    concept: 'research-publications-index-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-05',
    captureId: 'pf05-publications',
    concept: 'research-publications-index-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-06',
    captureId: 'pf06',
    concept: 'teaching-index-dark.png',
    conceptDir: 'concepts/page-families',
    theme: 'dark',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-07',
    captureId: 'pf07-about',
    concept: 'about-cv-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-07',
    captureId: 'pf07-cv',
    concept: 'about-cv-light.png',
    conceptDir: 'concepts/page-families',
    theme: 'light',
    locales: ['en', 'fa'],
  },
  {
    pf: 'PF-08',
    captureId: 'pf08',
    concept: 'contact-dark.png',
    conceptDir: 'concepts/page-families',
    theme: 'dark',
    locales: ['en', 'fa'],
  },
]

/** PF-02 detail — included in report only when captures exist (no static build route yet). */
export const PAGE_FAMILY_PF02_OPTIONAL = {
  pf: 'PF-02',
  captureId: 'pf02',
  concept: 'creative-detail-dark.png',
  conceptDir: 'concepts/page-families',
  theme: 'dark',
  locales: ['en', 'fa'],
  optional: true,
}

/** Home / gateway captures from wp40-home.e2e.ts (supplement PUBLIC-270). */
export const HOME_VISUAL_ENTRIES = [
  {
    label: 'Home EN light (768)',
    captureFile: 'wp40-home-en-768-light.png',
    concept: 'home-light-concept-v3-final.png',
    conceptDir: 'concepts',
    note: '768px reflow evidence; compare hierarchy at nearest concept width.',
  },
  {
    label: 'Home EN dark (768)',
    captureFile: 'wp40-home-en-768-dark.png',
    concept: 'home-dark-concept-v3-final.png',
    conceptDir: 'concepts',
    note: '768px reflow evidence; compare hierarchy at nearest concept width.',
  },
  {
    label: 'Home FA light (768)',
    captureFile: 'wp40-home-fa-768-light.png',
    concept: 'home-mobile-fa-light-concept-v1.png',
    conceptDir: 'concepts',
    note: 'FA narrow layout reference; 768px implementation capture.',
  },
  {
    label: 'Home FA dark (768)',
    captureFile: 'wp40-home-fa-768-dark.png',
    concept: 'home-dark-concept-v3-final.png',
    conceptDir: 'concepts',
    note: 'No dedicated FA dark concept; use EN dark for hierarchy review.',
  },
  {
    label: 'Home EN light (200% zoom)',
    captureFile: 'wp40-home-en-200pct-light.png',
    concept: 'home-light-concept-v3-final.png',
    conceptDir: 'concepts',
    note: 'Accessibility zoom evidence — not a pixel-perfect width match.',
  },
  {
    label: 'Home EN dark (200% zoom)',
    captureFile: 'wp40-home-en-200pct-dark.png',
    concept: 'home-dark-concept-v3-final.png',
    conceptDir: 'concepts',
    note: 'Accessibility zoom evidence — not a pixel-perfect width match.',
  },
  {
    label: 'Home FA light (200% zoom)',
    captureFile: 'wp40-home-fa-200pct-light.png',
    concept: 'home-mobile-fa-light-concept-v1.png',
    conceptDir: 'concepts',
    note: 'Accessibility zoom evidence — not a pixel-perfect width match.',
  },
  {
    label: 'Gateway (200% zoom)',
    captureFile: 'wp40-gateway-200pct-light.png',
    concept: null,
    conceptDir: null,
    note: 'Language gateway — no single concept reference; review route choice and readability.',
  },
]

/**
 * @param {string} designAuthorityRoot
 * @returns {import('./page-family-visual-compare.mjs').CompareRow[]}
 */
export function buildPublic270CompareRows(designAuthorityRoot) {
  const rows = []

  for (const entry of PAGE_FAMILY_VISUAL_ENTRIES) {
    for (const locale of entry.locales) {
      for (const width of PUBLIC_270_CAPTURE_WIDTHS) {
        const captureFile = `public-270-${entry.captureId}-${locale}-${width}-${entry.theme}.png`
        rows.push({
          pf: entry.pf,
          label: `${entry.pf} ${locale} @${width} ${entry.theme}`,
          captureFile,
          capturePath: path.join(captureOutputDir, captureFile),
          conceptFile: entry.concept,
          conceptPath: path.join(
            designAuthorityRoot,
            entry.conceptDir,
            entry.concept,
          ),
          conceptRelative: `${entry.conceptDir}/${entry.concept}`,
          optional: false,
        })
      }
    }
  }

  for (const locale of PAGE_FAMILY_PF02_OPTIONAL.locales) {
    for (const width of PUBLIC_270_CAPTURE_WIDTHS) {
      const captureFile = `public-270-${PAGE_FAMILY_PF02_OPTIONAL.captureId}-${locale}-${width}-${PAGE_FAMILY_PF02_OPTIONAL.theme}.png`
      rows.push({
        pf: PAGE_FAMILY_PF02_OPTIONAL.pf,
        label: `${PAGE_FAMILY_PF02_OPTIONAL.pf} ${locale} @${width} ${PAGE_FAMILY_PF02_OPTIONAL.theme}`,
        captureFile,
        capturePath: path.join(captureOutputDir, captureFile),
        conceptFile: PAGE_FAMILY_PF02_OPTIONAL.concept,
        conceptPath: path.join(
          designAuthorityRoot,
          PAGE_FAMILY_PF02_OPTIONAL.conceptDir,
          PAGE_FAMILY_PF02_OPTIONAL.concept,
        ),
        conceptRelative: `${PAGE_FAMILY_PF02_OPTIONAL.conceptDir}/${PAGE_FAMILY_PF02_OPTIONAL.concept}`,
        optional: true,
      })
    }
  }

  return rows
}

/**
 * @param {string} designAuthorityRoot
 */
export function buildHomeCompareRows(designAuthorityRoot) {
  return HOME_VISUAL_ENTRIES.map((entry) => ({
    label: entry.label,
    captureFile: entry.captureFile,
    capturePath: path.join(captureOutputDir, entry.captureFile),
    conceptFile: entry.concept,
    conceptPath: entry.concept
      ? path.join(designAuthorityRoot, entry.conceptDir, entry.concept)
      : null,
    conceptRelative: entry.concept
      ? `${entry.conceptDir}/${entry.concept}`
      : null,
    note: entry.note,
  }))
}
