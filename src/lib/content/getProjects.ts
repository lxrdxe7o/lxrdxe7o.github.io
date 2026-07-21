import { getCollection, type CollectionEntry } from 'astro:content';

import { assertUniqueSlugs, filterDrafts, resolveIncludeDrafts, sortProjects } from './sort';

export interface ContentQueryOptions {
  /** Include draft entries. Defaults to excluding drafts in production. */
  includeDrafts?: boolean;
}

/**
 * Fetch projects, excluding drafts in production, sorted deterministically:
 * featured rank ascending -> year descending -> slug ascending.
 */
export async function getProjects(
  options: ContentQueryOptions = {},
): Promise<CollectionEntry<'projects'>[]> {
  const includeDrafts = resolveIncludeDrafts(options.includeDrafts, import.meta.env.PROD);
  const entries = await getCollection('projects');
  assertUniqueSlugs(entries, 'projects');
  return sortProjects(filterDrafts(entries, includeDrafts));
}
