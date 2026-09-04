import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { LOCALE_FONT_PRELOADS } from './test-harness/performance-budget'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

interface SubsetEntry {
  path: string
  family: string
  script: string
  unicodeRanges: string
  bytes: number
  sha256: string
  fullBytes: number
  verifiedProbes: string[]
}

function loadFixture(): { files: SubsetEntry[] } {
  const fixturePath = path.join(
    repositoryRoot,
    'tests',
    'fixtures',
    'fonts',
    'subset-coverage.json',
  )
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    files: SubsetEntry[]
  }
}

function publicPath(webPath: string): string {
  return path.join(repositoryRoot, 'public', webPath.replace(/^\//, ''))
}

function sha256Of(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function normalizeRanges(ranges: string): string {
  return ranges.replace(/\s+/g, '').toUpperCase()
}

describe('PUBLIC-050/PS-10 font subsets', () => {
  it('pins every claimed subset file with matching hash and smaller size', () => {
    const { files } = loadFixture()
    expect(files.length).toBeGreaterThan(0)
    for (const entry of files) {
      const filePath = publicPath(entry.path)
      expect(existsSync(filePath), `${entry.path} must exist`).toBe(true)
      const actualBytes = statSync(filePath).size
      expect(actualBytes).toBe(entry.bytes)
      expect(actualBytes).toBeLessThan(entry.fullBytes)
      expect(sha256Of(filePath)).toBe(entry.sha256)
      expect(entry.verifiedProbes.length).toBeGreaterThan(0)
    }
  })

  it('wires each subset in fonts.css with its claimed unicode-range', () => {
    const { files } = loadFixture()
    const css = readFileSync(
      path.join(repositoryRoot, 'src', 'styles', 'fonts.css'),
      'utf8',
    )
    for (const entry of files) {
      const facePattern = new RegExp(
        `@font-face\\s*\\{[^}]*${entry.path.replace(/[./-]/g, (c) => `\\${c}`)}[^}]*\\}`,
      )
      const match = css.match(facePattern)
      expect(match, `${entry.path} needs an @font-face block`).not.toBeNull()
      expect(normalizeRanges(match![0])).toContain(
        normalizeRanges(`unicode-range: ${entry.unicodeRanges}`),
      )
    }
  })

  it('preloads the subset files per locale in BaseLayout.astro', () => {
    const layout = readFileSync(
      path.join(repositoryRoot, 'src', 'layouts', 'BaseLayout.astro'),
      'utf8',
    )
    for (const locale of ['en', 'fa'] as const) {
      for (const href of LOCALE_FONT_PRELOADS[locale]) {
        expect(layout).toContain(`href="${href}"`)
        expect(
          existsSync(publicPath(href)),
          `preloaded ${href} must exist`,
        ).toBe(true)
      }
    }
  })
})
