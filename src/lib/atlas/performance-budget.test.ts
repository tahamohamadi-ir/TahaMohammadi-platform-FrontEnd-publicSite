import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import AtlasPageContent from '../../components/atlas/AtlasPageContent.astro'
import { alwaysLabelKeys } from './layout'
import {
  ALWAYS_LABEL_KEYS_CAP,
  countOpeningHtmlTags,
  embeddedSnapshotGzipSize,
  extractAtlasRegionHtml,
  KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET,
  runtimePayloadGzipSize,
} from './knowledge-atlas-performance-budget'
import type { AtlasPayload } from './model'
import { buildAtlasIndexModel, type AtlasSnapshot } from './snapshot'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')

function readFixture(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

function readySnapshot(payload: AtlasPayload): AtlasSnapshot {
  return {
    status: 'ready',
    payload,
    etag: '"task-22"',
    html: buildAtlasIndexModel(payload),
  }
}

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function renderAtlasPage(payload: AtlasPayload) {
  const container = await AstroContainer.create()
  return container.renderToString(AtlasPageContent as Component, {
    props: { locale: 'en', snapshot: readySnapshot(payload) },
  })
}

describe('Knowledge Atlas performance budgets (Task 22)', () => {
  it('keeps always-label keys within the chip budget headroom', () => {
    expect(ALWAYS_LABEL_KEYS_CAP).toBeLessThanOrEqual(
      KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET.labelChipsDom,
    )
    const benchmark = readFixture('benchmark.json')
    expect(alwaysLabelKeys(benchmark.nodes).size).toBeLessThanOrEqual(
      ALWAYS_LABEL_KEYS_CAP,
    )
  })

  it('measures fixture runtime and embedded gzip sizes against §19.2 ceilings', () => {
    for (const name of ['en.json', 'fa.json', 'benchmark.json'] as const) {
      const payload = readFixture(name)
      const runtimeGzip = runtimePayloadGzipSize(payload)
      const embeddedGzip = embeddedSnapshotGzipSize(payload)
      expect(runtimeGzip, `${name} runtime gzip`).toBeLessThanOrEqual(
        KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET.runtimePayloadGzipBytes,
      )
      expect(embeddedGzip, `${name} embedded gzip`).toBeLessThanOrEqual(
        KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET.embeddedSnapshotGzipBytes,
      )
    }
  })

  it('keeps presentation DOM nodes at or under the §19.2 ceiling', async () => {
    const payload = readFixture('benchmark.json')
    const html = await renderAtlasPage(payload)
    const region = extractAtlasRegionHtml(html)
    const nodes = countOpeningHtmlTags(region)
    expect(KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET.presentationDomNodes).toBe(2500)
    expect(nodes).toBeGreaterThan(0)
    expect(nodes).toBeLessThanOrEqual(
      KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET.presentationDomNodes,
    )
  })
})
