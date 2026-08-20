import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepositoryEvidence } from '../../src/types/audit';

// The dataset builder lives in scripts/audit and imports fetchGitHubRepositories;
// test the allowlist logic via a lightweight local module import.
import { buildPublicRepositoryDataset } from '../../scripts/audit/build-public-repo-dataset';

const SAMPLE_REPOS: RepositoryEvidence[] = [
  {
    name: 'xero-dev',
    fullName: 'lxrdxe7o/xero-dev',
    sourceUrl: 'https://github.com/lxrdxe7o/xero-dev',
    visibility: 'public',
    description: 'Blog platform',
    languages: ['TypeScript'],
    topics: ['nextjs', 'blog'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-01-01T00:00:00Z',
    stars: 5,
    forks: 0,
    isFork: false,
    isArchived: false,
    license: 'MIT',
    homepageUrl: 'https://xero.example',
    hasDocumentation: true,
    hasScreenshots: true,
  },
  {
    name: 'private-tool',
    fullName: 'lxrdxe7o/private-tool',
    sourceUrl: 'https://github.com/lxrdxe7o/private-tool',
    visibility: 'private',
    description: 'Secret',
    languages: ['Python'],
    topics: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-01-01T00:00:00Z',
    stars: 0,
    forks: 0,
    isFork: false,
    isArchived: false,
    license: null,
    homepageUrl: null,
    hasDocumentation: false,
    hasScreenshots: false,
  },
  {
    name: 'forked-thing',
    fullName: 'lxrdxe7o/forked-thing',
    sourceUrl: 'https://github.com/lxrdxe7o/forked-thing',
    visibility: 'public',
    description: 'Fork',
    languages: ['JavaScript'],
    topics: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-01-01T00:00:00Z',
    stars: 1,
    forks: 0,
    isFork: true,
    isArchived: false,
    license: null,
    homepageUrl: null,
    hasDocumentation: false,
    hasScreenshots: false,
  },
];

const hoisted = vi.hoisted(() => ({ SAMPLE_REPOS: [] as RepositoryEvidence[] }));

vi.mock('../../scripts/audit/github-profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../scripts/audit/github-profile')>();
  return {
    ...actual,
    fetchGitHubRepositories: vi.fn(async () => hoisted.SAMPLE_REPOS),
  };
});

beforeEach(() => {
  hoisted.SAMPLE_REPOS = SAMPLE_REPOS;
});

describe('public repository dataset', () => {
  it('excludes private repositories and forks', async () => {
    const dataset = await buildPublicRepositoryDataset('lxrdxe7o', '2026-08-16T00:00:00.000Z');
    const names = dataset.repositories.map((entry) => entry.name);
    expect(names).toContain('xero-dev');
    expect(names).not.toContain('private-tool');
    expect(names).not.toContain('forked-thing');
  });

  it('keeps only the allowlisted public fields', async () => {
    const dataset = await buildPublicRepositoryDataset('lxrdxe7o', '2026-08-16T00:00:00.000Z');
    const entry = dataset.repositories.find((item) => item.name === 'xero-dev');
    expect(entry).toMatchObject({
      language: 'TypeScript',
      topics: ['nextjs', 'blog'],
      stars: 5,
      archived: false,
      homepageUrl: 'https://xero.example',
    });
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      'archived',
      'createdAt',
      'homepageUrl',
      'language',
      'name',
      'stars',
      'topics',
      'updatedAt',
    ]);
  });

  it('is deterministic for identical evidence', async () => {
    const first = await buildPublicRepositoryDataset('lxrdxe7o', '2026-08-16T00:00:00.000Z');
    const second = await buildPublicRepositoryDataset('lxrdxe7o', '2026-08-16T00:00:00.000Z');
    expect(first).toEqual(second);
  });
});
