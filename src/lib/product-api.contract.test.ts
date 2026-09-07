import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDir, '..', '..')
const workspaceRoot = path.resolve(repositoryRoot, '..', '..')
const backendPublicSchema = path.join(
  workspaceRoot,
  'Back-End',
  'docs',
  'contracts',
  'openapi',
  'current',
  'public-openapi.json',
)
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

function crlfSha256(file: string): string {
  const raw = readFileSync(file)
  const lf = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'))
  const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'))
  return createHash('sha256').update(crlf).digest('hex')
}

/** Final public consumer-type sync (PU-SYNC-public, I08). The generated types
 * must come from the accepted backend snapshot — never a drifted or invented
 * schema — and must cover the final operations families build on. */
describe('PU-SYNC-public product contract (I08)', () => {
  it('pins the accepted public snapshot before trusting generated types', () => {
    expect(existsSync(backendPublicSchema), 'backend snapshot must exist').toBe(
      true,
    )
    const pin = JSON.parse(readFileSync(generatedPinPath, 'utf8')) as {
      artifact?: string
      sha256?: string
      openapiVersion?: string
      pathCount?: number
    }
    expect(pin.artifact).toBe('public-openapi.json')
    expect(pin.sha256).toBe(crlfSha256(backendPublicSchema))
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
