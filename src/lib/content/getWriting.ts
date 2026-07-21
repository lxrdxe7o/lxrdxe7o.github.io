import { getCollection, type CollectionEntry } from 'astro:content';

import { assertUniqueSlugs, filterDrafts, resolveIncludeDrafts, sortWriting } from './sort';
import type { ContentQueryOptions } from './getProjects';

/**
 * Fetch writing entries, excluding drafts in production, sorted by
 * publishDate descending then slug ascending.
 */
export async function getWriting(
  options: ContentQueryOptions = {},
): Promise<CollectionEntry<'writing'>[]> {
  const includeDrafts = resolveIncludeDrafts(options.includeDrafts, import.meta.env.PROD);
  const entries = await getCollection('writing');
  assertUniqueSlugs(entries, 'writing');
  return sortWriting(filterDrafts(entries, includeDrafts));
}
