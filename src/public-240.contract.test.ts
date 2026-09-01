import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

describe('PUBLIC-240 pagefind build contract', () => {
  it('wires the pagefind integration and dependency', () => {
    const astroConfig = readFileSync(
      path.join(repositoryRoot, 'astro.config.mjs'),
      'utf8',
    )
    const packageManifest = JSON.parse(
      readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    )

    expect(astroConfig).toContain('pagefindIntegration')
    expect(packageManifest.devDependencies.pagefind).toBeTruthy()
    expect(
      existsSync(
        path.join(repositoryRoot, 'src', 'integrations', 'pagefind.mjs'),
      ),
    ).toBe(true)
    expect(
      existsSync(
        path.join(
          repositoryRoot,
          'src',
          'pages',
          'en',
          'search',
          'index.astro',
        ),
      ),
    ).toBe(true)
    expect(
      existsSync(
        path.join(
          repositoryRoot,
          'src',
          'pages',
          'fa',
          'search',
          'index.astro',
        ),
      ),
    ).toBe(true)
  })
})
