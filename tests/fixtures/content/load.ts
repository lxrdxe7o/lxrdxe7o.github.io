import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

/** Directory of the content fixtures, resolved relative to this file. */
const fixturesDir = fileURLToPath(new URL('.', import.meta.url));

/** Split a raw MDX/Markdown string into its YAML frontmatter and body. */
export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    throw new Error('Fixture is missing a frontmatter block');
  }
  return { frontmatter: match[1], body: match[2] };
}

/** Read a fixture file (path relative to tests/fixtures/content) and return parsed frontmatter data. */
export function loadFixtureData(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(`${fixturesDir}/${relativePath}`, 'utf8');
  const { frontmatter } = splitFrontmatter(raw);
  const data = parseYaml(frontmatter) as Record<string, unknown>;
  return data;
}

/** Convenience: load a fixture as an `{ id, data }` collection-entry-like object. */
export function loadFixtureEntry<T = Record<string, unknown>>(
  relativePath: string,
): { id: string; data: T } {
  const data = loadFixtureData(relativePath) as unknown as T;
  const id = relativePath.replace(/\.(md|mdx)$/i, '');
  return { id, data };
}
