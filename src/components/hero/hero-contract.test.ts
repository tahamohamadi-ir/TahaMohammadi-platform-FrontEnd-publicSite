import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import {
  adaptHeroGraph,
  createStaticRelatedResolver,
  type GraphPayloadOut,
  type HeroGraphModel,
} from '../../lib/hero-graph-content'
import {
  SCENE_CONTRACT_VERSION,
  SCENE_MOTION,
  SCENE_PALETTE_ROLES,
  SCENE_PERFORMANCE_CEILINGS,
  SCENE_SLOT,
  scenePaletteFromCss,
  toScenePayload,
  validateScenePayload,
} from '../../lib/visual/scene-contract'
import GraphNodeList from './GraphNodeList.astro'
import HeroGraph from './HeroGraph.astro'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0]

async function render(
  component: Component,
  props: Record<string, unknown> = {},
) {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

function readSource(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

function readFixturePayload(): GraphPayloadOut {
  const raw = readFileSync(
    path.join(
      repositoryRoot,
      'tests',
      'fixtures',
      'contracts',
      'hero-graph.json',
    ),
    'utf8',
  )
  return (JSON.parse(raw) as { payload: GraphPayloadOut }).payload
}

const resolver = createStaticRelatedResolver([
  {
    family: 'researchtopic',
    id: '11',
    locale: 'en',
    href: '/en/research/human-centered-ai/',
  },
  {
    family: 'project',
    id: '7',
    locale: 'en',
    href: '/en/projects/pars-sql/',
  },
  {
    family: 'publication',
    id: '3',
    locale: 'en',
    href: '/en/blog/vtd-edge/',
  },
  {
    family: 'article',
    id: '21',
    locale: 'en',
    href: '/en/blog/visual-discourse/',
  },
])

function readyModel(): Extract<HeroGraphModel, { status: 'ready' }> {
  const model = adaptHeroGraph(readFixturePayload(), {
    locale: 'en',
    resolveRelatedHref: resolver,
  })
  if (model.status !== 'ready') throw new Error('fixture must adapt to ready')
  return model
}

describe('CA-03 locked scene contract', () => {
  it('pins the contract version, motion targets, ceilings, and slot sizes', () => {
    expect(SCENE_CONTRACT_VERSION).toBe('ca03-1.0.0')
    expect(SCENE_MOTION.settleMs).toEqual({ min: 600, max: 900 })
    expect(SCENE_MOTION.selectionMs).toEqual({ min: 180, max: 280 })
    expect(SCENE_MOTION.tiltDegrees).toBe(3)
    expect(SCENE_PERFORMANCE_CEILINGS).toMatchObject({
      maxActiveCanvasesPerRoute: 1,
      maxDevicePixelRatioDesktop: 1.5,
      maxDevicePixelRatioMobile: 1,
      maxDrawingBufferPixels: 1500000,
      maxDrawCalls: 60,
      maxTriangles: 50000,
      maxSceneJsGzipKiB: 300,
    })
    expect(SCENE_SLOT).toMatchObject({
      desktopMinHeight: 520,
      desktopMaxHeight: 620,
      mobileMinHeight: 280,
      mobileMaxHeight: 360,
    })
    expect(SCENE_PALETTE_ROLES).toHaveLength(7)
  })

  it('bridges the semantic model to renderer input with edge emphasis', () => {
    const payload = toScenePayload(readyModel(), 'node-01')
    expect(payload.contractVersion).toBe(SCENE_CONTRACT_VERSION)
    expect(payload.locale).toBe('en')
    expect(payload.nodes).toHaveLength(5)
    expect(payload.edges).toHaveLength(4)
    for (const node of payload.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
      expect(Number.isFinite(node.z)).toBe(true)
    }
    expect(payload.nodes.find((node) => node.id === 'node-01')?.selected).toBe(
      true,
    )
    expect(
      payload.nodes.filter((node) => node.dimmed).map((node) => node.id),
    ).toEqual(['node-04'])
    expect(
      payload.edges
        .filter((edge) => edge.emphasized)
        .map((edge) => edge.id)
        .sort(),
    ).toEqual(['edge-01', 'edge-02', 'edge-04'])
    expect(validateScenePayload(payload)).toEqual({ ok: true })
  })

  it('rejects contradictory scene input without fabricating geometry', () => {
    const payload = toScenePayload(readyModel(), null)
    const duplicate = {
      ...payload,
      nodes: [...payload.nodes, { ...payload.nodes[0] }],
    }
    expect(validateScenePayload(duplicate).ok).toBe(false)

    const dangling = {
      ...payload,
      edges: [
        ...payload.edges,
        {
          id: 'edge-ghost',
          source: 'node-01',
          target: 'node-missing',
          directed: true,
          emphasized: false,
        },
      ],
    }
    const danglingResult = validateScenePayload(dangling)
    expect(danglingResult.ok).toBe(false)
    if (!danglingResult.ok) {
      expect(danglingResult.issues).toContain('edge-dangling-target:edge-ghost')
    }

    const nonFinite = {
      ...payload,
      nodes: payload.nodes.map((node, index) =>
        index === 0 ? { ...node, x: Number.NaN } : node,
      ),
    }
    expect(validateScenePayload(nonFinite).ok).toBe(false)

    const wrongVersion = { ...payload, contractVersion: 'ca99-0.0.0' }
    const versionResult = validateScenePayload(wrongVersion)
    expect(versionResult.ok).toBe(false)
    if (!versionResult.ok) {
      expect(versionResult.issues).toContain('contract-version-mismatch')
    }
  })

  it('reads the exact palette roles from authored CSS variables', () => {
    const palette = scenePaletteFromCss((name) => `token(${name})`)
    expect(palette).toEqual({
      canvas: 'token(--color-canvas)',
      ink: 'token(--color-ink)',
      brand: 'token(--color-brand)',
      signature: 'token(--color-signature)',
      research: 'token(--color-research)',
      context: 'token(--color-context)',
      surface: 'token(--color-surface)',
    })
  })
})

describe('CA-03 semantic HeroGraph', () => {
  it('renders the ready graph with native controls and a hidden canvas', async () => {
    const html = await render(HeroGraph, { locale: 'en', graph: readyModel() })
    expect(html).toMatch(/data-graph-region/)
    expect(html).toMatch(/data-graph-status="ready"/)
    expect(html).toMatch(/data-graph-locale="en"/)
    expect(html).toMatch(/data-scene-contract="ca03-1.0.0"/)
    expect(html).toMatch(/<h2 id="home-graph-heading"[^>]*>/)
    expect(html).toContain('Research Statement')
    expect(html.match(/<details[\s>]/g)?.length).toBe(5)
    expect(html.match(/<summary[\s>]/g)?.length).toBe(5)
    expect(html).toMatch(/data-graph-canvas/)
    expect(html).toMatch(/aria-hidden="true"/)
    expect(html).toMatch(/<canvas[^>]*hidden/)
    expect(html).toMatch(/data-graph-detail/)
    expect(html).toMatch(/Select a node to read its summary/)
    expect(html).not.toMatch(/data-theme-picture/)
    expect(html).not.toMatch(/portal-orbit/)
    expect(html).not.toMatch(/<h1[\s>]/)
  })

  it('renders only resolver-verified links and an API-only edge index', async () => {
    const html = await render(HeroGraph, { locale: 'en', graph: readyModel() })
    expect(html).toMatch(/href="\/en\/research\/human-centered-ai\/"/)
    expect(html.match(/data-graph-edge="/g)?.length).toBe(4)
    expect(html).toContain('Human-Centered AI')
    expect(html).not.toMatch(/tabindex/i)
  })

  it('shows the selected node in the reserved detail area', async () => {
    const html = await render(HeroGraph, {
      locale: 'en',
      graph: readyModel(),
      selectedId: 'node-02',
    })
    const detail = html.match(/data-graph-detail[\s\S]*?<\/div>/)?.[0] ?? ''
    expect(detail).toContain('Visual Analytics')
    expect(detail).toContain('Inspectable evidence for real decisions.')
    expect(detail).toMatch(/href="\/en\/blog\/vtd-edge\/"/)
  })

  it('renders honest empty, error, and unavailable states without fake nodes', async () => {
    const states: Array<{
      graph: HeroGraphModel
      status: string
      copy: RegExp
    }> = [
      {
        graph: { status: 'empty', locale: 'en', warnings: [] },
        status: 'empty',
        copy: /No graph nodes yet/,
      },
      {
        graph: { status: 'error', locale: 'en', issues: ['fixture'] },
        status: 'error',
        copy: /Graph data could not be shown/,
      },
      {
        graph: { status: 'unavailable', locale: 'fa' },
        status: 'unavailable',
        copy: /گراف پژوهشی در دسترس نیست/,
      },
    ]
    for (const state of states) {
      const html = await render(HeroGraph, {
        locale: state.graph.locale,
        graph: state.graph,
      })
      expect(html).toMatch(new RegExp(`data-graph-status="${state.status}"`))
      expect(html).toMatch(state.copy)
      expect(html).not.toMatch(/data-graph-node=/)
      expect(html).not.toMatch(/data-graph-canvas/)
    }
  })
})

describe('CA-03 GraphNodeList', () => {
  it('renders one native disclosure per node with summaries and links', async () => {
    const model = readyModel()
    const html = await render(GraphNodeList, {
      locale: 'en',
      nodes: model.nodes,
      selectedId: 'node-03',
      listLabel: 'Research graph nodes',
    })
    expect(html).toMatch(/aria-label="Research graph nodes"/)
    expect(html.match(/data-graph-node="/g)?.length).toBe(5)
    expect(html).toMatch(/data-x="-80"/)
    expect(html).toMatch(/data-color-role="brand"/)
    expect(html.match(/<a[\s>]/g)?.length).toBe(4)
    expect(html).not.toMatch(/tabindex/i)
    expect(html).not.toMatch(/aria-disabled/i)
  })

  it('renders no anchors while related records stay unresolved', async () => {
    const unresolved = adaptHeroGraph(readFixturePayload(), { locale: 'en' })
    if (unresolved.status !== 'ready') throw new Error('expected ready model')
    const html = await render(GraphNodeList, {
      locale: 'en',
      nodes: unresolved.nodes,
      selectedId: null,
      listLabel: 'Research graph nodes',
    })
    expect(html).not.toMatch(/<a[\s>]/)
    expect(html.match(/<details[\s>]/g)?.length).toBe(5)
  })
})

describe('CA-03 Home integration', () => {
  it('wires the graph into HomeHero on both locale pages', () => {
    for (const locale of ['fa', 'en'] as const) {
      const source = readSource(`src/pages/${locale}/index.astro`)
      expect(source).toContain('loadHeroGraph')
      expect(source).toContain('graph={graph}')
      expect(source).not.toContain('HomeResearchGraph')
      expect(source).not.toContain('relationship-graph')
    }
  })

  it('keeps the optional template slot for compatibility', () => {
    expect(readSource('src/components/templates/HomeTemplate.astro')).toContain(
      'slot name="relationship-graph"',
    )
  })

  it('ships responsive hero graph styles for both themes and locales', () => {
    const css = readSource('src/styles/hero-graph.css')
    expect(css).toContain('.hm-hero--integrated')
    expect(css).toMatch(
      /\.hm-hero\.hm-hero--integrated\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    expect(css).toMatch(
      /@media \(min-width:\s*1024px\)[\s\S]*?\.hm-hero\.hm-hero--integrated\s*\{[\s\S]*?repeat\(12/,
    )
    expect(css).toContain('.hg-scene')
    expect(css).toContain('520px')
    expect(css).toContain('280px')
    expect(css).toContain('focus-visible')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('inline-size')
  })

  it('documents the locked contract in the Atlas foundations', () => {
    const atlas = readSource('src/atlas/sections/FoundationsSection.astro')
    expect(atlas).toContain('AtlasHeroSceneContract')
    expect(atlas).toContain('SCENE_CONTRACT_VERSION')
  })
})
