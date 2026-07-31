import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_PROJECT_SLUGS,
  ARCHIVE_SLUGS,
  FLAGSHIP_SLUGS,
  classifyProject,
  filterArchiveRecords,
  resolveFlagshipCycle,
  type ArchiveRecord,
} from '../../src/data/projects';

const fixtureRecords: ArchiveRecord[] = [
  { slug: 'fictional-terminal', title: 'Fictional Terminal', summary: 'Fixture only', type: 'terminal-tool', technologies: ['Rust'], year: 2025, status: 'active', href: '/projects/fictional-terminal' },
  { slug: 'fictional-config', title: 'Fictional Config', summary: 'Fixture only', type: 'configuration', technologies: ['Lua'], year: 2024, status: 'maintenance', href: '/projects/fictional-config' },
];

describe('project presentation classification', () => {
  it('assigns each approved project to exactly one presentation path', () => {
    const all = [...FLAGSHIP_SLUGS, ...ARCHIVE_SLUGS];
    expect(new Set(all).size).toBe(all.length);
    for (const slug of FLAGSHIP_SLUGS) expect(classifyProject(slug)).toBe('flagship');
    for (const slug of ARCHIVE_SLUGS) expect(classifyProject(slug)).toBe('archive');
  });

  it('keeps every approved project as factual MDX with no duplicate page-level h1', () => {
    for (const slug of APPROVED_PROJECT_SLUGS) {
      const source = readFileSync(new URL(`../../src/content/projects/${slug}.mdx`, import.meta.url), 'utf8');
      expect(source).toContain(`slug: ${slug}`);
      expect(source).toMatch(/publishable:\s+true/);
      expect(source).not.toMatch(/^#\s+/m);
    }
  });

  it('visits each flagship once before wrapping', () => {
    expect(resolveFlagshipCycle('xero-dev', FLAGSHIP_SLUGS.length + 1)).toEqual([
      ...FLAGSHIP_SLUGS,
      'xero-dev',
    ]);
  });
});

describe('archive filters', () => {
  it('combines search, type, technology, year, and status deterministically', () => {
    expect(filterArchiveRecords(fixtureRecords, { query: 'terminal', technology: 'Rust', status: 'active' }).map((item) => item.slug)).toEqual(['fictional-terminal']);
    expect(filterArchiveRecords(fixtureRecords, { type: 'configuration', year: '2024' }).map((item) => item.slug)).toEqual(['fictional-config']);
  });

  it('returns an empty list for a real no-results combination', () => {
    expect(filterArchiveRecords(fixtureRecords, { query: 'does-not-exist' })).toEqual([]);
  });
});
