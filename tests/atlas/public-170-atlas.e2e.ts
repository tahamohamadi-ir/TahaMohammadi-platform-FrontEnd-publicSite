import type { Server } from 'node:http';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { startDistStaticServer, stopDistStaticServer } from './static-server';

declare global {
  interface Window {
    __tmApplyTheme: (mode: 'system' | 'light' | 'dark') => void;
  }
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(
  readFileSync(path.join(repositoryRoot, 'contracts', 'design-authority', 'tokens.json'), 'utf8'),
) as { semanticLight: Record<string, string>; semanticDark: Record<string, string> };

function normalizeColor(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.describe('PUBLIC-170 visual atlas', () => {
  let atlasBaseUrl = '';
  let atlasServer: Server;

  test.beforeAll(async () => {
    const distRoot = path.join(repositoryRoot, 'dist');
    // The default Playwright harness rebuilds a production dist without the
    // atlas route, so the atlas suite rebuilds its fixture whenever the
    // DESIGN_ATLAS=1 output is absent instead of failing on a stale dist.
    if (!existsSync(path.join(distRoot, '_design', 'index.html'))) {
      execSync('npm.cmd run build:atlas --silent', { cwd: repositoryRoot, stdio: 'inherit' });
    }
    const started = await startDistStaticServer(distRoot);
    atlasBaseUrl = started.baseUrl;
    atlasServer = started.server;
  });

  test.afterAll(async () => {
    await stopDistStaticServer(atlasServer);
  });

  test('serves the atlas route when DESIGN_ATLAS=1 @atlas', async ({ page }) => {
    await page.goto(`${atlasBaseUrl}/_design`);
    await expect(page.locator('[data-visual-id="VisualAtlas"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Visual Atlas' })).toBeVisible();
  });

  test('resolves distinct light and dark token values on the live theme probe @atlas', async ({ page }) => {
    await page.goto(`${atlasBaseUrl}/_design`);
    const probe = page.locator('[data-visual-id="AtlasThemeSpecimen-probe"]');
    await expect(probe).toBeVisible();

    const toKebabCase = (value: string) =>
      value
        .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
        .replace(/([a-z])([0-9])/g, '$1-$2');

    for (const [theme, semanticRoles] of [
      ['light', tokens.semanticLight],
      ['dark', tokens.semanticDark],
    ] as const) {
      await page.evaluate((requestedTheme) => window.__tmApplyTheme(requestedTheme), theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      for (const [role, expectedValue] of Object.entries(semanticRoles)) {
        if (role === 'status') continue;
        const property = `--color-${toKebabCase(role)}`;
        await expect
          .poll(async () => {
            const actual = await page.evaluate(
              ({ propertyName }) =>
                getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim(),
              { propertyName: property },
            );
            return normalizeColor(actual);
          })
          .toBe(normalizeColor(expectedValue));
      }

      await expect
        .poll(() => probe.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('applies the reduced-motion contract to the motion probe @atlas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${atlasBaseUrl}/_design`);

    const probe = page.locator('[data-visual-id="AtlasReducedMotionProbe"]');
    await expect(probe).toBeVisible();
    expect(
      await probe.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
    ).toBeLessThanOrEqual(0.00001);
  });

  test('renders stable theme and motion specimen visual ids @atlas', async ({ page }) => {
    await page.goto(`${atlasBaseUrl}/_design`);

    await expect(page.locator('[data-visual-id="AtlasThemeSpecimen-light"]')).toBeVisible();
    await expect(page.locator('[data-visual-id="AtlasThemeSpecimen-dark"]')).toBeVisible();
    await expect(page.locator('[data-visual-id="AtlasThemeSpecimen-live"]')).toBeVisible();
    await expect(page.locator('[data-visual-id="AtlasReducedMotionSpecimen"]')).toBeVisible();
    await expect(page.locator('[data-visual-id="AtlasSpecimen-IconButton"] svg.lucide-menu')).toHaveCount(2);
  });
});
