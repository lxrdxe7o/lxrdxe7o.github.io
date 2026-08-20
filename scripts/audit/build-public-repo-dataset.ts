import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { RepositoryEvidence } from '../../src/types/audit.ts';
import { fetchGitHubRepositories } from './github-profile.ts';

/**
 * Builds the public repository dataset consumed by Lab experiments. The
 * dataset is a versioned static JSON file: Lab never performs a visitor-time
 * GitHub request. Only an explicit allowlist of fields is kept — nothing
 * private, identifying, or irrelevant is committed.
 */

const ALLOWED_LANGUAGE_PATTERN = /^[A-Za-z0-9+#.\- ]{1,32}$/;

interface RepositoryDatasetEntry {
  name: string;
  language: string | null;
  topics: readonly string[];
  createdAt: string;
  updatedAt: string;
  stars: number;
  archived: boolean;
  homepageUrl: string | null;
}

interface RepositoryDataset {
  schemaVersion: number;
  generatedAt: string;
  source: string;
  repositories: readonly RepositoryDatasetEntry[];
}

const allowlistedField = <T,>(value: T): T | null =>
  typeof value === 'string' && value.length > 200 ? null : value;

function toDatasetEntry(repo: RepositoryEvidence): RepositoryDatasetEntry | null {
  if (repo.visibility !== 'public') return null;
  if (repo.isFork) return null;

  const language = repo.languages[0] ?? null;
  if (language && !ALLOWED_LANGUAGE_PATTERN.test(language)) return null;

  return {
    name: allowlistedField(repo.name) ?? repo.name,
    language,
    topics: repo.topics.filter((topic) => ALLOWED_LANGUAGE_PATTERN.test(topic)).slice(0, 12),
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    stars: repo.stars,
    archived: repo.isArchived,
    homepageUrl: repo.homepageUrl,
  };
}

export async function buildPublicRepositoryDataset(
  username = 'lxrdxe7o',
  generatedAt = new Date().toISOString(),
): Promise<RepositoryDataset> {
  const repos = await fetchGitHubRepositories(username);
  const entries = repos
    .map(toDatasetEntry)
    .filter((entry): entry is RepositoryDatasetEntry => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    schemaVersion: 1,
    generatedAt,
    source: `GitHub public repositories for ${username}`,
    repositories: Object.freeze(entries),
  };
}

async function main(): Promise<void> {
  const dataset = await buildPublicRepositoryDataset();
  const outDir = resolve(process.cwd(), 'src/data/generated');
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, 'repository-dataset.json'),
    `${JSON.stringify(dataset, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote ${dataset.repositories.length} repository records to src/data/generated/repository-dataset.json`);
}

void main();
