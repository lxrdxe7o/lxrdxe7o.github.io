import type { Fact } from './facts';

export const EDITORIAL_VERIFIED_AT = new Date('2026-07-21T00:00:00.000Z');

export function approvedFact<T>(value: T, source: string, verifiedAt = EDITORIAL_VERIFIED_AT): Fact<T> {
  return { value, source, verifiedAt, publishable: true };
}

export function publishableFacts<T>(facts: readonly Fact<T>[]): Fact<T>[] {
  return facts.filter((fact) => fact.publishable);
}

export function stableHeadingId(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface RelatedEditorialEntry {
  slug: string;
  draft?: boolean;
  tags?: readonly string[];
}

export function filterRelatedEditorialEntries<T extends RelatedEditorialEntry>(
  entries: readonly T[],
  currentSlug: string,
  tags: readonly string[] | undefined,
  limit = 3,
): T[] {
  if (!tags?.length) return [];
  const wanted = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  return entries
    .filter((entry) => {
      if (entry.draft || entry.slug === currentSlug) return false;
      return entry.tags?.some((tag) => wanted.has(tag.toLocaleLowerCase())) ?? false;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, limit);
}

export function formatEditorialDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
