import { describe, expect, it } from 'vitest';

import {
  getStubProject,
  getStubPublication,
  listStubProjects,
  listStubPublications,
  stubProjectSlugs,
  stubPublicationSlugs,
} from './stub-detail-content';

describe('stub detail content', () => {
  it('lists featured project slugs from seed', () => {
    expect(stubProjectSlugs).toEqual([
      'pars-sql-vtd-edge',
      'organizational-dashboard-research',
    ]);
  });

  it('resolves stub projects for en and fa', () => {
    for (const slug of stubProjectSlugs) {
      expect(getStubProject('en', slug)?.slug).toBe(slug);
      expect(getStubProject('fa', slug)?.slug).toBe(slug);
    }
  });

  it('lists featured publication slugs from seed', () => {
    expect(stubPublicationSlugs).toEqual([
      'visual-discourse-elections',
      'vtd-edge-manuscript',
    ]);
  });

  it('resolves EN-only stub publications only for their exact locale', () => {
    for (const slug of stubPublicationSlugs) {
      expect(getStubPublication('en', slug)?.slug).toBe(slug);
      // writing.visual-discourse.en / writing.vtd-edge.en are EN-only seed
      // records; FA fallback detail routes violated the seed contract.
      expect(getStubPublication('fa', slug)).toBeUndefined();
    }
  });

  it('lists stub projects for index pages', () => {
    expect(listStubProjects('en').map((p) => p.slug)).toEqual([...stubProjectSlugs]);
    expect(listStubProjects('fa').map((p) => p.slug)).toEqual([...stubProjectSlugs]);
  });

  it('lists stub publications for index pages per exact-locale records', () => {
    expect(listStubPublications('en').map((p) => p.slug)).toEqual([...stubPublicationSlugs]);
    expect(listStubPublications('fa')).toEqual([]);
  });
});
