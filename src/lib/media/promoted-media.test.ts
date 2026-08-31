import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  AUTHORITY_CHECKSUMS,
  DEFERRED_ASSET_IDS,
  RUNTIME_ASSET_IDS,
} from './authority-checksums';
import { DERIVATIVE_MANIFEST, DEFERRED_DERIVATIVE_ENTRIES } from './derivative-manifest';
import {
  GATEWAY_ATMOSPHERE_ASSETS,
  HOME_GRAPH_BACKPLATE_ASSETS,
  HOME_HERO_ATMOSPHERE_ASSETS,
  HOME_PROJECT_ASSET_BY_SLUG,
  HOME_RAIL_ASSET_BY_PATH,
} from './project-mappings';
import { getPromotedAssetRecord, PROMOTED_ASSET_REGISTRY, altForLocale } from './promoted-media-registry';
import { resolvePromotedMediaAlt } from './promoted-media';
import { ATMOSPHERE_WIDTHS, GRAPH_BACKPLATE_WIDTHS, PREVIEW_WIDTHS, PROMOTED_FORMATS } from './transform-recipes';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const mediaRoot = path.join(repositoryRoot, 'src/assets/media');

function sha256File(relativePath: string) {
  return crypto.createHash('sha256').update(readFileSync(path.join(mediaRoot, relativePath))).digest('hex');
}

describe('WP-30 promoted media registry', () => {
  it('registers every approved runtime asset id with exact authority checksums', () => {
    expect(Object.keys(PROMOTED_ASSET_REGISTRY).sort()).toEqual([...RUNTIME_ASSET_IDS].sort());

    for (const id of RUNTIME_ASSET_IDS) {
      const record = PROMOTED_ASSET_REGISTRY[id];
      expect(record.sourceSha256).toBe(AUTHORITY_CHECKSUMS[id]);
      expect(sha256File(record.assetFile)).toBe(AUTHORITY_CHECKSUMS[id]);
    }
  });

  it('rejects deferred asset ids at the registry boundary', () => {
    for (const id of DEFERRED_ASSET_IDS) {
      expect(PROMOTED_ASSET_REGISTRY).not.toHaveProperty(id);
    }
  });

  it('enforces slot placement when resolving records', () => {
    expect(() => getPromotedAssetRecord('portal-orbit-light', 'gateway.atmosphere')).toThrow(
      /registered for home\.hero\.atmosphere/,
    );
    expect(getPromotedAssetRecord('portal-centered-light', 'gateway.atmosphere').id).toBe(
      'portal-centered-light',
    );
  });

  it('uses decorative alt="" for atmosphere, rails, graph backplates, and brand favicon', () => {
    for (const id of [
      'portal-centered-light',
      'portal-orbit-dark',
      'blog-coral-stairs',
      'learning-sage-library',
      'gallery-ivory-forms',
      'home-graph-backplate-light',
      'home-graph-backplate-dark',
      'brand-favicon',
    ] as const) {
      expect(PROMOTED_ASSET_REGISTRY[id].semantics).toEqual({ kind: 'decorative', alt: '' });
    }
  });

  it('uses localized content alt for brand mark', () => {
    const brand = PROMOTED_ASSET_REGISTRY['brand-primary'];
    expect(brand.semantics.kind).toBe('content');
    if (brand.semantics.kind === 'content') {
      expect(altForLocale(brand, 'en')).toBe('Taha Mohammadi');
      expect(altForLocale(brand, 'fa')).toBe('طه محمدی');
    }
  });

  it('requires consumer-supplied localized alt for project previews', () => {
    const project = PROMOTED_ASSET_REGISTRY['project-data-architecture'];
    expect(project.semantics).toEqual({ kind: 'consumer-content' });
    expect(() => altForLocale(project, 'en')).toThrow(/consumer-supplied localized alt/);
    expect(() =>
      resolvePromotedMediaAlt('project-data-architecture', 'home.project.preview', 'en'),
    ).toThrow(/requires consumer-supplied localized alt/);
    expect(
      resolvePromotedMediaAlt(
        'project-data-architecture',
        'home.project.preview',
        'en',
        'Organizational dashboard preview',
      ),
    ).toBe('Organizational dashboard preview');
  });

  it('pins correct intrinsic dimensions for atmosphere and preview groups', () => {
    for (const id of ['portal-centered-dark', 'portal-orbit-light'] as const) {
      expect(PROMOTED_ASSET_REGISTRY[id].intrinsic).toEqual({ width: 1672, height: 941 });
    }
    for (const id of ['project-dashboard-systems', 'blog-coral-stairs'] as const) {
      expect(PROMOTED_ASSET_REGISTRY[id].intrinsic).toEqual({ width: 1536, height: 1024 });
    }
    expect(PROMOTED_ASSET_REGISTRY['brand-primary'].intrinsic).toEqual({ width: 256, height: 233 });
    expect(PROMOTED_ASSET_REGISTRY['brand-favicon'].intrinsic).toEqual({ width: 64, height: 64 });
    expect(PROMOTED_ASSET_REGISTRY['home-graph-backplate-light'].intrinsic).toEqual({
      width: 1254,
      height: 1254,
    });
    expect(PROMOTED_ASSET_REGISTRY['home-graph-backplate-dark'].intrinsic).toEqual({
      width: 1254,
      height: 1254,
    });
  });

  it('records WP-25 Master Chat acceptance date on graph backplate approvals', () => {
    for (const id of ['home-graph-backplate-light', 'home-graph-backplate-dark'] as const) {
      expect(PROMOTED_ASSET_REGISTRY[id].approval).toMatchObject({
        decision: 'wp25-master-chat-accept',
        decisionDate: '2026-08-30',
      });
    }
  });

  it('assigns atmosphere, preview, and graph backplate transform width sets', () => {
    expect(PROMOTED_ASSET_REGISTRY['portal-centered-dark'].transform.widths).toEqual(ATMOSPHERE_WIDTHS);
    expect(PROMOTED_ASSET_REGISTRY['project-data-architecture'].transform.widths).toEqual(PREVIEW_WIDTHS);
    expect(PROMOTED_ASSET_REGISTRY['home-graph-backplate-light'].transform.widths).toEqual(
      GRAPH_BACKPLATE_WIDTHS,
    );
    expect(PROMOTED_ASSET_REGISTRY['blog-coral-stairs'].transform.formats).toEqual(PROMOTED_FORMATS);
    expect(PROMOTED_ASSET_REGISTRY['home-graph-backplate-dark'].transform.widths).not.toContain(1254);
  });

  it('maps projects and rails to definitive runtime asset ids', () => {
    expect(HOME_PROJECT_ASSET_BY_SLUG['pars-sql-vtd-edge']).toBe('project-data-architecture');
    expect(HOME_PROJECT_ASSET_BY_SLUG['organizational-dashboard-research']).toBe(
      'project-dashboard-systems',
    );
    expect(HOME_RAIL_ASSET_BY_PATH.writing).toBe('blog-coral-stairs');
    expect(HOME_RAIL_ASSET_BY_PATH.teaching).toBe('learning-sage-library');
    expect(HOME_RAIL_ASSET_BY_PATH.creative).toBe('gallery-ivory-forms');
    expect(GATEWAY_ATMOSPHERE_ASSETS.light).toBe('portal-centered-light');
    expect(HOME_HERO_ATMOSPHERE_ASSETS.dark).toBe('portal-orbit-dark');
    expect(HOME_GRAPH_BACKPLATE_ASSETS.light).toBe('home-graph-backplate-light');
    expect(HOME_GRAPH_BACKPLATE_ASSETS.dark).toBe('home-graph-backplate-dark');
  });

  it('documents active derivative manifest entries for all runtime assets', () => {
    expect(DERIVATIVE_MANIFEST).toHaveLength(RUNTIME_ASSET_IDS.length);
    expect(DERIVATIVE_MANIFEST.every((entry) => entry.status === 'active')).toBe(true);
    expect(DEFERRED_DERIVATIVE_ENTRIES).toHaveLength(0);

    const graphLight = DERIVATIVE_MANIFEST.find((entry) => entry.assetId === 'home-graph-backplate-light');
    expect(graphLight?.widths).toEqual(GRAPH_BACKPLATE_WIDTHS);
    expect(graphLight?.intrinsic).toEqual({ width: 1254, height: 1254 });
  });

  it('throws for owner-deferred ids at the registry boundary', () => {
    for (const id of DEFERRED_ASSET_IDS) {
      expect(() => getPromotedAssetRecord(id, 'home.graph.backplate')).toThrow();
    }
  });

  it('documents runtime loader rejection for deferred ids', () => {
    const source = readFileSync(path.join(repositoryRoot, 'src/lib/media/promoted-media.ts'), 'utf8');
    expect(source).toContain('isDeferredAssetId(id)');
    expect(source).toContain('Deferred asset');
    expect(source).toContain('assertSourceHash');
  });

  it('keeps owner-deferred authority masters out of the runtime asset tree', () => {
    for (const id of DEFERRED_ASSET_IDS) {
      expect(existsSync(path.join(mediaRoot, 'art', `${id}.png`))).toBe(false);
    }
  });

  it('includes exact-hash graph backplate masters in the runtime asset tree', () => {
    for (const id of ['home-graph-backplate-light', 'home-graph-backplate-dark'] as const) {
      const relativePath = PROMOTED_ASSET_REGISTRY[id].assetFile;
      expect(existsSync(path.join(mediaRoot, relativePath))).toBe(true);
      expect(sha256File(relativePath)).toBe(AUTHORITY_CHECKSUMS[id]);
    }
  });
});
