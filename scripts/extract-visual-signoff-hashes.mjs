#!/usr/bin/env node
/**
 * Owner sign-off assist — extract SHA-256 hashes from visual capture PNGs
 * (or parse an existing compare-report.html) for paste into
 * Docs/10-tracking/PUBLIC-190-VISUAL-QA.md §4.
 *
 * Does NOT auto-approve or change PUBLIC-190 verdict.
 *
 * Usage:
 *   npm run review:visual
 *   npm run report:signoff-hashes
 *   npm run report:signoff-hashes -- --ready-only
 *   npm run report:signoff-hashes -- --format json
 *   npm run report:signoff-hashes -- --from-report
 *   (alias: npm run extract:visual-hashes)
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildHomeCompareRows,
  buildPublic270CompareRows,
  captureOutputDir,
  resolveDesignAuthorityRootFromEnv,
} from './page-family-visual-compare.mjs'

const defaultReportPath = path.join(captureOutputDir, 'compare-report.html')

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function pairStatus(row) {
  const hasCapture = existsSync(row.capturePath)
  const hasConcept = row.conceptPath ? existsSync(row.conceptPath) : false

  if (!hasCapture) return 'missing-capture'
  if (!row.conceptPath) return 'capture-only'
  if (!hasConcept) return 'missing-concept'
  return 'ready'
}

function buildRowsFromCaptures(designAuthorityRoot) {
  const pfRows = buildPublic270CompareRows(designAuthorityRoot).map((row) => ({
    label: row.label,
    captureFile: row.captureFile,
    capturePath: row.capturePath,
    conceptRelative: row.conceptRelative ?? null,
    optional: row.optional ?? false,
    status: pairStatus(row),
    sha256: existsSync(row.capturePath) ? sha256File(row.capturePath) : null,
  }))

  const homeRows = buildHomeCompareRows(designAuthorityRoot).map((row) => ({
    label: row.label,
    captureFile: row.captureFile,
    capturePath: row.capturePath,
    conceptRelative: row.conceptRelative ?? null,
    optional: false,
    status: pairStatus(row),
    sha256: existsSync(row.capturePath) ? sha256File(row.capturePath) : null,
  }))

  return [...pfRows, ...homeRows]
}

function parseHashesFromReport(reportPath) {
  if (!existsSync(reportPath)) {
    console.error(`Compare report not found: ${reportPath}`)
    console.error('Run: npm run review:visual')
    process.exit(1)
  }

  const html = readFileSync(reportPath, 'utf8')
  const rows = []
  const sectionPattern =
    /<section class="compare ([^"]+)" id="([^"]+)">[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<code>([^<]+)<\/code>[\s\S]*?<span class="hash">([a-f0-9]{64})<\/span>/g

  for (const match of html.matchAll(sectionPattern)) {
    const [, status, captureFile, label, basename, sha256] = match
    if (basename !== captureFile) continue
    rows.push({
      label: label.trim(),
      captureFile,
      capturePath: path.join(captureOutputDir, captureFile),
      conceptRelative: null,
      optional: status.includes('optional'),
      status: status.replace(/\s+/g, '-'),
      sha256,
    })
  }

  return rows
}

function filterRows(rows, { readyOnly, existingOnly }) {
  return rows.filter((row) => {
    if (readyOnly && row.status !== 'ready') return false
    if (existingOnly && !row.sha256) return false
    return true
  })
}

function formatMarkdown(rows) {
  const lines = [
    'Owner assist only — paste accepted rows into PUBLIC-190-VISUAL-QA.md §4. Does not change verdict.',
    '',
    '| Capture file | SHA-256 | Pair status | Accepted |',
    '|---|---|---|:---:|',
  ]

  for (const row of rows) {
    const hash = row.sha256 ?? '_(missing — re-run review:visual)_'
    lines.push(`| \`${row.captureFile}\` | \`${hash}\` | ${row.status} | [ ] |`)
  }

  return lines.join('\n')
}

function formatJson(rows) {
  return JSON.stringify(
    {
      disclaimer:
        'Owner assist only — does not change PUBLIC-190 verdict or auto-approve.',
      generatedAt: new Date().toISOString(),
      captureDir: captureOutputDir,
      rows,
    },
    null,
    2,
  )
}

function formatTsv(rows) {
  const lines = ['capture_file\tsha256\tpair_status\taccepted']
  for (const row of rows) {
    lines.push(`${row.captureFile}\t${row.sha256 ?? ''}\t${row.status}\t`)
  }
  return lines.join('\n')
}

function main() {
  const args = process.argv.slice(2)
  const readyOnly = args.includes('--ready-only')
  const existingOnly = args.includes('--existing-only')
  const fromReport = args.includes('--from-report')
  const formatArg = args.find((arg) => arg.startsWith('--format='))
  const format = formatArg?.split('=')[1] ?? 'markdown'
  const reportArg = args.find((arg) => arg.startsWith('--report='))
  const reportPath = reportArg?.split('=')[1] ?? defaultReportPath

  const designAuthorityRoot = resolveDesignAuthorityRootFromEnv()

  let rows = fromReport
    ? parseHashesFromReport(reportPath)
    : buildRowsFromCaptures(designAuthorityRoot)

  rows = filterRows(rows, { readyOnly, existingOnly })

  const readyCount = rows.filter((row) => row.status === 'ready').length
  const hashedCount = rows.filter((row) => row.sha256).length

  if (format === 'json') {
    console.log(formatJson(rows))
  } else if (format === 'tsv') {
    console.log(formatTsv(rows))
  } else {
    console.log(formatMarkdown(rows))
  }

  console.error(
    `\nExtracted ${hashedCount} hash(es) from ${rows.length} row(s); ${readyCount} ready pair(s).`,
  )
  console.error(
    'Owner assist only — record accepted hashes in PUBLIC-190-VISUAL-QA.md §4 after manual review.',
  )

  if (hashedCount === 0) {
    process.exit(1)
  }
}

main()
