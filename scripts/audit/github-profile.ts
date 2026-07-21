import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RepositoryEvidence } from '../../src/types/audit';
import { formatReportMarkdown, generateAuditReport } from './content-gap-report';

interface RawGitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  language: string | null;
  topics?: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count?: number;
  forks_count?: number;
  fork?: boolean;
  archived?: boolean;
  license?: { spdx_id?: string; name?: string } | null;
  homepage?: string | null;
}

export async function fetchGitHubRepositories(username: string): Promise<RepositoryEvidence[]> {
  const url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
  const headers: Record<string, string> = {
    'User-Agent': 'Portfolio-Audit-Script',
    Accept: 'application/vnd.github.v3+json',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }
    const rawRepos = (await response.json()) as RawGitHubRepo[];


    return rawRepos.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      sourceUrl: repo.html_url,
      visibility: repo.private ? 'private' : 'public',
      description: repo.description || null,
      languages: repo.language ? [repo.language] : [],
      topics: repo.topics || [],
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      isFork: repo.fork || false,
      isArchived: repo.archived || false,
      license: repo.license ? repo.license.spdx_id || repo.license.name : null,
      homepageUrl: repo.homepage && repo.homepage.trim() !== '' ? repo.homepage : null,
      hasDocumentation: true,
      hasScreenshots: Boolean(repo.homepage || repo.description?.includes('http')),
    }));
  } catch (error) {
    console.warn(`[Audit] Could not fetch live GitHub repos for ${username}: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

export async function runAudit(username = 'lxrdxe7o') {
  console.log(`[Audit] Fetching public repository evidence for ${username}...`);
  const repos = await fetchGitHubRepositories(username);

  const rootDir = process.cwd();
  const sourceDir = path.join(rootDir, 'artifacts', 'audit', 'source');
  const reportDir = path.join(rootDir, 'artifacts', 'audit', 'reports');

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const rawPath = path.join(sourceDir, 'github-repos.json');
  fs.writeFileSync(rawPath, JSON.stringify(repos, null, 2));
  console.log(`[Audit] Saved raw evidence cache to ${rawPath}`);

  const userApprovedFlagships = [
    'xero-dev',
    'krakenvim',
    'hachi',
    'mikeneko',
    'shiro-nekoo-115',
    'deaddrop',
    'dotfiles',
    'tora-neko-311',
    'kuro-nekoo-215',
  ];
  const report = generateAuditReport(username, repos, userApprovedFlagships);

  const markdown = formatReportMarkdown(report);

  const reportPath = path.join(reportDir, 'portfolio-audit.md');
  fs.writeFileSync(reportPath, markdown);
  console.log(`[Audit] Saved portfolio audit report to ${reportPath}`);

  return { report, markdown, reportPath };
}

if (process.argv[1]?.endsWith('github-profile.ts') || process.argv[1]?.endsWith('github-profile.js')) {
  runAudit().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
