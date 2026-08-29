import { existsSync, readFileSync } from 'node:fs';
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

  it('publishes the exact approved semantic token values through the CSS interface', () => {
    const tokens = readRepositoryFile('src/styles/tokens.css');

    expect(tokens).toContain('--color-canvas: #f7f8f5;');
    expect(tokens).toContain('--color-brand: #087c73;');
    expect(tokens).toContain('--color-canvas: #071225;');
    expect(tokens).toContain('--color-brand: #16b8a6;');
    expect(tokens).toContain('--space-11: 44px;');
    expect(tokens).toContain('--motion-reduced-duration: 0.01ms;');
  });

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
