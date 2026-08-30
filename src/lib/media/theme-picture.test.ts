import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('WP-30 ThemePicture single-theme loading', () => {
  it('mounts one img element and swaps src on tm-themechange', () => {
    const source = readFileSync(
      path.join(repositoryRoot, 'src/components/media/ThemePicture.astro'),
      'utf8',
    );

    expect(source).toContain('data-theme-picture');
    expect(source).toContain('data-theme-picture-target');
    expect(source).toContain('data-light-src');
    expect(source).toContain('data-dark-src');
    expect(source).not.toContain('home-hero__atmosphere-img--dark');
    expect(source).not.toContain('home-hero__atmosphere-img--light');
    expect(source).toContain("addEventListener('tm-themechange'");
    expect(source).toMatch(/querySelector\('\[data-theme-picture-target\]'\)/);
    expect(source).not.toMatch(/<img[\s\S]*<img/);
  });

  it('exposes PromotedPicture responsive formats through Astro Picture', () => {
    const source = readFileSync(
      path.join(repositoryRoot, 'src/components/media/PromotedPicture.astro'),
      'utf8',
    );

    expect(source).toContain("import { Picture } from 'astro:assets'");
    expect(source).toContain('formats={[...media.transform.formats]}');
    expect(source).toContain('widths={[...media.transform.widths]}');
    expect(source).toContain('sizes={media.transform.sizes}');
  });
});
