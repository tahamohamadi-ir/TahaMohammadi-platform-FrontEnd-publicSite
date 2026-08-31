import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import HomeCollaborationCta from './HomeCollaborationCta.astro';
import HomeExploreRails from './HomeExploreRails.astro';
import HomeFeaturedProjects from './HomeFeaturedProjects.astro';
import HomeFeaturedPublications from './HomeFeaturedPublications.astro';
import HomeHero from './HomeHero.astro';
import HomeJourney from './HomeJourney.astro';
import HomeResearchGraph from './HomeResearchGraph.astro';
import HomeResearchInterests from './HomeResearchInterests.astro';
import {
  getHomeExploreContent,
  getHomeFeaturedContent,
  getHomeHeroContent,
  getHomeInterestsContent,
  getHomeJourneyContent,
  getHomePublicationsContent,
} from '../../lib/home-content';

type Component = Parameters<
  Awaited<ReturnType<typeof AstroContainer.create>>['renderToString']
>[0];

async function render(component: Component, props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

const FA_ROLE = 'مهندس نرم‌افزار و پژوهشگر در حوزه هوش مصنوعی انسان‌محور، سامانه‌های داده و تحلیل بصری';
const EN_ROLE = 'Software Engineer &amp; Researcher in Human-Centered AI, Data Systems, and Visual Analytics';

describe('WP-40 home hero', () => {
  it('keeps the orbit atmosphere in a decorative ThemePicture without /media/ URLs', async () => {
    const html = await render(HomeHero, { locale: 'en' });
    expect(html).toMatch(/data-theme-picture/);
    expect(html).toMatch(/portal-orbit-light/);
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).not.toMatch(/\/media\//);
  });

  it('uses the approved seed professional role per locale and never the shared EN line on FA', async () => {
    const en = await render(HomeHero, { locale: 'en' });
    expect(en).toContain(EN_ROLE);

    const fa = await render(HomeHero, { locale: 'fa' });
    expect(fa).toContain(FA_ROLE);
    expect(fa).not.toMatch(/Researcher/);
  });

  it('renders one H1 name and no unavailable hero CTAs', async () => {
    for (const locale of ['en', 'fa'] as const) {
      const html = await render(HomeHero, { locale });
      expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
      expect(html).not.toMatch(/href="\/(en|fa)\/(research|cv|contact)\/"/);
      expect(html.match(/class="ui-chip ui-chip--neutral"/g)?.length).toBe(5);
    }
  });
});

describe('WP-40 research graph', () => {
  it('overlays a semantic node list on the decorative graph backplate', async () => {
    const html = await render(HomeResearchGraph, { locale: 'en' });
    expect(html).toMatch(/home-graph-backplate-light/);
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).not.toMatch(/role="img"/);
    expect(html.match(/<li[\s>]/g)?.length).toBe(5);
    expect(html).toMatch(/Human-Centered AI/);
    expect(html).not.toMatch(/href="\/en\/research\/"/);
  });

  it('presents exact-locale FA research-statement data in the list', async () => {
    const html = await render(HomeResearchGraph, { locale: 'fa' });
    expect(html).toMatch(/home-graph-backplate-dark|home-graph-backplate-light/);
    expect(html).toContain('هوش مصنوعی انسان‌محور و تعامل انسان و هوش مصنوعی');
    expect(html).not.toContain('Human-Centered AI');
  });

  it('declares graph nodes explicitly non-interactive while no target route exists', async () => {
    for (const locale of ['en', 'fa'] as const) {
      const html = await render(HomeResearchGraph, { locale });
      const list = html.match(/<ul class="hm-graph__nodes[\s\S]*?<\/ul>/)?.[0] ?? '';
      expect(list, 'node list must carry the explicit unavailable-route contract').toMatch(
        /data-graph-state="unavailable-route"/,
      );
      expect(
        list.match(/data-graph-node-state="unavailable"/g)?.length,
        'every node must declare the unavailable state',
      ).toBe(5);
      expect(list, 'no invented anchors while routes are unavailable').not.toMatch(/<a[\s>]/);
      expect(list, 'nodes must not be forced into the tab order').not.toMatch(/tabindex/i);
      expect(list, 'nodes must not fake a disabled affordance').not.toMatch(/aria-disabled/i);
    }
  });
});

describe('WP-40 interest cards', () => {
  it('renders exactly five EN interest cards without research anchors', async () => {
    const html = await render(HomeResearchInterests, { locale: 'en' });
    expect(html.match(/<article[\s>]/g)?.length).toBe(5);
    expect(html).not.toMatch(/href="\/en\/research\/"/);
  });

  it('omits EN-only card records on FA while keeping exact-locale fit copy', async () => {
    const fa = await render(HomeResearchInterests, { locale: 'fa' });
    expect(fa).not.toMatch(/<article[\s>]/);
    expect(fa).not.toContain('Human-Centered AI');
    expect(fa).toContain('تناسب پژوهشی');
  });
});

describe('WP-40 journey', () => {
  it('renders an ordered TimelineNode list with Lucide icons and no about anchor', async () => {
    const html = await render(HomeJourney, { locale: 'en' });
    expect(html).toMatch(/<ol[\s>]/);
    expect(html.match(/<li[\s>]/g)?.length).toBe(5);
    expect(html).toMatch(/lucide/);
    expect(html).not.toMatch(/href="\/en\/about\/"/);
  });
});

describe('WP-40 featured projects', () => {
  it('renders the two approved projects with mapped previews and localized consumer alt', async () => {
    const en = await render(HomeFeaturedProjects, { locale: 'en' });
    expect(en.match(/<article[\s>]/g)?.length).toBe(2);
    expect(en).toMatch(/project-data-architecture/);
    expect(en).toMatch(/project-dashboard-systems/);
    expect(en).toMatch(/alt="PARS-SQL \/ VTD-Edge"/);
    expect(en).toMatch(/href="\/en\/projects\/pars-sql-vtd-edge\/"/);
    expect(en).toMatch(/href="\/en\/projects\/organizational-dashboard-research\/"/);
    expect(en).not.toMatch(/\/media\//);

    const fa = await render(HomeFeaturedProjects, { locale: 'fa' });
    expect(fa).toMatch(/alt="پژوهش و طراحی داشبوردهای سازمانی"/);
    expect(fa).toMatch(/href="\/fa\/projects\//);
  });

  it('keeps the preview non-clickable with an independent action link', async () => {
    const html = await render(HomeFeaturedProjects, { locale: 'en' });
    const article = html.match(/<article[\s>][\s\S]*?<\/article>/)?.[0] ?? '';
    const mediaIndex = article.indexOf('<picture');
    const firstAnchor = article.indexOf('href=');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(firstAnchor).toBeGreaterThan(mediaIndex);
  });
});

describe('WP-40 manuscript rail', () => {
  it('links EN manuscripts inside /writing with honest status labels', async () => {
    const html = await render(HomeFeaturedPublications, { locale: 'en' });
    expect(html).toMatch(/href="\/en\/writing\/visual-discourse-elections\/"/);
    expect(html).toMatch(/href="\/en\/writing\/vtd-edge-manuscript\/"/);
    expect(html).toMatch(/Manuscript in final revision/);
  });

  it('omits EN-only manuscripts entirely from FA', async () => {
    const html = await render(HomeFeaturedPublications, { locale: 'fa' });
    expect(html).not.toMatch(/<article[\s>]/);
    expect(html).not.toMatch(/href="\/fa\/writing\//);
  });
});

describe('WP-40 explore rails', () => {
  it('uses the three approved decorative previews and links only the available writing route', async () => {
    const html = await render(HomeExploreRails, { locale: 'en' });
    expect(html).toMatch(/blog-coral-stairs/);
    expect(html).toMatch(/learning-sage-library/);
    expect(html).toMatch(/gallery-ivory-forms/);
    expect(html).toMatch(/href="\/en\/writing\/"/);
    expect(html).not.toMatch(/href="\/en\/(teaching|creative)\/"/);
    expect(html).toContain('No public teaching record is available yet.');
  });

  it('renders seed-backed FA unavailable states without anchors', async () => {
    const html = await render(HomeExploreRails, { locale: 'fa' });
    expect(html).toMatch(/href="\/fa\/writing\/"/);
    expect(html).not.toMatch(/href="\/fa\/(teaching|creative)\/"/);
    expect(html).toContain('هنوز رکورد عمومی تأییدشده‌ای برای تدریس در دسترس نیست.');
  });
});

describe('WP-40 collaboration CTA', () => {
  it('renders unavailable contact and CV actions without anchors', async () => {
    for (const locale of ['en', 'fa'] as const) {
      const html = await render(HomeCollaborationCta, { locale });
      expect(html).not.toMatch(/href="\/(en|fa)\/(contact|cv)\/"/);
      expect(html.match(/<button[^>]*disabled/g)?.length).toBe(2);
      expect(html).not.toMatch(/\/media\//);
    }
  });
});

describe('WP-40 exact-locale content adapter', () => {
  it('filters EN-only records from FA and maps approved asset ids', () => {
    expect(getHomeInterestsContent('en').cards).toHaveLength(5);
    expect(getHomeInterestsContent('fa').cards).toHaveLength(0);
    expect(getHomePublicationsContent('en').items).toHaveLength(2);
    expect(getHomePublicationsContent('fa').items).toHaveLength(0);

    const projects = getHomeFeaturedContent('en').projects;
    expect(projects.map((project) => project.assetId)).toEqual([
      'project-data-architecture',
      'project-dashboard-systems',
    ]);

    const rails = getHomeExploreContent('en').rails;
    expect(rails.find((rail) => rail.pathSegment === 'teaching')?.unavailableStatus).toBe(
      'No public teaching record is available yet.',
    );
    expect(rails.find((rail) => rail.pathSegment === 'creative')?.unavailableStatus).toBe(
      'Selected visual and design work will be added after authorship, credits, and publication rights are confirmed.',
    );
    expect(getHomeJourneyContent('en').milestones).toHaveLength(5);
    expect(getHomeHeroContent('fa').role).toBe(FA_ROLE);
  });
});
