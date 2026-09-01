import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

describe('PUBLIC-011 ESLint + Prettier toolchain', () => {
  it('declares lint and format scripts in package.json', () => {
    const packageJson = JSON.parse(readRepoFile('package.json'))
    expect(packageJson.scripts.lint).toBe('eslint .')
    expect(packageJson.scripts['lint:fix']).toBe('eslint . --fix')
    expect(packageJson.scripts.format).toBe('prettier --write .')
    expect(packageJson.scripts['format:check']).toBe('prettier --check .')
  })

  it('wires eslint flat config for Astro and TypeScript', () => {
    const eslintConfig = readRepoFile('eslint.config.js')
    expect(eslintConfig).toContain('eslint-plugin-astro')
    expect(eslintConfig).toContain('typescript-eslint')
    expect(eslintConfig).toContain('eslint-config-prettier')
    expect(eslintConfig).toContain('flat/recommended')
  })

  it('wires prettier with the Astro plugin', () => {
    const prettierConfig = JSON.parse(readRepoFile('.prettierrc'))
    expect(prettierConfig.plugins).toContain('prettier-plugin-astro')
    expect(prettierConfig.singleQuote).toBe(true)
  })

  it('ignores build output and dependency directories from formatting', () => {
    const prettierIgnore = readRepoFile('.prettierignore')
    expect(prettierIgnore).toContain('dist')
    expect(prettierIgnore).toContain('node_modules')
    expect(prettierIgnore).toContain('.astro')
    expect(prettierIgnore).toContain('contracts/design-authority')
    expect(prettierIgnore).toContain('tests/fixtures/contracts')
    expect(prettierIgnore).toContain('src/generated')
  })
})
