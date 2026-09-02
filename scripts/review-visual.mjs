#!/usr/bin/env node
/**
 * Owner one-command visual review pipeline:
 *   build -> PUBLIC-270 + WP-40 captures -> compare report -> print file:// path
 *
 * Does NOT change PUBLIC-190 verdict. Generates local review artifacts only.
 *
 * Usage:
 *   npm run review:visual
 *   npm run review:visual -- --serve
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const reportPath = path.join(
  repositoryRoot,
  'test-results/visual/compare-report.html',
)
const serve = process.argv.includes('--serve')
const visualGrep =
  'PUBLIC-270|WP-40 home captures|WP-40 home and gateway capture'

function spawnCommand(command, args) {
  if (process.platform === 'win32') {
    return spawnSync(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', command, ...args],
      {
        cwd: repositoryRoot,
        stdio: 'inherit',
        shell: false,
      },
    )
  }

  return spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    shell: false,
  })
}

function runStep(label, command, args) {
  console.log(`\n▶ ${label}`)
  const result = spawnCommand(command, args)

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runStep('build', 'npm', ['run', 'build'])

runStep('visual captures (PUBLIC-270 + WP-40 home/gateway)', 'npx', [
  'playwright',
  'test',
  '--grep',
  visualGrep,
  '--workers=1',
])

runStep('compare report', 'npm', ['run', 'report:visual-compare'])

if (!existsSync(reportPath)) {
  console.error(`Compare report not found: ${reportPath}`)
  process.exit(1)
}

const fileUrl = pathToFileURL(reportPath).href

console.log('\n✔ Visual compare report ready')
console.log(`  Path: ${reportPath}`)
console.log(`  Open: ${fileUrl}`)
console.log(
  '\nOwner assist only — record SHA-256 hashes in Docs/10-tracking/PUBLIC-190-VISUAL-QA.md after manual review.',
)
console.log('  Paste helper: npm run report:signoff-hashes [-- --ready-only]')

if (serve) {
  const port = process.env.VISUAL_COMPARE_PORT ?? '4173'
  console.log(
    `\n▶ serving compare report at http://127.0.0.1:${port}/compare-report.html`,
  )
  runStep('compare report server', 'node', [
    'scripts/serve-dist.mjs',
    '--port',
    port,
    '--root',
    'test-results/visual',
  ])
}
