/**
 * Pure, deterministic query helpers for content collections.
 *
 * These functions operate on collection-entry-like objects (`{ id, data }`) and
 * never import the `astro:content` runtime, so they are directly unit-testable.
 * The `astro:content`-dependent query utilities (getProjects, getWriting, ...)
 * compose these helpers. Generics are declared over the whole entry type so the
 * concrete `CollectionEntry` type flows through unchanged.
 */

/** Collection-entry-like wrapper: only the fields these helpers read. */
export interface EntryLike<D> {
  id: string;
  data: D;
}

/**
 * Resolve whether drafts should be included.
 * Explicit caller intent wins; otherwise drafts are excluded in production.
 * Pure (isProd injected) so it is unit-testable without `import.meta.env`.
 */
export function resolveIncludeDrafts(
  option: boolean | undefined,
  isProd: boolean,
): boolean {
  return option ?? !isProd;
}

/** Filter out draft entries unless drafts are explicitly requested. */
export function filterDrafts<E extends EntryLike<{ draft?: boolean }>>(
  entries: readonly E[],
  includeDrafts: boolean,
): E[] {
  if (includeDrafts) return [...entries];
  return entries.filter((entry) => entry.data.draft !== true);
}

/** Return the slugs that appear more than once across the given entries. */
export function findDuplicateSlugs<E extends EntryLike<{ slug: string }>>(
  entries: readonly E[],
): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.data.slug, (counts.get(entry.data.slug) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [slug, count] of counts) {
    if (count > 1) duplicates.push(slug);
  }
  return duplicates.sort((a, b) => a.localeCompare(b));
}

/**
 * Throw if any slug appears more than once in a collection. Called by every
 * query util so duplicate slugs fail the build instead of shipping silently
 * (Astro's glob loader keys entries by file path, not the `slug` field).
 */
export function assertUniqueSlugs<E extends EntryLike<{ slug: string }>>(
  entries: readonly E[],
  collection: string,
): void {
  const duplicates = findDuplicateSlugs(entries);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate slug(s) in the "${collection}" collection: ${duplicates.join(', ')}. ` +
        'Each entry must declare a unique slug.',
    );
  }
}

/** Ascending string comparison used as the final, unique tie-breaker. */
function bySlugAsc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

interface ProjectSortData {
  slug: string;
  featured?: number;
  year?: number;
}

/**
 * Sort projects deterministically:
 * featured rank ascending (unfeatured last) -> year descending -> slug ascending.
 * Returns a new array; the input is never mutated.
 */
export function sortProjects<E extends EntryLike<ProjectSortData>>(
  entries: readonly E[],
): E[] {
  return [...entries].sort((a, b) => {
    const fa = a.data.featured ?? Number.POSITIVE_INFINITY;
    const fb = b.data.featured ?? Number.POSITIVE_INFINITY;
    if (fa !== fb) return fa - fb;

    const ya = a.data.year ?? Number.NEGATIVE_INFINITY;
    const yb = b.data.year ?? Number.NEGATIVE_INFINITY;
    if (ya !== yb) return yb - ya;

    return bySlugAsc(a.data.slug, b.data.slug);
  });
}

interface DatedSortData {
  slug: string;
  date: Date;
}

/** Sort by date descending, then slug ascending. Used by notes. */
export function sortByDateDesc<E extends EntryLike<DatedSortData>>(
  entries: readonly E[],
): E[] {
  return [...entries].sort((a, b) => {
    const ta = a.data.date.getTime();
    const tb = b.data.date.getTime();
    if (ta !== tb) return tb - ta;
    return bySlugAsc(a.data.slug, b.data.slug);
  });
}

/** Sort writing by publishDate descending, then slug ascending. */
export function sortWriting<E extends EntryLike<{ slug: string; publishDate: Date }>>(
  entries: readonly E[],
): E[] {
  return [...entries].sort((a, b) => {
    const ta = a.data.publishDate.getTime();
    const tb = b.data.publishDate.getTime();
    if (ta !== tb) return tb - ta;
    return bySlugAsc(a.data.slug, b.data.slug);
  });
}

/** Sort notes by date descending, then slug ascending. */
export function sortNotes<E extends EntryLike<DatedSortData>>(
  entries: readonly E[],
): E[] {
  return sortByDateDesc(entries);
}

/** Sort experiments deterministically by slug ascending. */
export function sortExperiments<E extends EntryLike<{ slug: string }>>(
  entries: readonly E[],
): E[] {
  return [...entries].sort((a, b) => bySlugAsc(a.data.slug, b.data.slug));
}
