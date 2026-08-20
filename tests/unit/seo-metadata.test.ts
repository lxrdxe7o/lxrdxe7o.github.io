import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  articleData,
  breadcrumbData,
  creativeWorkData,
  robotsPolicy,
  serializeStructuredData,
  sitePersonData,
  siteWebSiteData,
  type StructuredDataBlock,
} from '../../src/lib/seo/metadata';
import {
  SOCIAL_CARD_HEIGHT,
  SOCIAL_CARD_WIDTH,
  socialCardForRoute,
  socialCards,
} from '../../src/lib/seo/social-card';

describe('canonical and absolute URL generation', () => {
  it('normalizes paths into absolute URLs on the configured origin', () => {
    expect(absoluteUrl('/')).toMatch(/^https?:\/\/.+\/$/);
    expect(absoluteUrl('projects')).toMatch(/^https?:\/\/.+\/projects$/);
  });

  it('is deterministic for the same input', () => {
    expect(absoluteUrl('/about')).toBe(absoluteUrl('/about'));
  });
});

describe('structured data blocks', () => {
  it('produces required Person fields from verified facts only', () => {
    expect(sitePersonData).toMatchObject({
      '@type': 'Person',
      name: 'Ishraful Haque',
      alternateName: 'lxrdxe7o',
      jobTitle: 'Full-Stack Developer',
    });
    expect(sitePersonData.sameAs).toContain('https://github.com/lxrdxe7o');
  });

  it('produces WebSite data with name, url, and description', () => {
    expect(siteWebSiteData).toMatchObject({
      '@type': 'WebSite',
      name: 'lxrdxe7o',
      description: expect.any(String),
    });
  });

  it('produces CreativeWork data with author and absolute URL', () => {
    const work = creativeWorkData('Xero.dev', 'Personal developer blog.', '/projects/xero-dev');
    expect(work).toMatchObject({
      '@type': 'CreativeWork',
      name: 'Xero.dev',
      author: sitePersonData,
    });
    expect(work.url).toMatch(/\/projects\/xero-dev$/);
  });

  it('produces Article data with verified publication dates only', () => {
    const published = new Date('2026-07-21T00:00:00.000Z');
    const article = articleData('Title', 'Description', '/writing/title', published);
    expect(article.datePublished).toBe(published.toISOString());
    expect(article.dateModified).toBeUndefined();

    const updated = new Date('2026-08-01T00:00:00.000Z');
    const revised = articleData('Title', 'Description', '/writing/title', published, updated);
    expect(revised.dateModified).toBe(updated.toISOString());
  });

  it('produces ordered breadcrumbs with absolute items', () => {
    const crumbs = breadcrumbData([
      { name: 'Work', path: '/projects' },
      { name: 'Xero.dev', path: '/projects/xero-dev' },
    ]);
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0]).toMatchObject({ position: 1, name: 'Work' });
    expect(crumbs.itemListElement[1]).toMatchObject({ position: 2, name: 'Xero.dev' });
  });

  it('serializes a valid JSON-LD graph', () => {
    const serialized = serializeStructuredData([
      sitePersonData,
      siteWebSiteData,
    ] satisfies readonly StructuredDataBlock[]);
    const parsed = JSON.parse(serialized) as {
      '@context': string;
      '@graph': Array<{ '@type': string }>;
    };
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph'].map((block) => block['@type'])).toEqual(['Person', 'WebSite']);
  });
});

describe('robots policy', () => {
  it('indexes only production with a configured origin', () => {
    expect(
      robotsPolicy('/', { production: true, originConfigured: true }),
    ).toBe('index, follow');
  });

  it('fails closed to noindex without an origin or outside production', () => {
    expect(robotsPolicy('/', { production: true, originConfigured: false })).toBe(
      'noindex, nofollow',
    );
    expect(robotsPolicy('/', { production: false, originConfigured: true })).toBe(
      'noindex, nofollow',
    );
  });

  it('never indexes error pages', () => {
    expect(robotsPolicy('/404', { production: true, originConfigured: true })).toBe(
      'noindex, nofollow',
    );
  });
});

describe('social card contract', () => {
  it('defines the standard 1200x630 card dimensions', () => {
    expect(SOCIAL_CARD_WIDTH).toBe(1200);
    expect(SOCIAL_CARD_HEIGHT).toBe(630);
  });

  it('maps every major route archetype to a dedicated card with a label', () => {
    for (const routeId of ['home', 'projects', 'about', 'writing', 'notes', 'lab', 'contact']) {
      expect(socialCardForRoute(routeId)).toEqual(socialCards[routeId]);
    }
  });

  it('falls back to the default card for unknown routes', () => {
    expect(socialCardForRoute('unknown-route')).toEqual(socialCards.home);
  });
});
