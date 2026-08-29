import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepositoryFile(relativePath: string) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

const toKebabCase = (value: string) =>
  value
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/([a-z])([0-9])/g, '$1-$2');

describe('WP-10 foundation contracts', () => {
  it('pins the portable design-authority snapshot files', () => {
    for (const file of [
      'contracts/design-authority/tokens.json',
      'contracts/design-authority/components.json',
      'contracts/design-authority/templates.json',
      'contracts/design-authority/manifest.json',
      'scripts/validate-design-authority.mjs',
    ]) {
      expect(existsSync(path.join(repositoryRoot, file)), `${file} must exist`).toBe(true);
    }
  });

  it('validates the pinned snapshot without relying on the central checkout', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-design-authority.mjs'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, DESIGN_AUTHORITY_ROOT: path.join(repositoryRoot, 'not-present') },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('standalone snapshot validated');
  });

  it('projects every required authority token through one CSS token interface', () => {
    const tokens = readRepositoryFile('src/styles/tokens.css');
    const pinned = JSON.parse(readRepositoryFile('contracts/design-authority/tokens.json'));
    const global = readRepositoryFile('src/styles/global.css');

    for (const [name, token] of Object.entries(pinned.primitive)) {
      expect(tokens).toContain(`--primitive-${toKebabCase(name)}: ${(token as { $value: string }).$value};`);
    }
    for (const semantic of [pinned.semanticLight, pinned.semanticDark]) {
      for (const [name, value] of Object.entries(semantic)) {
        if (name !== 'status') expect(tokens).toContain(`--color-${toKebabCase(name)}: ${value};`);
      }
    }
    for (const [name, value] of Object.entries(pinned.spacing)) {
      expect(tokens).toContain(`--space-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(pinned.radius)) {
      expect(tokens).toContain(`--radius-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(pinned.type.sizes)) {
      expect(tokens).toContain(`--font-size-${toKebabCase(name)}: ${value};`);
    }
    for (const [name, value] of Object.entries(pinned.type.lineHeight)) {
      expect(tokens).toContain(`--font-line-height-${toKebabCase(name)}: ${value};`);
    }
    expect(tokens).toContain(`--motion-scale-max: ${pinned.motion.default.scaleMax};`);
    expect(tokens).toContain(`--motion-reduced-transform: ${pinned.motion.reduced.transform};`);
    expect(tokens).toContain(`--motion-reduced-continuous-motion: ${pinned.motion.reduced.continuousMotion};`);
    expect(tokens).toContain(`--motion-reduced-graph-mode: ${pinned.motion.reduced.graphMode};`);
    for (const breakpoint of pinned.layout.breakpointChecks) {
      expect(tokens).toContain(`--layout-breakpoint-${breakpoint}: ${breakpoint}px;`);
    }
    for (const [name, value] of Object.entries(pinned.layout.columns)) {
      expect(tokens).toContain(`--layout-columns-${name}: ${value};`);
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
      expect(tokens).toMatch(new RegExp(`--${alias}\\s*:`));
    }
    expect(global).not.toMatch(/--(?:color|font|spacing|radius)-[\w-]+\s*:\s*#/);
    expect(global).not.toContain('@layer base');
  });

  it('keeps the default production build free of Atlas output and accepts the gated build interface', () => {
    const astroConfig = readRepositoryFile('astro.config.mjs');
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));
    expect(astroConfig).toContain('DESIGN_ATLAS');
    expect(packageManifest.scripts['build:atlas']).toBeTruthy();
    expect(existsSync(path.join(repositoryRoot, 'src', 'pages', '_design'))).toBe(false);

    const defaultBuild = spawnSync('npm.cmd', ['run', 'build'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: true,
    });
    expect(defaultBuild.status, defaultBuild.stderr).toBe(0);
    const distRoot = path.join(repositoryRoot, 'dist');
    expect(existsSync(path.join(distRoot, '_design'))).toBe(false);
    const outputFiles = readdirSync(distRoot, { recursive: true })
      .map((entry) => path.join(distRoot, String(entry)))
      .filter((entry) => statSync(entry).isFile());
    expect(outputFiles.some((entry) => entry.includes(`${path.sep}_design`))).toBe(false);
    expect(outputFiles.some((entry) => readFileSync(entry, 'utf8').includes('/_design'))).toBe(false);

    const atlasBuild = spawnSync('npm.cmd', ['run', 'build:atlas'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: true,
    });
    expect(atlasBuild.status, atlasBuild.stderr).toBe(0);
    expect(existsSync(path.join(distRoot, '_design'))).toBe(false);
  }, 120_000);

  it('loads fonts, token layers, base behavior, and utilities in deterministic order', () => {
    const global = readRepositoryFile('src/styles/global.css');
    const order = [
      '@import "./fonts.css";',
      '@import "./tokens.css";',
      '@import "./base.css";',
      '@import "./utilities.css";',
    ].map((entry) => global.indexOf(entry));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });
});
