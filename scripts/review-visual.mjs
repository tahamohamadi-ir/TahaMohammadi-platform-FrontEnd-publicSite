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

function runStep(label, command, args, options = {}) {
  console.log(`\n▶ ${label}`)
  const result = options.rawCommand
    ? spawnSync(options.rawCommand, {
        cwd: repositoryRoot,
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync(command, args, {
        cwd: repositoryRoot,
        stdio: 'inherit',
        shell: options.shell ?? process.platform === 'win32',
      })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runStep('build', 'npm', ['run', 'build'])

if (process.platform === 'win32') {
  runStep('visual captures (PUBLIC-270 + WP-40 home/gateway)', null, null, {
    rawCommand: `npx playwright test --grep "${visualGrep}" --workers=1`,
  })
} else {
  runStep(
    'visual captures (PUBLIC-270 + WP-40 home/gateway)',
    'npx',
    ['playwright', 'test', '--grep', visualGrep, '--workers=1'],
    { shell: false },
  )
}

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
