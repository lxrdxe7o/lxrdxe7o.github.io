import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  buildProjectSchema,
  buildWritingSchema,
  buildNoteSchema,
  buildExperimentSchema,
} from '../../src/content/schema';
import {
  buildFactSchema,
  findNonPublishableFacts,
  assertPublishableForPublicEntry,
} from '../../src/data/facts';
import { findDuplicateSlugs } from '../../src/lib/content/sort';
import { loadFixtureData } from '../fixtures/content/load';

// The injected `z` in vitest is the same zod v4 that Astro uses (aliased in vitest.config.ts).
type Z = Parameters<typeof buildProjectSchema>[0];
const zz = z as unknown as Z;

const projectSchema = buildProjectSchema(zz);
const writingSchema = buildWritingSchema(zz);
const noteSchema = buildNoteSchema(zz);
const experimentSchema = buildExperimentSchema(zz);
const factSchema = buildFactSchema(zz);

describe('project schema', () => {
  it('accepts a fully valid public project', () => {
    const data = loadFixtureData('projects/valid-project.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts a draft project that retains a non-publishable fact', () => {
    const data = loadFixtureData('projects/draft-project.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid repository URL', () => {
    const data = loadFixtureData('projects/invalid-url.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects an image media item missing accessible alt text', () => {
    const data = loadFixtureData('projects/missing-alt.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a project whose end date precedes its start date', () => {
    const data = loadFixtureData('projects/invalid-dates.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a public project carrying a non-publishable fact', () => {
    const data = loadFixtureData('projects/public-nonpublishable-fact.mdx');
    const result = projectSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Assert it fails for the intended rule, not incidentally.
      const onFacts = result.error.issues.some((i) => i.path[0] === 'facts');
      expect(onFacts).toBe(true);
    }
  });

  it('rejects a video media item without poster and alt', () => {
    const data = loadFixtureData('projects/valid-project.mdx') as Record<string, unknown>;
    const media = [{ type: 'video', src: '/x.mp4' }];
    const result = projectSchema.safeParse({ ...data, media });
    expect(result.success).toBe(false);
  });

  it('rejects an implausible year', () => {
    const data = loadFixtureData('projects/valid-project.mdx') as Record<string, unknown>;
    const result = projectSchema.safeParse({ ...data, year: 1200 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'year')).toBe(true);
    }
  });
});

describe('fact schema and publishability helpers', () => {
  it('rejects a fact with an invalid verifiedAt date', () => {
    const result = factSchema.safeParse({
      value: 'x',
      source: 'https://example.com',
      verifiedAt: 'not-a-date',
      publishable: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a fact with an undefined value', () => {
    const result = factSchema.safeParse({
      value: undefined,
      source: 'https://example.com',
      verifiedAt: '2024-01-01',
      publishable: true,
    });
    expect(result.success).toBe(false);
  });

  it('finds indexes of non-publishable facts', () => {
    const facts = [
      { publishable: true },
      { publishable: false },
      { publishable: false },
    ];
    expect(findNonPublishableFacts(facts)).toEqual([1, 2]);
    expect(findNonPublishableFacts(undefined)).toEqual([]);
  });

  it('permits non-publishable facts only on draft entries', () => {
    const facts = [{ publishable: false }];
    expect(assertPublishableForPublicEntry(true, facts)).toBe(true);
    expect(assertPublishableForPublicEntry(false, facts)).toBe(false);
    expect(assertPublishableForPublicEntry(false, [{ publishable: true }])).toBe(true);
    expect(assertPublishableForPublicEntry(false, undefined)).toBe(true);
  });
});

describe('duplicate slug detector', () => {
  it('detects slugs that appear more than once across a collection', () => {
    const a = loadFixtureData('projects/duplicate-a.mdx');
    const b = loadFixtureData('projects/duplicate-b.mdx');
    const entries = [
      { id: 'duplicate-a', data: a as { slug: string } },
      { id: 'duplicate-b', data: b as { slug: string } },
    ];
    expect(findDuplicateSlugs(entries)).toEqual(['dup-slug']);
  });

  it('returns an empty array when all slugs are unique', () => {
    const entries = [
      { id: 'x', data: { slug: 'one' } },
      { id: 'y', data: { slug: 'two' } },
    ];
    expect(findDuplicateSlugs(entries)).toEqual([]);
  });
});

describe('writing / note / experiment schemas', () => {
  it('accepts a valid article', () => {
    const data = loadFixtureData('writing/valid-article.mdx');
    expect(writingSchema.safeParse(data).success).toBe(true);
  });

  it('accepts a valid note', () => {
    const data = loadFixtureData('notes/valid-note.mdx');
    expect(noteSchema.safeParse(data).success).toBe(true);
  });

  it('accepts a valid experiment', () => {
    const data = loadFixtureData('lab/valid-experiment.mdx');
    expect(experimentSchema.safeParse(data).success).toBe(true);
  });

  it('rejects an article whose updatedDate precedes its publishDate', () => {
    const data = loadFixtureData('writing/valid-article.mdx') as Record<string, unknown>;
    const result = writingSchema.safeParse({
      ...data,
      publishDate: '2024-05-01',
      updatedDate: '2024-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'updatedDate')).toBe(true);
    }
  });

  it('rejects a public article carrying a non-publishable fact', () => {
    const data = loadFixtureData('writing/valid-article.mdx') as Record<string, unknown>;
    const result = writingSchema.safeParse({
      ...data,
      draft: false,
      facts: [{ value: 'x', source: 'internal', verifiedAt: '2024-01-01', publishable: false }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a public note carrying a non-publishable fact', () => {
    const data = loadFixtureData('notes/valid-note.mdx') as Record<string, unknown>;
    const result = noteSchema.safeParse({
      ...data,
      draft: false,
      facts: [{ value: 'x', source: 'internal', verifiedAt: '2024-01-01', publishable: false }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a note with an invalid date', () => {
    const data = loadFixtureData('notes/valid-note.mdx') as Record<string, unknown>;
    const result = noteSchema.safeParse({ ...data, date: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects a public experiment carrying a non-publishable fact', () => {
    const data = loadFixtureData('lab/valid-experiment.mdx') as Record<string, unknown>;
    const result = experimentSchema.safeParse({
      ...data,
      draft: false,
      facts: [{ value: 'x', source: 'internal', verifiedAt: '2024-01-01', publishable: false }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an experiment missing its required id', () => {
    const data = loadFixtureData('lab/valid-experiment.mdx') as Record<string, unknown>;
    delete (data as Record<string, unknown>).id;
    const result = experimentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
