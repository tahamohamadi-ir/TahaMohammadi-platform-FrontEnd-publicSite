import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDir, '..')

/** Coordination-repo design authority (sibling of Front-End/public-site). */
export const defaultDesignAuthorityRoot = path.resolve(
  repositoryRoot,
  '../../Docs/references/frontend-design-authority',
)

const pageFamilyConceptMarker = (root) =>
  path.join(root, 'concepts', 'page-families')

/**
 * Concept PNGs live under `concepts/` at the visual authority root, not under
 * `agent-kit/`. When `DESIGN_AUTHORITY_ROOT` (or manifest centralSourcePath)
 * points at agent-kit, walk up one level so compare pairing still works.
 *
 * @param {string} root
 */
export function resolveVisualConceptAuthorityRoot(root) {
  const normalized = path.resolve(root)
  if (existsSync(pageFamilyConceptMarker(normalized))) {
    return normalized
  }

  const parent = path.dirname(normalized)
  if (existsSync(pageFamilyConceptMarker(parent))) {
    return parent
  }

  return normalized
}

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveDesignAuthorityRootFromEnv(env = process.env) {
  const requested = env.DESIGN_AUTHORITY_ROOT ?? defaultDesignAuthorityRoot
  return resolveVisualConceptAuthorityRoot(requested)
}

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

/** PF-02 detail — honest empty-shell route `/ {locale}/creative/empty-shell/`. */
export const PAGE_FAMILY_PF02_OPTIONAL = {
  pf: 'PF-02',
  captureId: 'pf02',
  concept: 'creative-detail-dark.png',
  conceptDir: 'concepts/page-families',
  theme: 'dark',
  locales: ['en', 'fa'],
  optional: false,
}

/**
 * Home concept references with WP-40 / templates.json viewport authority.
 * PNG exports are 853px wide; `referenceViewport` is the design-frame width.
 */
export const HOME_CONCEPT_REFERENCES = {
  desktopLight: {
    concept: 'home-light-concept-v3-final.png',
    conceptDir: 'concepts',
    referenceViewport: 1440,
    locales: ['en'],
    themes: ['light'],
  },
  desktopDark: {
    concept: 'home-dark-concept-v3-final.png',
    conceptDir: 'concepts',
    referenceViewport: 1440,
    locales: ['en'],
    themes: ['dark'],
  },
  mobileFaLight: {
    concept: 'home-mobile-fa-light-concept-v1.png',
    conceptDir: 'concepts',
    referenceViewport: 390,
    locales: ['fa'],
    themes: ['light'],
  },
  gatewayDark: {
    concept: 'language-gateway-dark-concept-v1.png',
    conceptDir: 'concepts',
    referenceViewport: 1440,
    locales: ['neutral'],
    themes: ['dark'],
  },
}

/** @param {typeof HOME_CONCEPT_REFERENCES[keyof typeof HOME_CONCEPT_REFERENCES]} ref */
function homeConceptEntry(ref) {
  return {
    concept: ref.concept,
    conceptDir: ref.conceptDir,
    referenceViewport: ref.referenceViewport,
  }
}

/**
 * Pick a concept only when capture viewport matches authority (same width or
 * nearest mobile reflow reference). Avoids pairing 768px tablet captures with
 * 1440 desktop composition references.
 *
 * @param {{ captureViewport: number, locale: string, theme: string, target?: string }} capture
 */
export function resolveHomeConceptReference(capture) {
  if (capture.target === 'gateway') {
    return homeConceptEntry(HOME_CONCEPT_REFERENCES.gatewayDark)
  }

  const candidates = Object.values(HOME_CONCEPT_REFERENCES).filter(
    (ref) =>
      ref.locales.includes(capture.locale) &&
      ref.themes.includes(capture.theme),
  )

  if (candidates.length === 0) {
    return null
  }

  const sorted = [...candidates].sort(
    (left, right) =>
      Math.abs(left.referenceViewport - capture.captureViewport) -
      Math.abs(right.referenceViewport - capture.captureViewport),
  )
  const best = sorted[0]
  const widthDelta = Math.abs(best.referenceViewport - capture.captureViewport)

  // WP-40: compare at the same viewport. Allow one breakpoint step for mobile
  // reflow (390 concept vs 768 tablet capture for FA only).
  const maxDelta =
    capture.locale === 'fa' && best.referenceViewport === 390 ? 400 : 0

  if (widthDelta > maxDelta) {
    return null
  }

  return homeConceptEntry(best)
}

/** Home / gateway captures from wp40-home.e2e.ts (supplement PUBLIC-270). */
export const HOME_VISUAL_ENTRIES = [
  {
    label: 'Home EN light (768)',
    captureFile: 'wp40-home-en-768-light.png',
    captureViewport: 768,
    locale: 'en',
    theme: 'light',
    note: '768px tablet reflow — no EN tablet concept in authority; review capture without side-by-side concept.',
  },
  {
    label: 'Home EN dark (768)',
    captureFile: 'wp40-home-en-768-dark.png',
    captureViewport: 768,
    locale: 'en',
    theme: 'dark',
    note: '768px tablet reflow — no EN tablet/dark narrow concept; review capture only.',
  },
  {
    label: 'Home FA light (768)',
    captureFile: 'wp40-home-fa-768-light.png',
    captureViewport: 768,
    locale: 'fa',
    theme: 'light',
    note: '768px tablet reflow paired with 390 RTL mobile concept (nearest narrow authority).',
  },
  {
    label: 'Home FA dark (768)',
    captureFile: 'wp40-home-fa-768-dark.png',
    captureViewport: 768,
    locale: 'fa',
    theme: 'dark',
    note: '768px tablet reflow — no FA dark mobile concept in authority; review capture only.',
  },
  {
    label: 'Home EN light (200% zoom)',
    captureFile: 'wp40-home-en-200pct-light.png',
    captureViewport: 720,
    locale: 'en',
    theme: 'light',
    note: 'Accessibility zoom evidence (720px viewport) — no width-matched EN concept; review readability only.',
  },
  {
    label: 'Home EN dark (200% zoom)',
    captureFile: 'wp40-home-en-200pct-dark.png',
    captureViewport: 720,
    locale: 'en',
    theme: 'dark',
    note: 'Accessibility zoom evidence (720px viewport) — no width-matched EN concept; review readability only.',
  },
  {
    label: 'Home FA light (200% zoom)',
    captureFile: 'wp40-home-fa-200pct-light.png',
    captureViewport: 720,
    locale: 'fa',
    theme: 'light',
    note: 'Accessibility zoom evidence paired with 390 RTL mobile concept (nearest narrow authority).',
  },
  {
    label: 'Gateway (200% zoom)',
    captureFile: 'wp40-gateway-200pct-light.png',
    captureViewport: 720,
    locale: 'neutral',
    theme: 'light',
    target: 'gateway',
    note: 'Gateway layout vs dark concept reference — capture is light theme; compare language-choice affordance and scale only.',
  },
]

/**
 * @param {string} designAuthorityRoot
 * @returns {import('./page-family-visual-compare.mjs').CompareRow[]}
 */
export function buildPublic270CompareRows(designAuthorityRoot) {
  const conceptRoot = resolveVisualConceptAuthorityRoot(designAuthorityRoot)
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
          conceptPath: path.join(conceptRoot, entry.conceptDir, entry.concept),
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
          conceptRoot,
          PAGE_FAMILY_PF02_OPTIONAL.conceptDir,
          PAGE_FAMILY_PF02_OPTIONAL.concept,
        ),
        conceptRelative: `${PAGE_FAMILY_PF02_OPTIONAL.conceptDir}/${PAGE_FAMILY_PF02_OPTIONAL.concept}`,
        optional: PAGE_FAMILY_PF02_OPTIONAL.optional,
      })
    }
  }

  return rows
}

/**
 * @param {string} designAuthorityRoot
 */
export function buildHomeCompareRows(designAuthorityRoot) {
  const conceptRoot = resolveVisualConceptAuthorityRoot(designAuthorityRoot)

  return HOME_VISUAL_ENTRIES.map((entry) => {
    const resolved = resolveHomeConceptReference(entry)

    return {
      label: entry.label,
      captureFile: entry.captureFile,
      capturePath: path.join(captureOutputDir, entry.captureFile),
      captureViewport: entry.captureViewport,
      conceptFile: resolved?.concept ?? null,
      conceptPath: resolved
        ? path.join(conceptRoot, resolved.conceptDir, resolved.concept)
        : null,
      conceptRelative: resolved
        ? `${resolved.conceptDir}/${resolved.concept}`
        : null,
      conceptViewport: resolved?.referenceViewport ?? null,
      note: entry.note,
    }
  })
}
