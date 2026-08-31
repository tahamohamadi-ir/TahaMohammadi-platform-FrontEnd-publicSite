import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import config from '../../playwright.config';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configSource = readFileSync(path.join(repositoryRoot, 'playwright.config.ts'), 'utf8');

describe('Playwright harness self-containment', () => {
  it('does not rely on a fixed port anywhere in the config', () => {
    expect(configSource).not.toMatch(/4321/);
    expect(config.use?.baseURL).toMatch(/127\.0\.0\.1:\d+/);
  });

  it('resolves the web server URL from the same dynamic base URL', () => {
    expect(config.webServer?.url).toBe(config.use?.baseURL);
    const commandPort = config.webServer?.command?.match(/--port (\d+)/)?.[1];
    const urlPort = config.use?.baseURL?.match(/:(\d+)$/)?.[1];
    expect(commandPort).toBeTruthy();
    expect(commandPort).toBe(urlPort);
  });

  it('boots its own dev server instead of reusing a foreign one', () => {
    expect(config.webServer?.command).toMatch(/dev/);
    expect(config.webServer?.reuseExistingServer).toBe(false);
  });

  it('allows a cold Astro start with an explicit webServer timeout', () => {
    expect(config.webServer?.timeout).toBeGreaterThanOrEqual(120_000);
  });
});
