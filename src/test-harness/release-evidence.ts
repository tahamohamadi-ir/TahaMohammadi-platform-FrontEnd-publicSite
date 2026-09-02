/**
 * Public release evidence harness (PUBLIC-350).
 * Aggregates R4 + R8 gate slices for the public site repository.
 * Does not claim production readiness or close PUBLIC-190.
 */

import { STAGING_ENV_KEYS } from './staging-smoke'

/**
 * Pin for the last recorded full gate sweep (PUBLIC-350 evidence only).
 * Does not imply `summarizeReleaseEvidence().ready === true`.
 */
export const PUBLIC_RELEASE_GATE_SWEEP_SHA = 'cc4b851' as const

export type ReleaseEvidenceStatus = 'complete' | 'scaffold' | 'blocked' | 'open'

export type ReleaseEvidenceSlice = {
  id: string
  gate: 'R4' | 'R8'
  taskId: string
  description: string
  status: ReleaseEvidenceStatus
  command?: string
  blocker?: string
}

/** R4 — public page-family delivery slices owned by this repository. */
export const R4_PUBLIC_SLICES: readonly ReleaseEvidenceSlice[] = [
  {
    id: 'r4-gateway',
    gate: 'R4',
    taskId: 'PUBLIC-040',
    description: 'Language gateway /',
    status: 'complete',
    command: 'npm run build',
  },
  {
    id: 'r4-home',
    gate: 'R4',
    taskId: 'PUBLIC-190',
    description: 'Home EN/FA structure',
    status: 'scaffold',
    blocker:
      'Independent visual QA PASS and explicit owner acceptance required',
  },
  {
    id: 'r4-about',
    gate: 'R4',
    taskId: 'PUBLIC-200',
    description: 'About profile route',
    status: 'complete',
    command: 'npm run build',
  },
  {
    id: 'r4-research-publications',
    gate: 'R4',
    taskId: 'PUBLIC-201',
    description: 'Research + publications indexes and details',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-projects',
    gate: 'R4',
    taskId: 'PUBLIC-210',
    description: 'Projects index + detail',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-writing',
    gate: 'R4',
    taskId: 'PUBLIC-211',
    description: 'Writing index + long-form detail',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-books-talks-downloads',
    gate: 'R4',
    taskId: 'PUBLIC-212',
    description: 'Books, talks, downloads',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-teaching-creative',
    gate: 'R4',
    taskId: 'PUBLIC-220',
    description: 'Teaching + creative seed empty states',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-cv',
    gate: 'R4',
    taskId: 'PUBLIC-221',
    description: 'CV/resume downloads',
    status: 'open',
    blocker: 'Frozen until PUBLIC-190 PASS',
  },
  {
    id: 'r4-contact',
    gate: 'R4',
    taskId: 'PUBLIC-230',
    description: 'Contact form + JSON validation',
    status: 'complete',
    command: 'npm run build',
  },
  {
    id: 'r4-search',
    gate: 'R4',
    taskId: 'PUBLIC-240',
    description: 'Per-locale Pagefind search',
    status: 'complete',
    command: 'npm run build',
  },
] as const

/** R8 — public quality closure slices with local automation where available. */
export const R8_PUBLIC_SLICES: readonly ReleaseEvidenceSlice[] = [
  {
    id: 'r8-foundation',
    gate: 'R8',
    taskId: 'PUBLIC-060',
    description: 'Locale font computed-style probes',
    status: 'scaffold',
    command: 'npm run test:foundation',
  },
  {
    id: 'r8-visual-pf',
    gate: 'R8',
    taskId: 'PUBLIC-270',
    description: 'Page-family visual capture stubs',
    status: 'scaffold',
    command: 'npm run test:visual -- --grep PUBLIC-270',
    blocker: 'Manual owner concept compare open',
  },
  {
    id: 'r8-responsive-matrix',
    gate: 'R8',
    taskId: 'PUBLIC-280',
    description: 'Six-width dual-theme responsive matrix',
    status: 'scaffold',
    command: 'npm run test:visual -- --grep PUBLIC-280',
    blocker: 'Manual owner concept compare open',
  },
  {
    id: 'r8-performance',
    gate: 'R8',
    taskId: 'PUBLIC-290',
    description: 'Local LCP/CLS/INP + font preload probes',
    status: 'scaffold',
    command: 'npm run test:performance',
    blocker: 'Production 75th-percentile telemetry open',
  },
  {
    id: 'r8-nojs',
    gate: 'R8',
    taskId: 'PUBLIC-300',
    description: 'No-JS readability crawl (23 routes)',
    status: 'complete',
    command: 'npm run test:nojs',
  },
  {
    id: 'r8-contracts',
    gate: 'R8',
    taskId: 'PUBLIC-310',
    description: 'Consumer contract fixture validation',
    status: 'complete',
    command: 'npm test',
  },
  {
    id: 'r8-staging-smoke',
    gate: 'R8',
    taskId: 'PUBLIC-320',
    description: 'Integrated staging smoke',
    status: 'blocked',
    command: 'npm run test:smoke',
    blocker: `${STAGING_ENV_KEYS.siteUrl} unset; requires BACKEND-180 + R7 staging`,
  },
  {
    id: 'r8-a11y',
    gate: 'R8',
    taskId: 'PUBLIC-080',
    description: 'Automated accessibility probes',
    status: 'scaffold',
    command: 'npm run test:a11y',
    blocker: 'Keyboard/screen-reader manual matrix open',
  },
  {
    id: 'r8-owner-acceptance',
    gate: 'R8',
    taskId: 'PUBLIC-190',
    description: 'Owner visual and content acceptance',
    status: 'blocked',
    blocker: 'PUBLIC-190 visual QA remains REVISE',
  },
] as const

export const PUBLIC_RELEASE_SLICES: readonly ReleaseEvidenceSlice[] = [
  ...R4_PUBLIC_SLICES,
  ...R8_PUBLIC_SLICES,
] as const

export type ReleaseEvidenceSummary = {
  ready: boolean
  r4Complete: number
  r4Total: number
  r8Complete: number
  r8Total: number
  blocked: readonly ReleaseEvidenceSlice[]
  open: readonly ReleaseEvidenceSlice[]
  skipReason: string | null
}

export function summarizeReleaseEvidence(
  env: NodeJS.ProcessEnv = process.env,
): ReleaseEvidenceSummary {
  const r4Complete = R4_PUBLIC_SLICES.filter(
    (slice) => slice.status === 'complete',
  ).length
  const r8Complete = R8_PUBLIC_SLICES.filter(
    (slice) => slice.status === 'complete',
  ).length
  const blocked = PUBLIC_RELEASE_SLICES.filter(
    (slice) => slice.status === 'blocked',
  )
  const open = PUBLIC_RELEASE_SLICES.filter((slice) => slice.status === 'open')
  const stagingUnset = !String(env[STAGING_ENV_KEYS.siteUrl] ?? '').trim()

  const ready =
    open.length === 0 &&
    blocked.length === 0 &&
    r4Complete === R4_PUBLIC_SLICES.length &&
    r8Complete === R8_PUBLIC_SLICES.length

  const skipReason = ready
    ? null
    : stagingUnset
      ? `Public release evidence incomplete: ${open.length} R4 slice(s) open, ${blocked.length} blocker(s), staging unset (see docs/quality/PUBLIC-350-RELEASE-EVIDENCE.md)`
      : `Public release evidence incomplete: ${open.length} R4 slice(s) open, ${blocked.length} blocker(s) (see docs/quality/PUBLIC-350-RELEASE-EVIDENCE.md)`

  return {
    ready,
    r4Complete,
    r4Total: R4_PUBLIC_SLICES.length,
    r8Complete,
    r8Total: R8_PUBLIC_SLICES.length,
    blocked,
    open,
    skipReason,
  }
}
