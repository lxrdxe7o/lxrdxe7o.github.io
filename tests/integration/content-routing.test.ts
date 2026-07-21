import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { buildProjectSchema } from '../../src/content/schema';
import {
  filterDrafts,
  sortProjects,
  sortWriting,
  sortNotes,
  sortExperiments,
  findDuplicateSlugs,
  assertUniqueSlugs,
  resolveIncludeDrafts,
} from '../../src/lib/content/sort';
import { loadFixtureData } from '../fixtures/content/load';

type Z = Parameters<typeof buildProjectSchema>[0];
const projectSchema = buildProjectSchema(z as unknown as Z);

type ProjectData = {
  slug: string;
  title: string;
  draft: boolean;
  featured?: number;
  year?: number;
};

// Build a collection-entry-like array from the valid/draft fixtures.
function loadProjectEntries(): { id: string; data: ProjectData }[] {
  const files = [
    'projects/valid-project.mdx',
    'projects/draft-project.mdx',
    'projects/duplicate-a.mdx',
  ];
  return files.map((f) => ({
    id: f.replace(/\.mdx$/, ''),
    data: loadFixtureData(f) as unknown as ProjectData,
  }));
}

describe('draft filtering (query util behavior)', () => {
  it('excludes drafts when includeDrafts is false (production behavior)', () => {
    const entries = loadProjectEntries();
    const visible = filterDrafts(entries, false);
    expect(visible.every((e) => e.data.draft !== true)).toBe(true);
    expect(visible.some((e) => e.id === 'projects/draft-project'.replace(/\.mdx$/, ''))).toBe(
      false,
    );
  });

  it('includes drafts when includeDrafts is true', () => {
    const entries = loadProjectEntries();
    const all = filterDrafts(entries, true);
    expect(all.length).toBe(entries.length);
  });

  it('resolveIncludeDrafts: explicit intent wins, else excludes in prod', () => {
    // Default (no explicit option): excluded in prod, included in dev.
    expect(resolveIncludeDrafts(undefined, true)).toBe(false);
    expect(resolveIncludeDrafts(undefined, false)).toBe(true);
    // Explicit caller intent always wins.
    expect(resolveIncludeDrafts(true, true)).toBe(true);
    expect(resolveIncludeDrafts(false, false)).toBe(false);
  });
});

describe('deterministic sorting', () => {
  it('produces a stable order across repeated runs', () => {
    const entries = filterDrafts(loadProjectEntries(), true);
    const first = sortProjects(entries).map((e) => e.id);
    const second = sortProjects(entries).map((e) => e.id);
    expect(first).toEqual(second);
  });

  it('orders by featured rank asc, then year desc, then slug asc', () => {
    const entries = [
      { id: 'c', data: { slug: 'c', title: 'C', draft: false } },
      { id: 'b2', data: { slug: 'b2', title: 'B2', draft: false, featured: 1, year: 2020 } },
      { id: 'b1', data: { slug: 'b1', title: 'B1', draft: false, featured: 1, year: 2024 } },
      { id: 'a', data: { slug: 'a', title: 'A', draft: false, featured: 2, year: 2024 } },
    ];
    const order = sortProjects(entries).map((e) => e.data.slug);
    // featured 1 group first (year desc -> b1 then b2), then featured 2 (a), then unfeatured (c)
    expect(order).toEqual(['b1', 'b2', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const entries = [
      { id: 'a', data: { slug: 'a', title: 'A', draft: false, featured: 2 } },
      { id: 'b', data: { slug: 'b', title: 'B', draft: false, featured: 1 } },
    ];
    const before = entries.map((e) => e.id);
    sortProjects(entries);
    expect(entries.map((e) => e.id)).toEqual(before);
  });

  it('writing/notes/experiment sorters are deterministic and slug-tie-broken', () => {
    const writing = [
      { id: 'w1', data: { slug: 'b', publishDate: new Date('2024-01-01') } },
      { id: 'w2', data: { slug: 'a', publishDate: new Date('2024-01-01') } },
      { id: 'w3', data: { slug: 'c', publishDate: new Date('2025-01-01') } },
    ];
    expect(sortWriting(writing).map((e) => e.data.slug)).toEqual(['c', 'a', 'b']);
    expect(sortWriting(writing).map((e) => e.data.slug)).toEqual(
      sortWriting(writing).map((e) => e.data.slug),
    );

    const notes = [
      { id: 'n1', data: { slug: 'b', date: new Date('2024-01-01') } },
      { id: 'n2', data: { slug: 'a', date: new Date('2024-01-01') } },
    ];
    expect(sortNotes(notes).map((e) => e.data.slug)).toEqual(['a', 'b']);

    const experiments = [
      { id: 'e1', data: { slug: 'z' } },
      { id: 'e2', data: { slug: 'a' } },
    ];
    expect(sortExperiments(experiments).map((e) => e.data.slug)).toEqual(['a', 'z']);
  });
});

describe('collection integrity', () => {
  it('validates every non-duplicate public/draft fixture entry through the schema', () => {
    const entries = loadProjectEntries();
    for (const entry of entries) {
      const result = projectSchema.safeParse(entry.data);
      expect(result.success, `${entry.id} should be schema-valid`).toBe(true);
    }
  });

  it('flags duplicate slugs so a collection cannot publish them', () => {
    const a = loadFixtureData('projects/duplicate-a.mdx') as unknown as ProjectData;
    const b = loadFixtureData('projects/duplicate-b.mdx') as unknown as ProjectData;
    const entries = [
      { id: 'duplicate-a', data: a },
      { id: 'duplicate-b', data: b },
    ];
    expect(findDuplicateSlugs(entries)).toContain('dup-slug');
  });

  it('assertUniqueSlugs throws on duplicates and is silent when unique', () => {
    const dup = [
      { id: 'a', data: { slug: 'same' } },
      { id: 'b', data: { slug: 'same' } },
    ];
    expect(() => assertUniqueSlugs(dup, 'projects')).toThrow(/Duplicate slug/);
    const unique = [
      { id: 'a', data: { slug: 'one' } },
      { id: 'b', data: { slug: 'two' } },
    ];
    expect(() => assertUniqueSlugs(unique, 'projects')).not.toThrow();
  });
});
