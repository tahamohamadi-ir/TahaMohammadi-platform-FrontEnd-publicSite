import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { GROUP_A_DECORATIVE_ASSET_IDS } from './lib/media/authority-checksums';
import { GATEWAY_ATMOSPHERE_ASSETS, HOME_HERO_ATMOSPHERE_ASSETS } from './lib/media/project-mappings';
import { PROMOTED_ASSET_REGISTRY } from './lib/media/promoted-media-registry';
import { ATMOSPHERE_WIDTHS, PROMOTED_FORMATS } from './lib/media/transform-recipes';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicMediaRoot = path.join(repositoryRoot, 'public', 'media');
const runtimeMediaRoot = path.join(repositoryRoot, 'src', 'assets', 'media');

describe('PUBLIC-260 asset promotion group A (decorative atmosphere)', () => {
  it('registers gateway and hero atmosphere assets with decorative alt and atmosphere transforms', () => {
    expect(GATEWAY_ATMOSPHERE_ASSETS).toEqual({
      light: 'portal-centered-light',
      dark: 'portal-centered-dark',
    });
    expect(HOME_HERO_ATMOSPHERE_ASSETS).toEqual({
      light: 'portal-orbit-light',
      dark: 'portal-orbit-dark',
    });

    for (const id of GROUP_A_DECORATIVE_ASSET_IDS) {
      const record = PROMOTED_ASSET_REGISTRY[id];
      expect(record.semantics).toEqual({ kind: 'decorative', alt: '' });
      expect(record.transform.widths).toEqual(ATMOSPHERE_WIDTHS);
      expect(record.transform.formats).toEqual(PROMOTED_FORMATS);
      expect(existsSync(path.join(runtimeMediaRoot, record.assetFile))).toBe(true);
    }
  });

  it('removes legacy raw public atmosphere art after promotion to src/assets/media', () => {
    for (const id of GROUP_A_DECORATIVE_ASSET_IDS) {
      const legacyPath = path.join(publicMediaRoot, 'art', `${id}.png`);
      expect(existsSync(legacyPath), `legacy public file must be removed: ${legacyPath}`).toBe(false);
    }
  });

  it('documents ThemePicture single-theme loading for atmosphere slots', () => {
    const themePicture = readFileSync(
      path.join(repositoryRoot, 'src', 'components', 'media', 'ThemePicture.astro'),
      'utf8',
    );
    expect(themePicture).toContain('getPromotedMedia');
    expect(themePicture).toContain('data-theme-picture-template="light"');
    expect(themePicture).toContain('data-theme-picture-template="dark"');
    expect(themePicture).toContain('aria-hidden="true"');
  });
});
