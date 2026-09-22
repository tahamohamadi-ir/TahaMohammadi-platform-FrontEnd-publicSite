#!/usr/bin/env node
/**
 * Atlas pick benchmark (Plan C Task 18 — measurement, no implementation).
 *
 * Loads `tests/fixtures/atlas/benchmark.json`, bundles the real modules
 * (`picking.ts` + its `layout`/`hit-testing` lineage) through `esbuild`
 * exactly as existing one-off probes do, runs 200 picks at 10
 * pseudo-random-but-fixed screen points (mulberry32, seed pinned), and prints
 * `p50/p95` plus the triangle/draw-call figures.
 *
 * Usage:
 *   node scripts/atlas-pick-benchmark.mjs --fixture tests/fixtures/atlas/benchmark.json --iterations 200
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(join(root, 'package.json'))
const esbuild = require('esbuild')

const args = process.argv.slice(2)
function flag(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const fixturePath = join(
  root,
  flag('--fixture', 'tests/fixtures/atlas/benchmark.json'),
)
const iterations = Number.parseInt(flag('--iterations', '200'), 10)
if (!Number.isFinite(iterations) || iterations <= 0) {
  console.error('atlas-pick-benchmark: --iterations must be a positive integer')
  process.exit(1)
}

const payload = JSON.parse(readFileSync(fixturePath, 'utf8'))

// Bundle the real picking lineage (picking.ts → atlas/layout →
// RU layout/hit-testing) to a temp ESM file. three.js ships ESM; the bundle
// externalises nothing — what runs here is what ships.
const dir = mkdtempSync(join(tmpdir(), 'atlas-pick-bench-'))
const entry = join(root, 'src/lib/visual/atlas/picking.ts')
const outfile = join(dir, 'picking.bundle.mjs')
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
})
const { projectAtlasForPick, pickAtlasAt } = await import(
  pathToFileURL(outfile).href
)

// Deterministic projection: mirror the unit-test identity view (the camera
// pose only moves points rigidly; the benchmark measures picker cost, not
// camera math).
const scene = projectAtlasForPick(payload, {
  matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  width: 800,
  height: 520,
})

// 10 pseudo-random-but-fixed screen points (mulberry32, seed 0xATLAS = 66051).
function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(66051)
const points = Array.from({ length: 10 }, () => ({
  x: Math.floor(random() * 800),
  y: Math.floor(random() * 520),
}))

// Warmup, then measured runs round-robin over the 10 points.
for (let i = 0; i < 20; i += 1) pickAtlasAt(points[i % points.length], scene)
const samples = []
for (let i = 0; i < iterations; i += 1) {
  const point = points[i % points.length]
  const start = performance.now()
  pickAtlasAt(point, scene)
  samples.push(performance.now() - start)
}
samples.sort((a, b) => a - b)
const quantile = (q) =>
  samples[Math.min(samples.length - 1, Math.floor(q * samples.length))]
const p50 = quantile(0.5)
const p95 = quantile(0.95)

// Triangle/draw-call figures from the real geometry the scene reports:
// one shared unit sphere (read from the buffer actually uploaded) × the
// benchmark node/edge counts.
const sphereModule = join(dir, 'sphere.bundle.mjs')
await esbuild.build({
  entryPoints: [join(root, 'src/lib/visual/research-universe/spheres.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: sphereModule,
  logLevel: 'silent',
})
const { sharedSphereTriangles } = await import(pathToFileURL(sphereModule).href)
const sphereTriangles = sharedSphereTriangles()

const result = {
  fixture: flag('--fixture', 'tests/fixtures/atlas/benchmark.json'),
  iterations,
  nodes: payload.nodes.length,
  relations: payload.relations.length,
  p50ms: Math.round(p50 * 1000) / 1000,
  p95ms: Math.round(p95 * 1000) / 1000,
  budgetMs: 8,
  pass: p95 <= 8,
  sphereTriangles,
  approxSceneTriangles: sphereTriangles * payload.nodes.length,
  drawCallsEstimate:
    'nodes: one InstancedMesh per (tier, profile) batch + 1 rim; edges: 1 LineSegments',
}
console.log(JSON.stringify(result, null, 2))
writeFileSync(join(dir, 'result.json'), JSON.stringify(result, null, 2))
console.error(`detail: ${join(dir, 'result.json')}`)
