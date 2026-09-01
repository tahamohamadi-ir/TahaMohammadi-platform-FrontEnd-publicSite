import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import PromotedPicture from './PromotedPicture.astro';
import ThemePicture from './ThemePicture.astro';
import { ATMOSPHERE_WIDTHS, GRAPH_BACKPLATE_WIDTHS, PREVIEW_WIDTHS } from '../../lib/media/transform-recipes';
import { HOME_GRAPH_BACKPLATE_ASSETS } from '../../lib/media/project-mappings';
import { getPromotedAssetRecord } from '../../lib/media/promoted-media-registry';
import { resolvePromotedMediaAlt } from '../../lib/media/promoted-media';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function renderComponent(
  component: Parameters<Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']>[0],
  props: Record<string, unknown>,
) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

function parsePictureMarkup(html: string) {
  const pictureMatch = html.match(/<picture[^>]*>[\s\S]*?<\/picture>/);
  expect(pictureMatch, 'expected a <picture> element').toBeTruthy();
  const pictureHtml = pictureMatch![0];
  const sources = [...pictureHtml.matchAll(/<source\b[^>]*>/g)].map((match) => match[0]);
  const imgMatch = pictureHtml.match(/<img\b[^>]*>/);
  expect(imgMatch, 'expected an <img> inside <picture>').toBeTruthy();
  return { pictureHtml, sources, img: imgMatch![0] };
}

function expectResponsivePicture(
  html: string,
  widths: readonly number[],
  formats: readonly string[] = ['avif', 'webp'],
) {
  const { pictureHtml, sources, img } = parsePictureMarkup(html);

  expect(sources).toHaveLength(formats.length);
  for (const format of formats) {
    const source = sources.find((markup) => markup.includes(`type="image/${format}"`));
    expect(source, `missing <source type="image/${format}">`).toBeTruthy();
    expect(source).toMatch(new RegExp(`f=${format}`));
    for (const width of widths) {
      expect(source).toMatch(new RegExp(`\\b${width}w\\b`));
    }
  }

  expect(img).toMatch(/\bsrc="\/_image\?/);
  expect(img).toMatch(/\bsrcset="/);
  expect(img).toMatch(/f=png/);
  for (const width of widths) {
    expect(img).toMatch(new RegExp(`\\b${width}w\\b`));
  }
  expect(img).not.toMatch(/\bsrc="\/src\/assets\//);
  expect(img).not.toMatch(/\bsrc="\/@fs\//);

  return { pictureHtml, sources, img };
}

describe('WP-30A media components', () => {
  it('renders PromotedPicture with AVIF/WebP sources, fallback img srcset, and registered widths', async () => {
    const html = await renderComponent(PromotedPicture, {
      assetId: 'project-data-architecture',
      mediaSlot: 'home.project.preview',
      locale: 'en',
      alt: 'PARS-SQL evidence dashboard preview',
      imgClass: 'project-card__image',
      class: 'project-card__picture',
    });

    const record = getPromotedAssetRecord('project-data-architecture', 'home.project.preview');
    const { img } = expectResponsivePicture(html, record.transform.widths);

    expect(img).toMatch(/alt="PARS-SQL evidence dashboard preview"/);
    expect(img).toMatch(/class="[^"]*project-card__image/);
    expect(html).toMatch(/class="[^"]*project-card__picture/);
    expect(html).toMatch(/sizes="/);
    expect(html).not.toContain('imgAttributes');
  });

  it('renders ThemePicture with responsive picture markup for the initial light variant', async () => {
    const html = await renderComponent(ThemePicture, {
      lightAssetId: 'portal-orbit-light',
      darkAssetId: 'portal-orbit-dark',
      mediaSlot: 'home.hero.atmosphere',
      imgClass: 'home-hero__atmosphere-img',
    });

    const record = getPromotedAssetRecord('portal-orbit-light', 'home.hero.atmosphere');
    expectResponsivePicture(html, record.transform.widths);

    expect(html).toMatch(/data-theme-picture-template="light"/);
    expect(html).toMatch(/data-theme-picture-template="dark"/);
    expect(html).toMatch(/data-theme-picture-mount/);
    expect(html).toMatch(/<noscript>[\s\S]*<picture/);
    expect(html).toMatch(/addEventListener\('tm-themechange'/);
    expect(html).not.toMatch(/data-light-src=/);
    expect(html).not.toMatch(/data-dark-src=/);
  });

  it('lets atmospheric consumers request a container-filling theme picture', async () => {
    const html = await renderComponent(ThemePicture, {
      lightAssetId: 'portal-orbit-light',
      darkAssetId: 'portal-orbit-dark',
      mediaSlot: 'home.hero.atmosphere',
      fill: true,
    });

    expect(html).toMatch(/class="[^"]*theme-picture--fill/);
  });

  it('keeps only one active theme mount target on initial load', async () => {
    const html = await renderComponent(ThemePicture, {
      lightAssetId: 'portal-centered-light',
      darkAssetId: 'portal-centered-dark',
      mediaSlot: 'gateway.atmosphere',
    });

    const mountMatch = html.match(/<div data-theme-picture-mount[^>]*>[\s\S]*?<\/div>/);
    expect(mountMatch?.[0] ?? '').not.toMatch(/<picture/);

    const templatePictures = [...html.matchAll(/data-theme-picture-template="(light|dark)"[\s\S]*?<\/template>/g)];
    expect(templatePictures).toHaveLength(2);
    for (const match of templatePictures) {
      expect(match[0].match(/<picture/g)?.length).toBe(1);
    }

    const noscriptBlock = html.match(/<noscript>[\s\S]*?<\/noscript>/)?.[0] ?? '';
    expect(noscriptBlock.match(/<picture/g)?.length).toBe(1);

    const lightTemplates = html.match(/data-theme-picture-template="light"[\s\S]*?<\/template>/);
    const darkTemplates = html.match(/data-theme-picture-template="dark"[\s\S]*?<\/template>/);
    expect(lightTemplates).toBeTruthy();
    expect(darkTemplates).toBeTruthy();

    const source = readFileSync(path.join(repositoryRoot, 'src/components/media/ThemePicture.astro'), 'utf8');
    expect(source).toMatch(/mountVariant\(root, resolveTheme\(\)\)/);
    expect(source).toMatch(/replaceChildren\(template\.content\.cloneNode\(true\)\)/);
    expect(source).not.toMatch(/<img[^>]+src=\{lightSrc\}/);
  });

  it('rejects content project previews without consumer-supplied localized alt', () => {
    expect(() =>
      resolvePromotedMediaAlt('project-data-architecture', 'home.project.preview', 'en'),
    ).toThrow(/requires consumer-supplied localized alt/);

    expect(() =>
      resolvePromotedMediaAlt('project-data-architecture', 'home.project.preview', 'fa', '   '),
    ).toThrow(/requires consumer-supplied localized alt/);

    expect(
      resolvePromotedMediaAlt(
        'project-data-architecture',
        'home.project.preview',
        'fa',
        'نمای پیش‌نمایش پروژه',
      ),
    ).toBe('نمای پیش‌نمایش پروژه');
  });

  it('renders graph backplate ThemePicture with graph width sets and decorative semantics', async () => {
    const html = await renderComponent(ThemePicture, {
      lightAssetId: HOME_GRAPH_BACKPLATE_ASSETS.light,
      darkAssetId: HOME_GRAPH_BACKPLATE_ASSETS.dark,
      mediaSlot: 'home.graph.backplate',
      imgClass: 'home-graph__backplate-img',
    });

    const record = getPromotedAssetRecord('home-graph-backplate-light', 'home.graph.backplate');
    const { img } = expectResponsivePicture(html, record.transform.widths);
    expect(record.transform.widths).toEqual(GRAPH_BACKPLATE_WIDTHS);
    expect(img).toMatch(/\balt(?:="")?(?:\s|>)/);
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).not.toMatch(/decorative=\{false\}/);
  });

  it('rejects reversed or mismatched ThemePicture light and dark asset ids', async () => {
    await expect(
      renderComponent(ThemePicture, {
        lightAssetId: HOME_GRAPH_BACKPLATE_ASSETS.dark,
        darkAssetId: HOME_GRAPH_BACKPLATE_ASSETS.light,
        mediaSlot: 'home.graph.backplate',
      }),
    ).rejects.toThrow(/lightAssetId home-graph-backplate-dark is registered for theme dark, not light/);

    await expect(
      renderComponent(ThemePicture, {
        lightAssetId: 'portal-orbit-dark',
        darkAssetId: 'portal-orbit-light',
        mediaSlot: 'home.hero.atmosphere',
      }),
    ).rejects.toThrow(/lightAssetId portal-orbit-dark is registered for theme dark, not light/);
  });

  it('renders PromotedPicture graph backplate with registered graph widths', async () => {
    const html = await renderComponent(PromotedPicture, {
      assetId: HOME_GRAPH_BACKPLATE_ASSETS.light,
      mediaSlot: 'home.graph.backplate',
    });

    const { img } = expectResponsivePicture(html, GRAPH_BACKPLATE_WIDTHS);
    expect(img).toMatch(/\balt(?:="")?(?:\s|>)/);
  });

  it('enforces slot placement and rejects owner-deferred asset ids at render boundaries', async () => {
    await expect(
      renderComponent(PromotedPicture, {
        assetId: 'portal-orbit-light',
        mediaSlot: 'gateway.atmosphere',
        alt: 'Decorative atmosphere',
      }),
    ).rejects.toThrow(/registered for home\.hero\.atmosphere/);

    await expect(
      renderComponent(PromotedPicture, {
        assetId: 'project-visual-communication-network',
        mediaSlot: 'home.project.preview',
        alt: 'Deferred project preview',
      }),
    ).rejects.toThrow(/Deferred asset/);
  });

  it('pins atmosphere and preview width sets in rendered srcsets', async () => {
    const atmosphereHtml = await renderComponent(ThemePicture, {
      lightAssetId: 'portal-centered-light',
      darkAssetId: 'portal-centered-dark',
      mediaSlot: 'gateway.atmosphere',
    });
    expectResponsivePicture(atmosphereHtml, ATMOSPHERE_WIDTHS);

    const previewHtml = await renderComponent(PromotedPicture, {
      assetId: 'blog-coral-stairs',
      mediaSlot: 'home.rail.preview',
    });
    const { img: previewImg } = expectResponsivePicture(previewHtml, PREVIEW_WIDTHS);
    expect(previewImg).toMatch(/\balt(?:="")?(?:\s|>)/);
  });
});
