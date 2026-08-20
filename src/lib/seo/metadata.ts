/**
 * Canonical metadata generation for the static portfolio.
 *
 * Every function here is pure and route-scoped: it never reads a browser
 * global, so it works identically at build time and in unit tests. The
 * production origin is configurable through `PUBLIC_SITE_URL` and fails
 * closed to a placeholder that metadata builders refuse to publish.
 */

export const SITE_NAME = 'lxrdxe7o';
export const SITE_TITLE = 'lxrdxe7o — Full-Stack Developer';
export const SITE_DESCRIPTION =
  'Portfolio of Ishraful Haque (lxrdxe7o), a full-stack developer publishing independent software work.';

export const FALLBACK_ORIGIN = 'https://lxrdxe7o.me';

export function readSiteOrigin(): string | null {
  const configured = import.meta.env.PUBLIC_SITE_URL;
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(): string {
  // Production builds must fail closed: without an explicitly configured
  // origin, canonical URLs and feeds are withheld rather than guessed.
  if (import.meta.env.PROD) return readSiteOrigin() ?? FALLBACK_ORIGIN;
  return readSiteOrigin() ?? 'http://localhost:4321';
}

export function isProductionOriginConfigured(): boolean {
  return readSiteOrigin() !== null;
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${resolveSiteOrigin()}${normalized}`;
}

export interface RouteMetadata {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly canonical?: string;
  readonly image?: string;
  readonly publishedAt?: Date;
  readonly updatedAt?: Date;
  readonly robots?: 'index' | 'noindex';
  readonly structuredData?: readonly StructuredDataBlock[];
  readonly alternates?: readonly FeedAlternate[];
}

export interface FeedAlternate {
  readonly type: 'application/rss+xml';
  readonly href: string;
  readonly title: string;
}

export type StructuredDataBlock =
  | PersonData
  | WebSiteData
  | CreativeWorkData
  | ArticleData
  | BreadcrumbData;

export interface PersonData {
  readonly '@type': 'Person';
  readonly name: string;
  readonly alternateName: string;
  readonly jobTitle: string;
  readonly url: string;
  readonly sameAs: readonly string[];
}

export interface WebSiteData {
  readonly '@type': 'WebSite';
  readonly name: string;
  readonly url: string;
  readonly description: string;
}

export interface CreativeWorkData {
  readonly '@type': 'CreativeWork';
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly author: PersonData;
}

export interface ArticleData {
  readonly '@type': 'Article';
  readonly headline: string;
  readonly description: string;
  readonly url: string;
  readonly datePublished: string;
  readonly dateModified?: string;
  readonly author: PersonData;
}

export interface BreadcrumbData {
  readonly '@type': 'BreadcrumbList';
  readonly itemListElement: readonly {
    readonly '@type': 'ListItem';
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }[];
}

export const sitePersonData: PersonData = Object.freeze({
  '@type': 'Person',
  name: 'Ishraful Haque',
  alternateName: 'lxrdxe7o',
  jobTitle: 'Full-Stack Developer',
  url: absoluteUrl('/'),
  sameAs: Object.freeze(['https://github.com/lxrdxe7o']),
});

export const siteWebSiteData: WebSiteData = Object.freeze({
  '@type': 'WebSite',
  name: SITE_NAME,
  url: absoluteUrl('/'),
  description: SITE_DESCRIPTION,
});

export function breadcrumbData(
  items: ReadonlyArray<{ name: string; path: string }>,
): BreadcrumbData {
  return Object.freeze({
    '@type': 'BreadcrumbList',
    itemListElement: Object.freeze(
      items.map((item, index) =>
        Object.freeze({
          '@type': 'ListItem' as const,
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        }),
      ),
    ),
  });
}

export function creativeWorkData(
  name: string,
  description: string,
  path: string,
): CreativeWorkData {
  return Object.freeze({
    '@type': 'CreativeWork',
    name,
    description,
    url: absoluteUrl(path),
    author: sitePersonData,
  });
}

export function articleData(
  headline: string,
  description: string,
  path: string,
  publishedAt: Date,
  updatedAt?: Date,
): ArticleData {
  return Object.freeze({
    '@type': 'Article',
    headline,
    description,
    url: absoluteUrl(path),
    datePublished: publishedAt.toISOString(),
    dateModified: updatedAt ? updatedAt.toISOString() : undefined,
    author: sitePersonData,
  });
}

export function serializeStructuredData(
  blocks: readonly StructuredDataBlock[],
): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': blocks });
}

/** Preview deployments must be noindex; production indexes only with an origin. */
export function robotsPolicy(
  path: string,
  options: { production: boolean; originConfigured: boolean },
): string {
  if (!options.production || !options.originConfigured) return 'noindex, nofollow';
  if (path === '/404') return 'noindex, nofollow';
  return 'index, follow';
}
