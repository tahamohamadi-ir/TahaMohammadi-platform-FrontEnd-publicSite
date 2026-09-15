#!/usr/bin/env node
/**
 * Stage 4.2 — promote the winning relation-look masters into the governed media pipeline.
 *
 * Copies the 16 alpha masters into `src/assets/media/hero-v2/` (same filenames, so the promoted
 * registry metadata — slots, dimensions, transform recipes, loading policy — is untouched) and
 * rewrites their authority hashes in `src/lib/media/authority-checksums.ts`. The build then
 * re-derives every AVIF/WebP from the new masters, so the site never ships an ungoverned asset.
 *
 * Usage:
 *   node scripts/promote-hero-v2-stage4_2.mjs --renders ../../Design-Assets/hero-v2/renders/stage4_2/alpha
 *   node scripts/promote-hero-v2-stage4_2.mjs --renders <dir> --dry-run
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const rendersArg = args.includes('--renders')
  ? args[args.indexOf('--renders') + 1]
  : null
const dryRun = args.includes('--dry-run')
if (!rendersArg) {
  console.error(
    'promote-hero-v2-stage4_2: --renders <alpha master directory> is required',
  )
  process.exit(1)
}
const SOURCE_DIR = path.resolve(rendersArg)
const TARGET_DIR = path.join(ROOT, 'src', 'assets', 'media', 'hero-v2')
const CHECKSUMS = path.join(
  ROOT,
  'src',
  'lib',
  'media',
  'authority-checksums.ts',
)

const IDS = []
for (const device of ['desktop', 'mobile']) {
  for (const theme of ['dark', 'light']) {
    for (const frame of ['01', '02', '03', '04']) {
      IDS.push(`hero-v2-${device}-${theme}-${frame}`)
    }
  }
}

const sha256 = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex')
const rows = []
for (const id of IDS) {
  // Candidate masters are named `<device>-<theme>-<frame>.png`; the governed asset id adds the
  // `hero-v2-` prefix that the registry and authority checksums use.
  const sourceName = id.replace(/^hero-v2-/, '')
  const source = path.join(SOURCE_DIR, `${sourceName}.png`)
  if (!existsSync(source)) {
    console.error(`promote-hero-v2-stage4_2: missing master ${source}`)
    process.exit(1)
  }
  const target = path.join(TARGET_DIR, `${id}.png`)
  const previous = existsSync(target) ? sha256(target) : null
  const next = sha256(source)
  rows.push({ id, previous, next, changed: previous !== next })
  if (!dryRun) copyFileSync(source, target)
}

let checksums = readFileSync(CHECKSUMS, 'utf8')
let updated = 0
for (const row of rows) {
  const pattern = new RegExp(`('${row.id}':\\s*')?([a-f0-9]{64})(')`)
  const exact = new RegExp(`'${row.id}':\\s*'([a-f0-9]{64})'`)
  if (exact.test(checksums)) {
    checksums = checksums.replace(exact, `'${row.id}': '${row.next}'`)
    updated += 1
  } else if (pattern.test(checksums)) {
    console.error(
      `promote-hero-v2-stage4_2: could not locate the hash entry for ${row.id}`,
    )
    process.exit(1)
  }
}
if (!dryRun) writeFileSync(CHECKSUMS, checksums)

for (const row of rows) {
  console.log(
    `${row.changed ? 'updated' : 'identical'} ${row.id} ${row.next.slice(0, 12)}…`,
  )
}
console.log(
  `${dryRun ? 'dry run: ' : ''}${rows.filter((r) => r.changed).length} of ${rows.length} masters changed, ${updated} authority hashes rewritten`,
)
