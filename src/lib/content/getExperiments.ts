import { getCollection, type CollectionEntry } from 'astro:content';

import { assertUniqueSlugs, filterDrafts, resolveIncludeDrafts, sortExperiments } from './sort';
import type { ContentQueryOptions } from './getProjects';

/**
 * Fetch lab experiments, excluding drafts in production, sorted
 * deterministically by slug ascending.
 */
export async function getExperiments(
  options: ContentQueryOptions = {},
): Promise<CollectionEntry<'lab'>[]> {
  const includeDrafts = resolveIncludeDrafts(options.includeDrafts, import.meta.env.PROD);
  const entries = await getCollection('lab');
  assertUniqueSlugs(entries, 'lab');
  return sortExperiments(filterDrafts(entries, includeDrafts));
}
