import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { paths, components } from '../generated/public-api'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(__dirname, '..', '..')
const fixturePath = path.join(
  repositoryRoot,
  'tests/fixtures/contracts/product-record-resolver.json',
)

type ResolverPath = paths['/api/v1/records/{locale}/resolve']
type RecordResolveOut = components['schemas']['RecordResolveOut']
type WorkRefOut = components['schemas']['WorkRefOut']
type UnresolvedRefOut = components['schemas']['UnresolvedRefOut']
type ErrorEnvelopeOut = components['schemas']['ErrorEnvelopeOut']

type _AssertResolver200 =
  ResolverPath['get']['responses'][200]['content']['application/json'] extends RecordResolveOut
    ? true
    : false

interface ResolverFixtureScenario {
  description: string
  request?: {
    locale: string
    refs?: string
    refCount?: number
  }
  status?: number
  response?: RecordResolveOut | ErrorEnvelopeOut
  items?: WorkRefOut[]
}

interface ResolverFixture {
  synthetic: boolean
  description: string
  contractSection: string
  sourceOpenApiSha256: string
  scenarios: Record<string, ResolverFixtureScenario>
}

describe('PU-SYNC-graph: Product Record Resolver Contract Tests (§I04, §I03)', () => {
  it('verifies generated public-api.ts exports resolver path and schemas', () => {
    // Compile-time type check: ensure types resolve correctly
    const mockWorkRef: WorkRefOut = {
      family: 'article',
      id: '1',
      locale: 'en',
      slug: 'test-slug',
      title: 'Test Title',
      summary: 'Test Summary',
      routeFamily: 'blog',
      courseSlug: null,
    }
    expect(mockWorkRef.family).toBe('article')

    const mockUnresolved: UnresolvedRefOut = {
      family: 'article',
      id: '99',
    }
    expect(mockUnresolved.id).toBe('99')

    const mockResolveOut: RecordResolveOut = {
      items: [mockWorkRef],
      unresolved: [mockUnresolved],
    }
    expect(mockResolveOut.items).toHaveLength(1)

    const mockError: ErrorEnvelopeOut = {
      code: 'INVALID_INPUT',
      message: 'Invalid reference',
      request_id: 'req-01',
      field_errors: { refs: ['error'] },
    }
    expect(mockError.code).toBe('INVALID_INPUT')
  })

  it('loads and validates the synthetic resolver contract fixture structure', () => {
    expect(existsSync(fixturePath)).toBe(true)
    const raw = readFileSync(fixturePath, 'utf8')
    const fixture = JSON.parse(raw) as ResolverFixture

    expect(fixture.synthetic).toBe(true)
    expect(fixture.contractSection).toBe('I04')
    expect(fixture.sourceOpenApiSha256).toMatch(/^[a-f0-9]{64}$/)
    // Pin must equal the accepted backend schema hash, not just any hex string.
    const pinPath = path.join(repositoryRoot, 'src/generated/openapi-hash.json')
    const pin = JSON.parse(readFileSync(pinPath, 'utf8')) as { sha256: string }
    expect(fixture.sourceOpenApiSha256).toBe(pin.sha256)
    expect(Object.keys(fixture.scenarios).length).toBeGreaterThanOrEqual(6)
  })

  it('validates batch resolution 200 OK scenario against WorkRefOut shape', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const scenario = fixture.scenarios.resolveBatchSuccess
    expect(scenario).toBeDefined()
    const response = scenario.response as RecordResolveOut

    expect(Array.isArray(response.items)).toBe(true)
    expect(Array.isArray(response.unresolved)).toBe(true)
    expect(response.items!.length).toBeGreaterThan(0)

    for (const item of response.items!) {
      // Required fields from WorkRefOut
      expect(typeof item.family).toBe('string')
      expect(typeof item.id).toBe('string')
      expect(typeof item.locale).toBe('string')
      expect(typeof item.slug).toBe('string')
      expect(typeof item.title).toBe('string')
      expect(typeof item.summary).toBe('string')
      expect(typeof item.routeFamily).toBe('string')

      // ID must follow canonical ASCII [1-9][0-9]*
      expect(item.id).toMatch(/^[1-9][0-9]*$/)

      // Course slug must be string or null
      if (item.courseSlug !== undefined && item.courseSlug !== null) {
        expect(typeof item.courseSlug).toBe('string')
      }
    }

    for (const unres of response.unresolved!) {
      expect(typeof unres.family).toBe('string')
      expect(typeof unres.id).toBe('string')
      expect(unres.id).toMatch(/^[1-9][0-9]*$/)
    }
  })

  it('verifies request order preservation in resolved items', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const scenario = fixture.scenarios.resolveBatchSuccess
    const refs = scenario.request!.refs!.split(',')
    const response = scenario.response as RecordResolveOut

    // Check that resolved items appear in the order requested
    const requestedResolvedRefs = refs.filter(
      (r) =>
        !response.unresolved?.some(
          (u: UnresolvedRefOut) => `${u.family}:${u.id}` === r,
        ),
    )
    const resultRefs = response.items!.map(
      (item) => `${item.family}:${item.id}`,
    )
    expect(resultRefs).toEqual(requestedResolvedRefs)
  })

  it('documents that lesson family is currently unsupported (400, not 200)', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const scenario = fixture.scenarios['resolveLessonCurrentlyUnsupported']
    expect(scenario).toBeDefined()
    expect(scenario.request?.refs).toBe('lesson:701')
    expect(scenario.status).toBe(400)
    const err = scenario.response as ErrorEnvelopeOut
    expect(err.code).toBe('INVALID_INPUT')
    expect(typeof err.request_id).toBe('string')
  })

  it('verifies all current 200 items carry null courseSlug (backend never fills it)', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const batch = fixture.scenarios.resolveBatchSuccess
    const response = batch.response as RecordResolveOut
    for (const item of response.items!) {
      expect(item.courseSlug ?? null).toBeNull()
    }
  })

  it('validates canonical routeFamily mappings for all 13 supported families', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const allFamiliesScenario = fixture.scenarios.resolveAllFamilies
    const expectedRouteFamilies: Record<string, string> = {
      landing: 'home',
      profile: 'about',
      article: 'blog',
      series: 'blog/series',
      researchtopic: 'research',
      researchstatement: 'research/statements',
      project: 'projects',
      publication: 'publications',
      book: 'books',
      talk: 'talks',
      download: 'resources',
      course: 'education',
      creativework: 'gallery',
    }

    expect(allFamiliesScenario.items!.length).toBe(13)
    for (const item of allFamiliesScenario.items!) {
      expect(expectedRouteFamilies[item.family]).toBe(item.routeFamily)
    }
  })

  it('validates error envelopes conform to ErrorEnvelopeOut schema', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture

    const errScenarios = [
      fixture.scenarios.errorMalformedRefs,
      fixture.scenarios.errorLeadingZeroId,
      fixture.scenarios.errorBatchLimitExceeded,
      fixture.scenarios.errorUnsupportedLocale,
    ]

    for (const scenario of errScenarios) {
      expect(scenario.status).toBeGreaterThanOrEqual(400)
      const err = scenario.response as ErrorEnvelopeOut
      expect(typeof err.code).toBe('string')
      expect(typeof err.message).toBe('string')
      expect(typeof err.request_id).toBe('string')

      if (err.field_errors) {
        expect(typeof err.field_errors).toBe('object')
        for (const [key, errors] of Object.entries(err.field_errors)) {
          expect(typeof key).toBe('string')
          expect(Array.isArray(errors)).toBe(true)
          for (const msg of errors) {
            expect(typeof msg).toBe('string')
          }
        }
      }
    }
  })

  it('enforces maximum 50 reference limit semantics per §I04', () => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf8'),
    ) as ResolverFixture
    const limitScenario = fixture.scenarios.errorBatchLimitExceeded
    expect(limitScenario.status).toBe(400)
    const err = limitScenario.response as ErrorEnvelopeOut
    expect(err.code).toBe('INVALID_INPUT')
    expect(err.message).toContain('50')
  })
})
