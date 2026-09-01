#!/usr/bin/env node
/**
 * Owner visual compare assist — side-by-side HTML report from existing PNG captures.
 *
 * Does NOT auto-approve or change PUBLIC-190 verdict. Generates a local review page only.
 *
 * Usage:
 *   npm run build && npm run test:visual -- --grep PUBLIC-270
 *   npm run report:visual-compare
 *
 * Optional env:
 *   DESIGN_AUTHORITY_ROOT — override concept reference root (default: coordination Docs/references/frontend-design-authority)
 *   VISUAL_COMPARE_OUTPUT — override HTML output path
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildHomeCompareRows,
  buildPublic270CompareRows,
  captureOutputDir,
  defaultDesignAuthorityRoot,
  repositoryRoot,
} from './page-family-visual-compare.mjs'

const defaultOutput = path.join(
  repositoryRoot,
  'test-results/visual/compare-report.html',
)

const designAuthorityRoot =
  process.env.DESIGN_AUTHORITY_ROOT ?? defaultDesignAuthorityRoot
const outputPath = process.env.VISUAL_COMPARE_OUTPUT ?? defaultOutput

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function fileToDataUri(filePath) {
  const buffer = readFileSync(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function statusFor(row) {
  const hasCapture = existsSync(row.capturePath)
  const hasConcept = row.conceptPath ? existsSync(row.conceptPath) : false

  if (!hasCapture && !hasConcept) return 'missing-both'
  if (!hasCapture) return 'missing-capture'
  if (!hasConcept && row.conceptPath) return 'missing-concept'
  if (!row.conceptPath) return 'capture-only'
  return 'ready'
}

function renderImageCell(filePath, label, missingText) {
  if (!filePath || !existsSync(filePath)) {
    return `<div class="missing">${missingText}</div>`
  }

  const hash = sha256File(filePath)
  return `<figure>
    <img src="${fileToDataUri(filePath)}" alt="${label}" loading="lazy" />
    <figcaption><code>${path.basename(filePath)}</code><br /><span class="hash">${hash}</span></figcaption>
  </figure>`
}

function buildHtml({ pfRows, homeRows, generatedAt }) {
  const readyCount = [...pfRows, ...homeRows].filter(
    (row) => statusFor(row) === 'ready',
  ).length
  const totalCount = pfRows.length + homeRows.length

  const pfSections = pfRows
    .map((row) => {
      const status = statusFor(row)
      return `<section class="compare ${status}" id="${row.captureFile}">
  <header>
    <h2>${row.label}</h2>
    <p class="meta">${row.pf} · <code>${row.captureFile}</code> ↔ <code>${row.conceptRelative ?? 'n/a'}</code></p>
    ${row.optional ? '<p class="note">Optional — PF-02 detail skipped until published route exists.</p>' : ''}
  </header>
  <div class="panels">
    <div class="panel">
      <h3>Implementation capture</h3>
      ${renderImageCell(row.capturePath, row.captureFile, 'Capture not found — run <code>npm run test:visual -- --grep PUBLIC-270</code>')}
    </div>
    <div class="panel">
      <h3>Concept reference</h3>
      ${renderImageCell(row.conceptPath, row.conceptFile ?? 'concept', 'Concept reference not found at design authority root')}
    </div>
  </div>
</section>`
    })
    .join('\n')

  const homeSections = homeRows
    .map((row) => {
      const status = statusFor(row)
      return `<section class="compare ${status}" id="${row.captureFile}">
  <header>
    <h2>${row.label}</h2>
    <p class="meta"><code>${row.captureFile}</code>${row.conceptRelative ? ` ↔ <code>${row.conceptRelative}</code>` : ''}</p>
    ${row.note ? `<p class="note">${row.note}</p>` : ''}
  </header>
  <div class="panels">
    <div class="panel">
      <h3>Implementation capture</h3>
      ${renderImageCell(row.capturePath, row.captureFile, 'Capture not found — run wp40-home visual tests or capture manually')}
    </div>
    <div class="panel">
      <h3>Concept reference</h3>
      ${row.conceptPath ? renderImageCell(row.conceptPath, row.conceptFile ?? 'concept', 'Concept reference not found') : '<div class="missing">No single concept reference — review note above.</div>'}
    </div>
  </div>
</section>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PUBLIC-270 / Home visual compare (owner assist)</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.5; }
    body { margin: 0; padding: 1.5rem; max-width: 1400px; }
    h1 { font-size: 1.35rem; }
    .banner { background: #3b2f00; color: #fff8e6; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .summary { margin-bottom: 2rem; }
    .compare { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
    .compare.ready { border-color: #2d6a4f; }
    .compare.missing-capture, .compare.missing-both { border-color: #9d0208; }
    .compare.missing-concept { border-color: #e85d04; }
    .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 900px) { .panels { grid-template-columns: 1fr; } }
    img { max-width: 100%; height: auto; border: 1px solid #888; background: #111; }
    figure { margin: 0; }
    figcaption { font-size: 0.8rem; margin-top: 0.5rem; word-break: break-all; }
    .hash { font-family: ui-monospace, monospace; font-size: 0.72rem; opacity: 0.85; }
    .missing { padding: 2rem 1rem; background: #f5f5f5; border: 1px dashed #999; text-align: center; }
    .note { font-size: 0.9rem; opacity: 0.9; }
    code { font-size: 0.85em; }
    .toc a { display: block; margin: 0.25rem 0; }
  </style>
</head>
<body>
  <div class="banner">
    <strong>Owner assist only</strong> — does not change PUBLIC-190 verdict. Record SHA-256 hashes in
    <code>Docs/10-tracking/PUBLIC-190-VISUAL-QA.md</code> after manual review. Do not mark PASS without explicit owner approval.
  </div>
  <h1>PUBLIC-270 page-family + home visual compare</h1>
  <p class="summary">Generated ${generatedAt}. Pairs ready for review: <strong>${readyCount}</strong> / ${totalCount}.
    Design authority: <code>${designAuthorityRoot}</code>. Captures: <code>${captureOutputDir}</code>.</p>
  <nav class="toc">
    <h2>Page families (PUBLIC-270)</h2>
    ${pfRows.map((row) => `<a href="#${row.captureFile}">${row.label}</a>`).join('\n')}
    <h2>Home / gateway (WP-40)</h2>
    ${homeRows.map((row) => `<a href="#${row.captureFile}">${row.label}</a>`).join('\n')}
  </nav>
  <h2>Page families</h2>
  ${pfSections}
  <h2>Home / gateway</h2>
  ${homeSections}
</body>
</html>`
}

function main() {
  const pfRows = buildPublic270CompareRows(designAuthorityRoot)
  const homeRows = buildHomeCompareRows(designAuthorityRoot)
  const generatedAt = new Date().toISOString()

  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(
    outputPath,
    buildHtml({ pfRows, homeRows, generatedAt }),
    'utf8',
  )

  const ready = [...pfRows, ...homeRows].filter(
    (row) => statusFor(row) === 'ready',
  ).length
  const missingCaptures = [...pfRows, ...homeRows].filter(
    (row) => !existsSync(row.capturePath),
  ).length

  console.log(`Visual compare report: ${outputPath}`)
  console.log(`  Design authority: ${designAuthorityRoot}`)
  console.log(`  Pairs ready: ${ready} / ${pfRows.length + homeRows.length}`)
  if (missingCaptures > 0) {
    console.log(
      `  Missing ${missingCaptures} capture(s) — run: npm run build && npm run test:visual -- --grep "PUBLIC-270|WP-40 home captures"`,
    )
  }
  if (!existsSync(designAuthorityRoot)) {
    console.warn(
      `  Warning: design authority root not found. Set DESIGN_AUTHORITY_ROOT or open from coordination workspace.`,
    )
  }
}

main()
