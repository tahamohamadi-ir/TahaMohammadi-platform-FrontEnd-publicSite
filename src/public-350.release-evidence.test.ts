import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  PUBLIC_RELEASE_SLICES,
  R4_PUBLIC_SLICES,
  R8_PUBLIC_SLICES,
  summarizeReleaseEvidence,
  PUBLIC_RELEASE_GATE_SWEEP_SHA,
} from './test-harness/release-evidence'
import { STAGING_ENV_KEYS } from './test-harness/staging-smoke'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const checklistPath = path.join(
  repositoryRoot,
  'docs',
  'quality',
  'PUBLIC-350-RELEASE-EVIDENCE.md',
)
const harnessPath = path.join(
  repositoryRoot,
  'src',
  'test-harness',
  'release-evidence.ts',
)
const releaseReportTemplatePath = path.join(
  repositoryRoot,
  '..',
  '..',
  'Docs',
  'templates',
  'RELEASE-REPORT-TEMPLATE.md',
)

describe('PUBLIC-350 public release evidence scaffold', () => {
  it('does not claim release readiness while R4/R8 slices remain open or blocked', () => {
    const summary = summarizeReleaseEvidence({})
    expect(summary.ready).toBe(false)
    expect(summary.skipReason).toContain('release evidence incomplete')
    expect(summary.open.length).toBeGreaterThan(0)
    expect(summary.blocked.length).toBeGreaterThan(0)
    expect(summary.r4Complete).toBeLessThan(summary.r4Total)
    expect(summary.r8Complete).toBeLessThan(summary.r8Total)
  })

  it('maps every R4 and R8 slice to a PUBLIC task without inventing fields', () => {
    expect(R4_PUBLIC_SLICES.length).toBeGreaterThanOrEqual(8)
    expect(R8_PUBLIC_SLICES.length).toBeGreaterThanOrEqual(8)

    for (const slice of PUBLIC_RELEASE_SLICES) {
      expect(slice.id).toMatch(/^(r4|r8)-/)
      expect(slice.taskId).toMatch(/^PUBLIC-/)
      expect(slice.description.length).toBeGreaterThan(5)
      expect(['complete', 'scaffold', 'blocked', 'open']).toContain(
        slice.status,
      )
    }
  })

  it('keeps PUBLIC-190 and staging smoke as explicit blockers', () => {
    const home = R4_PUBLIC_SLICES.find((slice) => slice.taskId === 'PUBLIC-190')
    const owner = R8_PUBLIC_SLICES.find(
      (slice) => slice.id === 'r8-owner-acceptance',
    )
    const staging = R8_PUBLIC_SLICES.find(
      (slice) => slice.id === 'r8-staging-smoke',
    )

    expect(home?.status).toBe('scaffold')
    expect(owner?.status).toBe('blocked')
    expect(staging?.status).toBe('blocked')
    expect(staging?.blocker).toContain(STAGING_ENV_KEYS.siteUrl)
    expect(staging?.blocker).toContain('BACKEND-180')
  })

  it('ships checklist, harness, and release report template reference', () => {
    expect(existsSync(harnessPath)).toBe(true)
    expect(existsSync(checklistPath)).toBe(true)
    if (existsSync(releaseReportTemplatePath)) {
      expect(existsSync(releaseReportTemplatePath)).toBe(true)
    }

    const checklist = readFileSync(checklistPath, 'utf8')
    const harness = readFileSync(harnessPath, 'utf8')

    expect(checklist).toContain('PUBLIC-350')
    expect(checklist).toContain(PUBLIC_RELEASE_GATE_SWEEP_SHA)
    expect(PUBLIC_RELEASE_GATE_SWEEP_SHA).toBe('0e84e69')
    expect(checklist).toContain('R4')
    expect(checklist).toContain('R8')
    expect(checklist).toContain('does **not** close `PUBLIC-190`')
    expect(checklist).toContain(STAGING_ENV_KEYS.siteUrl)
    expect(checklist).toContain('BACKEND-180')

    expect(harness).toContain('summarizeReleaseEvidence')
    expect(harness).toContain('PUBLIC_RELEASE_GATE_SWEEP_SHA')
    expect(harness).toContain('R4_PUBLIC_SLICES')
    expect(harness).toContain('R8_PUBLIC_SLICES')
  })
})
