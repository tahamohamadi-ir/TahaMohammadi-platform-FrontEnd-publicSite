#!/usr/bin/env node
/**
 * Task 18 — Atlas screen-space picking benchmark (measurement only).
 *
 * Bundles real picking/layout modules via esbuild, then times projectAtlasPick
 * on the benchmark fixture at v1 scale.
 */

import * as esbuild from 'esbuild'
import { hostname, cpus, platform, arch, totalmem } from 'node:os'
import { rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

function parseArgs(argv) {
  let fixture = 'tests/fixtures/atlas/benchmark.json'
  let iterations = 200
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--fixture' && argv[i + 1]) {
      fixture = argv[++i]
    } else if (arg === '--iterations' && argv[i + 1]) {
      iterations = Number.parseInt(argv[++i], 10)
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/atlas-pick-benchmark.mjs [--fixture path] [--iterations N]`)
      process.exit(0)
    }
  }
  if (!Number.isFinite(iterations) || iterations < 1) {
    throw new Error('--iterations must be a positive integer')
  }
  return {
    fixturePath: resolve(repoRoot, fixture),
    iterations,
  }
}

async function loadRunner() {
  const outfile = join(__dirname, '.atlas-pick-benchmark.bundle.mjs')
  rmSync(outfile, { force: true })
  await esbuild.build({
    entryPoints: [join(__dirname, 'atlas-pick-benchmark-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    absWorkingDir: repoRoot,
    packages: 'external',
    logLevel: 'silent',
  })
  return import(`${pathToFileURL(outfile).href}?v=${Date.now()}`)
}

function formatMachine() {
  const cpu = cpus()[0]?.model?.trim() ?? 'unknown CPU'
  const ramGiB = (totalmem() / 1024 ** 3).toFixed(1)
  return `${hostname()} · ${platform()} ${arch()} · ${cpu} · ${ramGiB} GiB RAM`
}

async function main() {
  const options = parseArgs(process.argv)
  const { runBenchmark } = await loadRunner()
  const result = runBenchmark(options)

  const broadPhase =
    result.pass ? 'broad-phase: not required' : 'broad-phase: required'

  console.log(
    JSON.stringify(
      {
        ...result,
        machine: formatMachine(),
        broadPhase,
        task19: result.pass ? 'SKIP Task 19' : 'Proceed with Task 19',
      },
      null,
      2,
    ),
  )

  console.log('')
  console.log(
    `p50=${result.p50Ms.toFixed(3)}ms p95=${result.p95Ms.toFixed(3)}ms budget=${result.budgetMs}ms ${result.pass ? 'PASS' : 'FAIL'} · ${broadPhase}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
