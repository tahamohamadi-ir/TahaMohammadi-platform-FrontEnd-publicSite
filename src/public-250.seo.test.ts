import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LOCALE_INDEX_ROUTES, LOCALES } from './lib/seo-route-registry';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('PUBLIC-250 SEO gate', () => {
  it('declares sitemap integration, robots.txt, route registry, and validate:seo script', () => {
    const astroConfig = readFileSync(path.join(repositoryRoot, 'astro.config.mjs'), 'utf8');
    const packageManifest = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
    const scriptRegistry = readFileSync(
      path.join(repositoryRoot, 'scripts', 'seo-route-registry.mjs'),
      'utf8',
    );

    expect(astroConfig).toContain('@astrojs/sitemap');
    expect(astroConfig).toContain('defaultLocale: \'fa\'');
    expect(packageManifest.devDependencies['@astrojs/sitemap']).toBeTruthy();
    expect(packageManifest.scripts['validate:seo']).toBe('node scripts/validate-seo.mjs');
    expect(readFileSync(path.join(repositoryRoot, 'public', 'robots.txt'), 'utf8')).toContain(
      'Sitemap: /sitemap-index.xml',
    );
    expect(existsSync(path.join(repositoryRoot, 'scripts', 'validate-seo.mjs'))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, 'scripts', 'seo-url.mjs'))).toBe(true);

    for (const route of LOCALE_INDEX_ROUTES) {
      expect(scriptRegistry).toContain(`'${route}'`);
    }
    for (const locale of LOCALES) {
      expect(scriptRegistry).toContain(`'${locale}'`);
    }
  });
});
