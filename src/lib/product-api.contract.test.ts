import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDir, '..', '..')
const acceptedPublicSchemaSha256 =
  'f3115a5095097e7ccc12efba4c0c59b1f0258914c1ce8a83e867b3b207c33ec9'
const generatedPath = path.join(
  repositoryRoot,
  'src',
  'generated',
  'public-api.ts',
)
const generatedPinPath = path.join(
  repositoryRoot,
  'src',
  'generated',
  'openapi-hash.json',
)
const shaPinPath = path.join(
  repositoryRoot,
  'contracts',
  'openapi.public.sha256',
)

/** Final public consumer-type sync (PU-SYNC-public, I08). The generated types
 * must come from the accepted backend snapshot — never a drifted or invented
 * schema — and must cover the final operations families build on. */
describe('PU-SYNC-public product contract (I08)', () => {
  it('pins the accepted public snapshot before trusting generated types', () => {
    const pin = JSON.parse(readFileSync(generatedPinPath, 'utf8')) as {
      artifact?: string
      sha256?: string
      openapiVersion?: string
      pathCount?: number
    }
    expect(pin.artifact).toBe('public-openapi.json')
    expect(pin.sha256).toBe(acceptedPublicSchemaSha256)
    expect(readFileSync(shaPinPath, 'utf8').trim()).toBe(pin.sha256)
    // A07 acceptance 2026-09-06: 48 paths, version 0.4.0.
    expect(pin.openapiVersion).toBe('0.4.0')
    expect(pin.pathCount).toBe(48)
  })

  it('exposes the final public operations in generated types', () => {
    const generated = readFileSync(generatedPath, 'utf8')
    for (const route of [
      '"/api/v1/records/{locale}/resolve"',
      '"/api/graph/{locale}"',
      '"/api/v1/lessons/{locale}"',
      '"/api/v1/collections/{locale}"',
      '"/api/v1/series/{locale}/{slug}"',
      '"/api/v1/site/{locale}"',
      '"/api/v1/analytics/events"',
    ]) {
      expect(generated, `generated types must include ${route}`).toContain(
        route,
      )
    }
    for (const schema of [
      'RecordResolveOut',
      'LessonDetailOut',
      'CollectionDetailOut',
      'SeriesDetailOut',
      'LocalizedSiteSettingsPublicOut',
      'ArticleDetailOut',
      'PublicationDetailOut',
      'ProjectDetailOut',
    ]) {
      expect(generated, `generated types must include ${schema}`).toContain(
        schema,
      )
    }
  })

  it('keeps legacy public operations (additive compatibility)', () => {
    const generated = readFileSync(generatedPath, 'utf8')
    for (const route of [
      '"/api/articles/{locale}"',
      '"/api/books/{locale}/{slug}"',
      '"/api/downloads/{locale}/{slug}/file"',
      '"/api/talks/{locale}/{slug}"',
    ]) {
      expect(generated, `legacy route must survive: ${route}`).toContain(route)
    }
  })

  it('keeps admin-only operations out of the public consumer', () => {
    const generated = readFileSync(generatedPath, 'utf8')
    expect(generated).not.toContain('publication-jobs')
    expect(generated).not.toContain('/api/v1/admin/')
  })
})
