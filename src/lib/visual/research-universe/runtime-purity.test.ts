/**
 * RU-4B — procedural runtime purity.
 *
 * The final direction is a PROCEDURAL graph: one shared sphere, presentation
 * profiles, real relationships. No Blender-authored domain object may be part of
 * that runtime, and the retired orbital implementation must not creep back in
 * through a stray import.
 *
 * This is a source scan rather than a runtime probe on purpose: a network request
 * that never fires in a happy path is exactly the failure you cannot observe
 * locally, and the previous generation's GLB loader was reachable from both scene
 * factories. Scanning the compiled-from sources makes the absence structural.
 *
 * Matching is on IMPORT STATEMENTS, not on prose: a comment that mentions
 * `GLTFLoader` (several of them explain this removal) must not fail the scan,
 * while `from '...GLTFLoader.js'` must.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Every module that can end up in the shipped runtime path for the Research
 * Universe. Test files are excluded: they may legitimately reference the retired
 * names while asserting their absence.
 */
function runtimeSources(): Array<{ name: string; source: string }> {
  return readdirSync(HERE)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({
      name,
      source: readFileSync(join(HERE, name), 'utf8'),
    }))
}

/** Import/require specifiers only, never comments or prose. */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

describe('procedural runtime — no authored asset, no orbital implementation', () => {
  it('never imports a glTF loader or any three.js example module', () => {
    for (const { name, source } of runtimeSources()) {
      for (const specifier of importSpecifiers(source)) {
        expect(specifier, `${name} imports ${specifier}`).not.toMatch(
          /GLTFLoader|three\/examples|DRACOLoader|KTX2Loader/,
        )
      }
    }
  })

  it('never names the retired GLB in runtime code', () => {
    for (const { name, source } of runtimeSources()) {
      // A path string is not an import specifier, so it needs its own check: the
      // retired loader was configured by a URL constant.
      expect(source, `${name} references the v3 GLB`).not.toMatch(
        /signature-v[0-9]+\.glb|research-universe\/models/,
      )
    }
  })

  it('never imports a camera-controls helper (Home is guided, About is custom)', () => {
    for (const { name, source } of runtimeSources()) {
      for (const specifier of importSpecifiers(source)) {
        expect(specifier, `${name} imports ${specifier}`).not.toMatch(
          /OrbitControls|TrackballControls|FlyControls/,
        )
      }
    }
  })

  it('never imports the deleted orbital module', () => {
    for (const { name, source } of runtimeSources()) {
      for (const specifier of importSpecifiers(source)) {
        expect(specifier, `${name} imports ${specifier}`).not.toMatch(
          /(^|\/)orbits$/,
        )
      }
    }
  })

  it('still contains the modules the direction is made of', () => {
    // Guards against the scan silently passing because the directory moved.
    const names = runtimeSources().map((entry) => entry.name)
    for (const required of [
      'spheres.ts',
      'presentation-profiles.ts',
      'layout.ts',
      'nodes.ts',
      'edges.ts',
      'materials.ts',
      'home-scene.ts',
      'about-scene.ts',
    ]) {
      expect(names).toContain(required)
    }
    expect(names).not.toContain('orbits.ts')
    expect(names).not.toContain('authored-assets.ts')
  })
})
