import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const ADR_FILES = [
  'docs/architecture/README.md',
  'docs/architecture/ADR-PACKAGE-MANAGER.md',
  'docs/architecture/ADR-ROUTING.md',
  'docs/architecture/ADR-DEPLOYMENT.md',
  'docs/architecture/ADR-TESTING.md',
  'docs/architecture/ADR-BROWSER-SUPPORT.md',
  'docs/architecture/ADR-ANIMATION.md',
] as const

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

describe('PUBLIC-013 architecture decision records', () => {
  it('commits all required ADR documents', () => {
    for (const relativePath of ADR_FILES) {
      expect(existsSync(path.join(repositoryRoot, relativePath))).toBe(true)
    }
  })

  it('indexes every ADR from docs/architecture/README.md', () => {
    const readme = readRepoFile('docs/architecture/README.md')
    for (const relativePath of ADR_FILES) {
      if (relativePath.endsWith('README.md')) continue
      const basename = path.basename(relativePath)
      expect(readme).toContain(basename)
    }
  })

  it('marks each ADR as Accepted', () => {
    for (const relativePath of ADR_FILES) {
      if (relativePath.endsWith('README.md')) continue
      const content = readRepoFile(relativePath)
      expect(content).toMatch(/## Status[\s\S]*Accepted/)
    }
  })

  it('documents npm as the package manager', () => {
    const adr = readRepoFile('docs/architecture/ADR-PACKAGE-MANAGER.md')
    expect(adr).toContain('npm')
    expect(existsSync(path.join(repositoryRoot, 'package-lock.json'))).toBe(
      true,
    )
  })

  it('documents Vitest and Playwright tag scripts in package.json', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>
    }
    expect(packageJson.scripts.test).toBe('vitest run')
    expect(packageJson.scripts['test:foundation']).toContain('@foundation')
    expect(packageJson.scripts['test:visual']).toContain('@visual')
    expect(packageJson.scripts['test:a11y']).toContain('@a11y')
    expect(packageJson.scripts['test:performance']).toContain('@performance')
    expect(packageJson.scripts['test:nojs']).toContain('@nojs')
    expect(packageJson.scripts['test:smoke']).toContain('@smoke')
  })
})
