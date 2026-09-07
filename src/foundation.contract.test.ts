import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { npmCommand } from './test-harness/npm-command'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function readRepositoryFile(relativePath: string) {
  const absolutePath = path.join(repositoryRoot, relativePath)
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true)
  return readFileSync(absolutePath, 'utf8')
}

const toKebabCase = (value: string) =>
  value
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/([a-z])([0-9])/g, '$1-$2')

const rawSha256 = (file: string) =>
  crypto.createHash('sha256').update(readFileSync(file)).digest('hex')

describe('WP-10 foundation contracts', () => {
  it('pins the portable design-authority snapshot files', () => {
    for (const file of [
      'contracts/design-authority/tokens.json',
      'contracts/design-authority/components.json',
      'contracts/design-authority/templates.json',
      'contracts/design-authority/manifest.json',
      'scripts/validate-design-authority.mjs',
    ]) {
      expect(
        existsSync(path.join(repositoryRoot, file)),
        `${file} must exist`,
      ).toBe(true)
    }
  })

  it('validates the pinned snapshot without relying on the central checkout', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/validate-design-authority.mjs'],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          DESIGN_AUTHORITY_ROOT: path.join(repositoryRoot, 'not-present'),
        },
      },
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('standalone snapshot validated')
  })

  it('pins local raw bytes independently of canonical and central-source hashes', () => {
    const snapshotRoot = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
    )
    const manifest = JSON.parse(
      readRepositoryFile('contracts/design-authority/manifest.json'),
    )

    for (const entry of Object.values(manifest.files) as Array<{
      filename: string
      rawSha256: string
    }>) {
      expect(entry.rawSha256).toBe(
        rawSha256(path.join(snapshotRoot, entry.filename)),
      )
    }

    const mutatedSnapshotRoot = mkdtempSync(
      path.join(os.tmpdir(), 'tm-design-authority-'),
    )
    try {
      cpSync(snapshotRoot, mutatedSnapshotRoot, { recursive: true })
      appendFileSync(path.join(mutatedSnapshotRoot, 'tokens.json'), '\r\n')
      const result = spawnSync(
        process.execPath,
        ['scripts/validate-design-authority.mjs'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            DESIGN_AUTHORITY_ROOT: path.join(
              mutatedSnapshotRoot,
              'central-unavailable',
            ),
            DESIGN_AUTHORITY_SNAPSHOT_ROOT: mutatedSnapshotRoot,
          },
        },
      )

      expect(result.status).not.toBe(0)
      expect(`${result.stdout}${result.stderr}`).toContain(
        'local snapshot raw-byte hash drift for tokens.json',
      )
    } finally {
      rmSync(mutatedSnapshotRoot, { recursive: true, force: true })
    }
  })

  it('keeps browser test tooling in development dependencies and selects evidence tags exactly', () => {
    const packageManifest = JSON.parse(readRepositoryFile('package.json'))
    expect(packageManifest.devDependencies['@playwright/test']).toBeTruthy()
    expect(packageManifest.devDependencies['@axe-core/playwright']).toBeTruthy()
    expect(packageManifest.dependencies['lucide-astro']).toBeTruthy()
    expect(packageManifest.dependencies['@playwright/test']).toBeUndefined()
    expect(packageManifest.dependencies['@axe-core/playwright']).toBeUndefined()
    expect(packageManifest.scripts['test:foundation']).toBe(
      'playwright test --grep @foundation',
    )
    expect(packageManifest.scripts['test:visual']).toBe(
      'playwright test --grep @visual',
    )
    expect(packageManifest.scripts['test:a11y']).toBe(
      'playwright test --grep @a11y',
    )
  })

  it('points active PUBLIC dispatch at the V2 execution queue, not retired CA packets', () => {
    const taskList = readRepositoryFile('TASK-LIST.md')
    expect(taskList).toContain('execution-tasks.json')
    expect(taskList).toContain('EXECUTION.md')
    expect(taskList).toContain('retired CA IDs are not assignments')
  })

  it('projects every required authority token through one CSS token interface', () => {
    const tokens = readRepositoryFile('src/styles/tokens.css')
    const pinned = JSON.parse(
      readRepositoryFile('contracts/design-authority/tokens.json'),
    )
    const global = readRepositoryFile('src/styles/global.css')

    for (const [name, token] of Object.entries(pinned.primitive)) {
      expect(tokens).toContain(
        `--primitive-${toKebabCase(name)}: ${(token as { $value: string }).$value};`,
      )
    }
    for (const semantic of [pinned.semanticLight, pinned.semanticDark]) {
      for (const [name, value] of Object.entries(semantic)) {
        if (name !== 'status')
          expect(tokens).toContain(`--color-${toKebabCase(name)}: ${value};`)
      }
    }
    for (const [name, value] of Object.entries(pinned.spacing)) {
      expect(tokens).toContain(`--space-${name}: ${value};`)
    }
    for (const [name, value] of Object.entries(pinned.radius)) {
      expect(tokens).toContain(`--radius-${name}: ${value};`)
    }
    for (const [name, value] of Object.entries(pinned.type.sizes)) {
      expect(tokens).toContain(`--font-size-${toKebabCase(name)}: ${value};`)
    }
    for (const [name, value] of Object.entries(pinned.type.lineHeight)) {
      expect(tokens).toContain(
        `--font-line-height-${toKebabCase(name)}: ${value};`,
      )
    }
    expect(tokens).toContain(
      `--motion-scale-max: ${pinned.motion.default.scaleMax};`,
    )
    expect(tokens).toContain(
      `--motion-reduced-transform: ${pinned.motion.reduced.transform};`,
    )
    expect(tokens).toContain(
      `--motion-reduced-continuous-motion: ${pinned.motion.reduced.continuousMotion};`,
    )
    expect(tokens).toContain(
      `--motion-reduced-graph-mode: ${pinned.motion.reduced.graphMode};`,
    )
    for (const breakpoint of pinned.layout.breakpointChecks) {
      expect(tokens).toContain(
        `--layout-breakpoint-${breakpoint}: ${breakpoint}px;`,
      )
    }
    for (const [name, value] of Object.entries(pinned.layout.columns)) {
      expect(tokens).toContain(`--layout-columns-${name}: ${value};`)
    }
    for (const alias of [
      'button-background',
      'button-background-hover',
      'button-foreground',
      'card-background',
      'card-border',
      'control-border',
      'control-focus',
      'shell-canvas',
      'shell-ink',
    ]) {
      expect(tokens).toMatch(new RegExp(`--${alias}\\s*:`))
    }
    expect(global).not.toMatch(/--(?:color|font|spacing|radius)-[\w-]+\s*:\s*#/)
    expect(global).not.toContain('@layer base')
  })

  it('keeps the default production build free of Atlas output while retaining the gated build interface', () => {
    const astroConfig = readRepositoryFile('astro.config.mjs')
    const packageManifest = JSON.parse(readRepositoryFile('package.json'))
    expect(astroConfig).toContain('DESIGN_ATLAS')
    expect(packageManifest.scripts['build:atlas']).toBeTruthy()
    expect(
      existsSync(path.join(repositoryRoot, 'src', 'pages', '_design')),
    ).toBe(false)

    const designDir = path.join(repositoryRoot, 'dist', '_design')
    if (existsSync(designDir)) {
      rmSync(designDir, { recursive: true, force: true })
    }
    const distRoot = path.join(repositoryRoot, 'dist')
    if (existsSync(distRoot)) {
      rmSync(distRoot, { recursive: true, force: true })
    }

    const defaultBuild = spawnSync(npmCommand(), ['run', 'build'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: true,
    })
    expect(defaultBuild.status, defaultBuild.stderr).toBe(0)
    expect(existsSync(path.join(distRoot, '_design'))).toBe(false)
    const outputFiles = readdirSync(distRoot, { recursive: true })
      .map((entry) => path.join(distRoot, String(entry)))
      .filter((entry) => statSync(entry).isFile())
    expect(
      outputFiles.some((entry) => entry.includes(`${path.sep}_design`)),
    ).toBe(false)
    expect(
      outputFiles.some((entry) =>
        readFileSync(entry, 'utf8').includes('/_design'),
      ),
    ).toBe(false)

    const pagefindRoot = path.join(distRoot, 'pagefind')
    expect(existsSync(pagefindRoot)).toBe(true)
    for (const locale of ['en', 'fa']) {
      const bundleRoot = path.join(pagefindRoot, locale)
      expect(existsSync(bundleRoot)).toBe(true)
      expect(existsSync(path.join(bundleRoot, 'pagefind.js'))).toBe(true)
      expect(existsSync(path.join(bundleRoot, 'pagefind-entry.json'))).toBe(
        true,
      )
    }
  }, 120_000)

  it('loads fonts, token layers, base behavior, and utilities in deterministic order', () => {
    const global = readRepositoryFile('src/styles/global.css')
    const order = [
      "@import './fonts.css';",
      "@import './tokens.css';",
      "@import './base.css';",
      "@import './utilities.css';",
    ].map((entry) => global.indexOf(entry))

    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((left, right) => left - right))
  })
})

describe('CA-01 versioned V2 consumer overlay', () => {
  it('pins the versioned consumer overlay alongside the intact snapshot', () => {
    const overlayPath = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
      'v2-overlay.json',
    )
    expect(
      existsSync(overlayPath),
      'contracts/design-authority/v2-overlay.json must exist',
    ).toBe(true)
    const overlay = JSON.parse(
      readRepositoryFile('contracts/design-authority/v2-overlay.json'),
    )
    expect(overlay.version).toBe('2.1.0')
    expect(overlay.packet).toBe('CA-01')
    expect(overlay.home.hero).toBe('identity-and-research-graph')
    expect(overlay.home.portal).toBe(false)
    expect(overlay.home.standaloneGraphSection).toBe(false)
    expect(overlay.home.order).toEqual([
      'identity-lead-with-graph',
      'audience-paths',
      'selected-work',
      'research-axes',
      'recent-writing',
      'collaboration-cv-contact',
    ])
    expect(overlay.portalDecorationRoutes).toEqual(['/'])
    expect(overlay.referencePolicy.historicalSnapshots).toBe(
      'preserve-pinned-bytes',
    )
    expect(overlay.referencePolicy.overlayAdoption).toBe('CA-01')
    expect(overlay.productAuthority).toBe(
      'Docs/09-decisions/ADR-0010-UNIFIED-EXECUTION-CONTRACTS.md',
    )
    expect(overlay.centralOverlaySha256).toBe(
      '301806119c176110f8f6f43bfadf8778c073d81ccfd1364d94c7a5177da78345',
    )
    expect(overlay.pinnedSnapshot.components).toBe(24)
    expect(overlay.pinnedSnapshot.templates).toBe(6)
  })

  it('validates the versioned overlay through the design authority validator', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/validate-design-authority.mjs'],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          DESIGN_AUTHORITY_ROOT: path.join(repositoryRoot, 'not-present'),
        },
      },
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('V2 overlay 2.1.0 validated')
  })

  it('rejects contradictory V2 ordering in the overlay', () => {
    const snapshotRoot = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
    )
    const mutatedSnapshotRoot = mkdtempSync(
      path.join(os.tmpdir(), 'tm-ca01-order-'),
    )
    try {
      cpSync(snapshotRoot, mutatedSnapshotRoot, { recursive: true })
      const overlayPath = path.join(mutatedSnapshotRoot, 'v2-overlay.json')
      const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'))
      overlay.home.order = [
        'audience-paths',
        'identity-lead-with-graph',
        ...overlay.home.order.slice(2),
      ]
      writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`)
      const result = spawnSync(
        process.execPath,
        ['scripts/validate-design-authority.mjs'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            DESIGN_AUTHORITY_ROOT: path.join(
              mutatedSnapshotRoot,
              'central-unavailable',
            ),
            DESIGN_AUTHORITY_SNAPSHOT_ROOT: mutatedSnapshotRoot,
          },
        },
      )

      expect(result.status).not.toBe(0)
      expect(`${result.stdout}${result.stderr}`).toContain(
        'V2 overlay home order contradiction',
      )
    } finally {
      rmSync(mutatedSnapshotRoot, { recursive: true, force: true })
    }
  })

  it('rejects contradictory portal placement in the overlay', () => {
    const snapshotRoot = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
    )
    const mutatedSnapshotRoot = mkdtempSync(
      path.join(os.tmpdir(), 'tm-ca01-portal-'),
    )
    try {
      cpSync(snapshotRoot, mutatedSnapshotRoot, { recursive: true })
      const overlayPath = path.join(mutatedSnapshotRoot, 'v2-overlay.json')
      const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'))
      overlay.home.portal = true
      overlay.portalDecorationRoutes = ['/', '/fa/', '/en/']
      writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`)
      const result = spawnSync(
        process.execPath,
        ['scripts/validate-design-authority.mjs'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            DESIGN_AUTHORITY_ROOT: path.join(
              mutatedSnapshotRoot,
              'central-unavailable',
            ),
            DESIGN_AUTHORITY_SNAPSHOT_ROOT: mutatedSnapshotRoot,
          },
        },
      )

      expect(result.status).not.toBe(0)
      expect(`${result.stdout}${result.stderr}`).toContain(
        'V2 overlay portal placement contradiction',
      )
    } finally {
      rmSync(mutatedSnapshotRoot, { recursive: true, force: true })
    }
  })

  it('records the CA-01 delivery with no dependency change', () => {
    // A06: the no-dependency-change invariant belongs to the CA-01 delivery
    // evidence, not to the live tree. CA-04 legitimately adopted the bounded
    // Three.js scene dependency afterwards, so asserting its permanent
    // absence here would keep breaking every later packet. The overlay — the
    // CA-01 delivery artifact — records both facts explicitly.
    const overlay = JSON.parse(
      readRepositoryFile('contracts/design-authority/v2-overlay.json'),
    )
    expect(overlay.packet).toBe('CA-01')
    expect(overlay.runtimeChange.dependencies).toBe(false)
    expect(overlay.runtimeChange.css).toBe(false)
    expect(overlay.runtimeChange.routes).toBe(false)
    expect(overlay.runtimeChange.components).toBe(false)
    expect(overlay.allowedSceneDependencies.gsap).toMatch(/unchanged by CA-01/)
    expect(overlay.allowedSceneDependencies.three).toMatch(/bounded-allowed/)
    expect(overlay.allowedSceneDependencies.three).toMatch(/CA-04/)
    expect(overlay.allowedSceneDependencies.three).toMatch(
      /not installed by CA-01/,
    )
    const packageManifest = JSON.parse(readRepositoryFile('package.json'))
    expect(packageManifest.dependencies['gsap']).toBeTruthy()
    expect(
      existsSync(
        path.join(
          repositoryRoot,
          'docs',
          'quality',
          'concept-alignment-v2',
          'CA-01-HANDOFF.md',
        ),
      ),
      'CA-01 handoff delivery record must be preserved',
    ).toBe(true)
  })

  it('accepts the approved Three.js scene dependency in isolated fixtures', () => {
    const snapshotRoot = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
    )
    const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), 'tm-ca01-three-'))
    try {
      cpSync(snapshotRoot, fixtureRoot, { recursive: true })
      const fixturePackage = path.join(fixtureRoot, 'package.fixture.json')
      const packageManifest = JSON.parse(readRepositoryFile('package.json'))
      packageManifest.dependencies = {
        ...packageManifest.dependencies,
        three: '0.0.0-ca01-fixture-synthetic',
      }
      writeFileSync(
        fixturePackage,
        `${JSON.stringify(packageManifest, null, 2)}\n`,
      )
      const result = spawnSync(
        process.execPath,
        ['scripts/validate-design-authority.mjs'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            DESIGN_AUTHORITY_ROOT: path.join(
              fixtureRoot,
              'central-unavailable',
            ),
            DESIGN_AUTHORITY_SNAPSHOT_ROOT: fixtureRoot,
            DESIGN_AUTHORITY_PACKAGE_JSON: fixturePackage,
          },
        },
      )

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('V2 overlay 2.1.0 validated')
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('still rejects contradictory portal placement when Three.js is present', () => {
    const snapshotRoot = path.join(
      repositoryRoot,
      'contracts',
      'design-authority',
    )
    const fixtureRoot = mkdtempSync(
      path.join(os.tmpdir(), 'tm-ca01-three-portal-'),
    )
    try {
      cpSync(snapshotRoot, fixtureRoot, { recursive: true })
      const overlayPath = path.join(fixtureRoot, 'v2-overlay.json')
      const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'))
      overlay.home.portal = true
      overlay.portalDecorationRoutes = ['/', '/fa/', '/en/']
      writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`)
      const fixturePackage = path.join(fixtureRoot, 'package.fixture.json')
      const packageManifest = JSON.parse(readRepositoryFile('package.json'))
      packageManifest.dependencies = {
        ...packageManifest.dependencies,
        three: '0.0.0-ca01-fixture-synthetic',
      }
      writeFileSync(
        fixturePackage,
        `${JSON.stringify(packageManifest, null, 2)}\n`,
      )
      const result = spawnSync(
        process.execPath,
        ['scripts/validate-design-authority.mjs'],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            DESIGN_AUTHORITY_ROOT: path.join(
              fixtureRoot,
              'central-unavailable',
            ),
            DESIGN_AUTHORITY_SNAPSHOT_ROOT: fixtureRoot,
            DESIGN_AUTHORITY_PACKAGE_JSON: fixturePackage,
          },
        },
      )

      expect(result.status).not.toBe(0)
      expect(`${result.stdout}${result.stderr}`).toContain(
        'V2 overlay portal placement contradiction',
      )
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('keeps the CA-01 delivery evidence reproducible', () => {
    // A06: attributing the whole-checkout `git status` diff to CA-01 broke
    // every later packet sharing this checkout. CA-01 scope is its delivery
    // evidence only: the pinned snapshot manifest and the overlay must agree
    // with each other, so the historical no-change record stays checkable
    // without scanning unrelated work.
    const manifest = JSON.parse(
      readRepositoryFile('contracts/design-authority/manifest.json'),
    )
    for (const name of ['tokens.json', 'components.json', 'templates.json']) {
      expect(
        existsSync(
          path.join(repositoryRoot, 'contracts', 'design-authority', name),
        ),
        `${name} must exist`,
      ).toBe(true)
    }
    expect(manifest.version).toBe('1.0.0')
    const overlay = JSON.parse(
      readRepositoryFile('contracts/design-authority/v2-overlay.json'),
    )
    expect(overlay.packet).toBe('CA-01')
    expect(overlay.pinnedSnapshot.manifestVersion).toBe(manifest.version)
    expect(overlay.pinnedSnapshot.snapshotDate).toBe(manifest.snapshotDate)
    expect(overlay.pinnedSnapshot.components).toBe(
      manifest.inventories.components,
    )
    expect(overlay.pinnedSnapshot.templates).toBe(
      manifest.inventories.templates,
    )
    expect(overlay.referencePolicy.historicalSnapshots).toBe(
      'preserve-pinned-bytes',
    )
  })
})
