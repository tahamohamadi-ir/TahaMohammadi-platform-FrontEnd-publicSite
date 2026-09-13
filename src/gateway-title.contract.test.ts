import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * QA-03 — the gateway title contract, pinned at source level.
 *
 * The E2E harness supplies deterministic site settings so `.gw__title` can
 * render (see `scripts/e2e-site-settings-fixture.mjs`). These assertions exist
 * so that fixture can never quietly redefine the product contract in either
 * direction:
 *
 *   A. settings carry a brand name  -> `.gw__title` renders that name
 *   B. settings carry no name       -> the optional title is omitted and the
 *                                      prompt stays the accessible h1
 *
 * They also pin the two things the task explicitly forbids: making the title
 * unconditional, and hardcoding the personal name into product source.
 *
 * Lives at `src/` root (like `public-310.contract-fixtures.test.ts`) rather
 * than beside the page: every file under `src/pages/` becomes an Astro route,
 * so a test placed there is prerendered and breaks the build.
 */

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function readRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

const indexSource = readRepositoryFile('src/pages/index.astro')
const settingsSource = readRepositoryFile('src/lib/site-settings-content.ts')

describe('gateway title contract', () => {
  it('A: renders .gw__title from the settings brand name', () => {
    // The name comes from live site settings…
    expect(indexSource).toMatch(/settings\?\.brandName/)
    // …and the title element is fed exactly that value.
    expect(indexSource).toMatch(
      /name && \(\s*<h1 id="gateway-name" class="gw__title">\s*\{name\}/,
    )
  })

  it('B: omits the title when settings carry no brand name', () => {
    // The title is guarded by `name &&` — never unconditional.
    expect(indexSource).toMatch(/name && \(\s*<h1 id="gateway-name"/)
    // Without a name the prompt stays the accessible h1, so the page still has
    // exactly one heading and remains navigable.
    expect(indexSource).toMatch(
      /name \? \(\s*<p id="gateway-prompt" class="gw__prompt">/,
    )
    expect(indexSource).toMatch(/<h1 id="gateway-prompt" class="gw__prompt">/)
  })

  it('never hardcodes the personal name into the page', () => {
    expect(indexSource).not.toMatch(/Taha/)
  })

  it('keeps the settings loader free of test-only seams', () => {
    // QA-03 wires the fixture through the existing PUBLIC_API_BASE_URL config
    // seam, so production code must not grow a fixture branch of its own.
    for (const source of [indexSource, settingsSource]) {
      expect(source).not.toMatch(/TM_E2E|SETTINGS_FIXTURE|fixture/i)
    }
  })
})
