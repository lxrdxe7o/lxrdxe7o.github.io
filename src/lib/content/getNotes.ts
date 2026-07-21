import { getCollection, type CollectionEntry } from 'astro:content';

import { assertUniqueSlugs, filterDrafts, resolveIncludeDrafts, sortNotes } from './sort';
import type { ContentQueryOptions } from './getProjects';

/**
 * Fetch notes, excluding drafts in production, sorted by date descending
 * then slug ascending.
 */
export async function getNotes(
  options: ContentQueryOptions = {},
): Promise<CollectionEntry<'notes'>[]> {
  const includeDrafts = resolveIncludeDrafts(options.includeDrafts, import.meta.env.PROD);
  const entries = await getCollection('notes');
  assertUniqueSlugs(entries, 'notes');
  return sortNotes(filterDrafts(entries, includeDrafts));
}
