import { describe, expect, it } from 'vitest';
import type { RepositoryEvidence } from '../../src/types/audit';
import { scoreAndClassifyRepository, validateFactClaims } from '../../scripts/audit/repository-signals';

describe('Repository Signals & Scoring', () => {
  const baseRepo: RepositoryEvidence = {
    name: 'sample-project',
    fullName: 'lxrdxe7o/sample-project',
    sourceUrl: 'https://github.com/lxrdxe7o/sample-project',
    visibility: 'public',
    description: 'A high quality full-stack web application built with TypeScript',
    languages: ['TypeScript', 'Astro'],
    topics: ['web', 'portfolio'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-01-01T00:00:00Z',
    stars: 10,
    forks: 2,
    isFork: false,
    isArchived: false,
    license: 'MIT',
    homepageUrl: 'https://sample.example.com',
    hasDocumentation: true,
    hasScreenshots: true,
  };

  it('classifies complete non-fork repo with homepage and docs as flagship', () => {
    const result = scoreAndClassifyRepository(baseRepo);
    expect(result.classification).toBe('flagship');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.visualPotential).toBe('high');
  });

  it('classifies archived repositories appropriately', () => {
    const archivedRepo: RepositoryEvidence = {
      ...baseRepo,
      isArchived: true,
    };
    const result = scoreAndClassifyRepository(archivedRepo);
    expect(result.maintenanceState).toBe('archived');
    expect(result.classification).toBe('archive');
  });

  it('excludes forks by default unless high star count and explicit docs exist', () => {
    const forkRepo: RepositoryEvidence = {
      ...baseRepo,
      isFork: true,
      stars: 0,
    };
    const result = scoreAndClassifyRepository(forkRepo);
    expect(result.classification).toBe('excluded');
  });

  it('handles repos with missing descriptions gracefully', () => {
    const noDescRepo: RepositoryEvidence = {
      ...baseRepo,
      description: null,
    };
    const result = scoreAndClassifyRepository(noDescRepo);
    expect(result.contentGaps).toContain('Missing repository description');
  });

  it('blocks unverified metric claims from draft positioning', () => {
    const rawPositioning = 'Used by 1,000,000 users with 99.99% uptime and generated $50k revenue.';
    const { cleanPositioning, blockedClaims } = validateFactClaims(rawPositioning, []);
    expect(blockedClaims.length).toBeGreaterThan(0);
    expect(cleanPositioning).not.toContain('1,000,000 users');
  });

  it('produces deterministic scores for identical input evidence', () => {
    const res1 = scoreAndClassifyRepository(baseRepo);
    const res2 = scoreAndClassifyRepository(baseRepo);
    expect(res1).toEqual(res2);
  });
});
