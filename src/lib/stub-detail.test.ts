import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getStubProject,
  getStubPublication,
  listStubProjects,
  listStubPublications,
} from './stub-detail-content'
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('Legacy adapters cannot resurrect deleted seed records', () => {
  it.each(['en', 'fa'] as const)(
    'returns no records when CMS is unavailable in %s',
    async (locale) => {
      vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
      )
      expect(await listStubProjects(locale)).toEqual([])
      expect(await listStubPublications(locale)).toEqual([])
      expect(await getStubProject(locale, 'pars-sql-vtd-edge')).toBeUndefined()
      expect(
        await getStubPublication(locale, 'vtd-edge-manuscript'),
      ).toBeUndefined()
    },
  )
})
