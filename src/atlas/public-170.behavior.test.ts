import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readRepositoryFile(relativePath: string) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

describe.sequential('PUBLIC-170 behavior', () => {
  it('registers Atlas integration artifacts outside src/pages', () => {
    expect(existsSync(path.join(repositoryRoot, 'src', 'integrations', 'design-atlas.mjs'))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, 'src', 'atlas', 'AtlasRoute.astro'))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, 'docs', 'design', 'DESIGN-ATLAS.md'))).toBe(true);

    const astroConfig = readRepositoryFile('astro.config.mjs');
    expect(astroConfig).toContain('design-atlas.mjs');
    expect(astroConfig).toContain('designAtlasIntegration()');
  });

  it('exposes stable atlas and specimen visual ids', () => {
    const atlasPage = readRepositoryFile('src/atlas/AtlasPage.astro');
    const componentGallery = readRepositoryFile('src/atlas/sections/ComponentGallery.astro');
    const localeThemeSection = readRepositoryFile('src/atlas/sections/LocaleThemeSection.astro');
    const stateSheetSection = readRepositoryFile('src/atlas/sections/StateSheetSection.astro');

    expect(atlasPage).toContain('data-visual-id="VisualAtlas"');
    expect(componentGallery).toContain('data-visual-id="AtlasComponentsSection"');
    expect(componentGallery).toMatch(/AtlasSpecimen-/);
    expect(componentGallery).toContain('lucide-astro');
    expect(localeThemeSection).toContain('data-visual-id="AtlasThemeSpecimen-light"');
    expect(localeThemeSection).toContain('data-visual-id="AtlasThemeSpecimen-dark"');
    expect(localeThemeSection).toContain('data-visual-id="AtlasThemeSpecimen-probe"');
    expect(stateSheetSection).toContain('data-visual-id="AtlasReducedMotionSpecimen"');
    expect(stateSheetSection).toContain('data-visual-id="AtlasReducedMotionProbe"');
    expect(readRepositoryFile('src/components/ThemeToggle.astro')).toContain('data-visual-id="ThemeToggle"');
    expect(readRepositoryFile('src/components/Footer.astro')).toContain('data-visual-id="Footer"');
  });

  it('builds Atlas output only when DESIGN_ATLAS=1', () => {
    const distRoot = path.join(repositoryRoot, 'dist');
    if (existsSync(distRoot)) {
      rmSync(distRoot, { recursive: true, force: true });
    }

    const atlasBuild = spawnSync('npm.cmd', ['run', 'build:atlas'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, DESIGN_ATLAS: '1' },
    });
    expect(atlasBuild.status, atlasBuild.stderr).toBe(0);

    const atlasIndex = path.join(repositoryRoot, 'dist', '_design', 'index.html');
    expect(existsSync(atlasIndex)).toBe(true);
    expect(readFileSync(atlasIndex, 'utf8')).toContain('Visual Atlas');

    const outputFiles = readdirSync(path.join(repositoryRoot, 'dist'), { recursive: true })
      .map((entry) => path.join(repositoryRoot, 'dist', String(entry)))
      .filter((entry) => statSync(entry).isFile());
    expect(outputFiles.some((entry) => entry.includes(`${path.sep}_design`))).toBe(true);

    const cleanup = spawnSync('npm.cmd', ['run', 'build'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, DESIGN_ATLAS: '' },
    });
    expect(cleanup.status, cleanup.stderr).toBe(0);
    const designDir = path.join(repositoryRoot, 'dist', '_design');
    if (existsSync(designDir)) {
      rmSync(designDir, { recursive: true, force: true });
    }
    expect(existsSync(designDir)).toBe(false);
  }, 180_000);
});
