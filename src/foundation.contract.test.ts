import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
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

const rawSha256 = (file: string) => crypto.createHash('sha256').update(readFileSync(file)).digest('hex');

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

  it('pins local raw bytes independently of canonical and central-source hashes', () => {
    const snapshotRoot = path.join(repositoryRoot, 'contracts', 'design-authority');
    const manifest = JSON.parse(readRepositoryFile('contracts/design-authority/manifest.json'));

    for (const entry of Object.values(manifest.files) as Array<{ filename: string; rawSha256: string }>) {
      expect(entry.rawSha256).toBe(rawSha256(path.join(snapshotRoot, entry.filename)));
    }

    const mutatedSnapshotRoot = mkdtempSync(path.join(os.tmpdir(), 'tm-design-authority-'));
    try {
      cpSync(snapshotRoot, mutatedSnapshotRoot, { recursive: true });
      appendFileSync(path.join(mutatedSnapshotRoot, 'tokens.json'), '\r\n');
      const result = spawnSync(process.execPath, ['scripts/validate-design-authority.mjs'], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          DESIGN_AUTHORITY_ROOT: path.join(mutatedSnapshotRoot, 'central-unavailable'),
          DESIGN_AUTHORITY_SNAPSHOT_ROOT: mutatedSnapshotRoot,
        },
      });

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('local snapshot raw-byte hash drift for tokens.json');
    } finally {
      rmSync(mutatedSnapshotRoot, { recursive: true, force: true });
    }
  });

  it('keeps browser test tooling in development dependencies and selects evidence tags exactly', () => {
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));
    expect(packageManifest.devDependencies['@playwright/test']).toBeTruthy();
    expect(packageManifest.devDependencies['@axe-core/playwright']).toBeTruthy();
    expect(packageManifest.dependencies['lucide-astro']).toBeTruthy();
    expect(packageManifest.dependencies['@playwright/test']).toBeUndefined();
    expect(packageManifest.dependencies['@axe-core/playwright']).toBeUndefined();
    expect(packageManifest.scripts['test:foundation']).toBe('playwright test --grep @foundation');
    expect(packageManifest.scripts['test:visual']).toBe('playwright test --grep @visual');
    expect(packageManifest.scripts['test:a11y']).toBe('playwright test --grep @a11y');
  });

  it('freezes only the defined page-family range while allowing WP-25 and PUBLIC-260', () => {
    const taskList = readRepositoryFile('TASK-LIST.md');
    expect(taskList).toContain('`PUBLIC-200` through `PUBLIC-240`');
    expect(taskList).toContain('`WP-25` and `PUBLIC-260` remain allowed');
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

  it('keeps the default production build free of Atlas output while retaining the gated build interface', () => {
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
