import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  STAGING_API_PROBES,
  STAGING_ENV_KEYS,
  STAGING_SITE_ROUTES,
  acceptsStatus,
  buildStagingApiUrl,
  isSameOriginStaging,
  resolveStagingSmokeConfig,
} from './test-harness/staging-smoke';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checklistPath = path.join(repositoryRoot, 'docs', 'quality', 'PUBLIC-320-STAGING-SMOKE.md');
const harnessPath = path.join(repositoryRoot, 'src', 'test-harness', 'staging-smoke.ts');
const e2ePath = path.join(repositoryRoot, 'tests', 'e2e', 'public-320-staging-smoke.e2e.ts');
const stagingConfigPath = path.join(repositoryRoot, 'playwright.staging.config.ts');
const envExamplePath = path.join(repositoryRoot, '.env.example');
const packageJsonPath = path.join(repositoryRoot, 'package.json');

describe('PUBLIC-320 integrated staging smoke scaffold', () => {
  it('skips live probes when PUBLIC_STAGING_SITE_URL is unset', () => {
    const config = resolveStagingSmokeConfig({});
    expect(config.ready).toBe(false);
    expect(config.skipReason).toContain(STAGING_ENV_KEYS.siteUrl);
    expect(config.skipReason).toContain('BACKEND-180');
  });

  it('resolves same-origin API base when PUBLIC_STAGING_API_BASE_URL is empty', () => {
    const config = resolveStagingSmokeConfig({
      [STAGING_ENV_KEYS.siteUrl]: 'https://staging.example.com/',
      [STAGING_ENV_KEYS.apiBaseUrl]: '',
    });
    expect(config.ready).toBe(true);
    if (!config.ready) {
      throw new Error('expected ready staging config');
    }
    expect(config.siteUrl).toBe('https://staging.example.com');
    expect(config.apiBaseUrl).toBe('https://staging.example.com');
    expect(isSameOriginStaging(config)).toBe(true);
    expect(buildStagingApiUrl(config, '/health/')).toBe(
      'https://staging.example.com/health/',
    );
  });

  it('allows explicit API origin override for split-host diagnostics only', () => {
    const config = resolveStagingSmokeConfig({
      [STAGING_ENV_KEYS.siteUrl]: 'https://staging.example.com',
      [STAGING_ENV_KEYS.apiBaseUrl]: 'https://api.staging.example.com',
    });
    expect(config.ready).toBe(true);
    if (!config.ready) {
      throw new Error('expected ready staging config');
    }
    expect(isSameOriginStaging(config)).toBe(false);
    expect(buildStagingApiUrl(config, '/api/site')).toBe(
      'https://api.staging.example.com/api/site',
    );
  });

  it('defines accepted API and site probes without inventing response bodies', () => {
    expect(STAGING_API_PROBES.length).toBeGreaterThanOrEqual(4);
    expect(STAGING_API_PROBES.map((probe) => probe.path)).toContain('/health/');
    expect(STAGING_API_PROBES.map((probe) => probe.path)).toContain('/api/site');
    expect(STAGING_SITE_ROUTES.map((route) => route.path)).toContain('/en/');
    expect(STAGING_SITE_ROUTES.map((route) => route.path)).toContain('/fa/');
    expect(acceptsStatus(200, 200)).toBe(true);
    expect(acceptsStatus(404, [200, 404])).toBe(true);
  });

  it('ships checklist, harness, Playwright @smoke wiring, and test:smoke script', () => {
    expect(existsSync(harnessPath)).toBe(true);
    expect(existsSync(checklistPath)).toBe(true);
    expect(existsSync(e2ePath)).toBe(true);
    expect(existsSync(stagingConfigPath)).toBe(true);
    expect(existsSync(envExamplePath)).toBe(true);

    const checklist = readFileSync(checklistPath, 'utf8');
    const e2eSource = readFileSync(e2ePath, 'utf8');
    const envExample = readFileSync(envExamplePath, 'utf8');
    const packageJson = readFileSync(packageJsonPath, 'utf8');

    expect(checklist).toContain('PUBLIC-320');
    expect(checklist).toContain(STAGING_ENV_KEYS.siteUrl);
    expect(checklist).toContain('BACKEND-180');
    expect(checklist).toContain('does **not** close `PUBLIC-190`');

    expect(e2eSource).toContain('@smoke');
    expect(e2eSource).toContain('@staging');
    expect(e2eSource).toContain('PUBLIC-320');
    expect(e2eSource).toContain('resolveStagingSmokeConfig');

    expect(envExample).toContain(STAGING_ENV_KEYS.siteUrl);
    expect(packageJson).toContain('"test:smoke"');
    expect(packageJson).toContain('@smoke');
  });
});
