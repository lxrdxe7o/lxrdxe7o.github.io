import { describe, expect, it } from 'vitest';
import type { RepositoryEvidence } from '../../src/types/audit';
import { generateAuditReport } from '../../scripts/audit/content-gap-report';

describe('Project Audit Pipeline Integration', () => {
  const sampleRepos: RepositoryEvidence[] = [
    {
      name: 'portfolio-v3',
      fullName: 'lxrdxe7o/portfolio-v3',
      sourceUrl: 'https://github.com/lxrdxe7o/portfolio-v3',
      visibility: 'public',
      description: 'Creative portfolio with WebGL and Astro',
      languages: ['TypeScript', 'Astro', 'GLSL'],
      topics: ['portfolio', 'threejs', 'webgl'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      pushedAt: '2026-07-01T00:00:00Z',
      stars: 15,
      forks: 3,
      isFork: false,
      isArchived: false,
      license: 'MIT',
      homepageUrl: 'https://lxrdxe7o.me',
      hasDocumentation: true,
      hasScreenshots: true,
    },
    {
      name: 'cli-tool',
      fullName: 'lxrdxe7o/cli-tool',
      sourceUrl: 'https://github.com/lxrdxe7o/cli-tool',
      visibility: 'public',
      description: 'Developer productivity CLI utility',
      languages: ['Rust', 'Shell'],
      topics: ['cli', 'productivity'],
      createdAt: '2024-05-01T00:00:00Z',
      updatedAt: '2025-10-01T00:00:00Z',
      pushedAt: '2025-10-01T00:00:00Z',
      stars: 5,
      forks: 0,
      isFork: false,
      isArchived: false,
      license: 'MIT',
      homepageUrl: null,
      hasDocumentation: true,
      hasScreenshots: false,
    },
    {
      name: 'old-experiment',
      fullName: 'lxrdxe7o/old-experiment',
      sourceUrl: 'https://github.com/lxrdxe7o/old-experiment',
      visibility: 'public',
      description: 'An old exploratory repo',
      languages: ['JavaScript'],
      topics: [],
      createdAt: '2022-01-01T00:00:00Z',
      updatedAt: '2022-05-01T00:00:00Z',
      pushedAt: '2022-05-01T00:00:00Z',
      stars: 0,
      forks: 0,
      isFork: false,
      isArchived: true,
      license: null,
      homepageUrl: null,
      hasDocumentation: false,
      hasScreenshots: false,
    },
  ];

  it('generates a structured audit report with flagship, archive, and excluded categories', () => {
    const report = generateAuditReport('lxrdxe7o', sampleRepos);

    expect(report.username).toBe('lxrdxe7o');
    expect(report.totalRepositoriesAudited).toBe(3);
    expect(report.flagshipCandidates.length).toBeGreaterThan(0);
    expect(report.flagshipCandidates[0].slug).toBe('portfolio-v3');
    expect(report.flagshipCandidates[0].proposedOrder).toBe(1);
    expect(report.archiveCandidates.length).toBeGreaterThan(0);
  });

  it('identifies missing user facts and media production needs', () => {
    const report = generateAuditReport('lxrdxe7o', sampleRepos);

    expect(report.missingUserFacts.length).toBeGreaterThan(0);
    expect(report.mediaProductionNeeds.length).toBeGreaterThan(0);
  });
});
