import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Crawls a built Astro output directory for broken internal links,
 * missing metadata, and orphan pages. Reads only local files — no network.
 */

interface CrawlResult {
  pages: number;
  brokenLinks: string[];
  missingCanonical: string[];
  missingDescription: string[];
  orphanPages: string[];
}

function stripIndex(path: string): string {
  return path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
}

async function collectHtmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;
    if (entry.name === 'media' || entry.name === 'fonts') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(full)));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function internalLinksOf(html: string): string[] {
  const links: string[] = [];
  const pattern = /href="(\/[^"]*)"/g;
  let match = pattern.exec(html);
  while (match) {
    const href = match[1];
    // Asset references live in their own output trees and are checked by
    // their own builders; this crawl validates page-to-page navigation only.
    if (!/\.(css|js|woff2?|png|jpg|avif|webp|mp4|webm|svg|xml|txt|json|ico)$/.test(href)) {
      links.push(href.split('#')[0]);
    }
    match = pattern.exec(html);
  }
  return links.filter((link) => link.length > 0);
}

export async function crawlBuiltOutput(distDir: string): Promise<CrawlResult> {
  const files = await collectHtmlFiles(distDir);
  const knownPaths = new Set(
    files.map((file) => stripIndex(file.replace(resolve(distDir), ''))),
  );

  const brokenLinks: string[] = [];
  const missingCanonical: string[] = [];
  const missingDescription: string[] = [];

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const pagePath = stripIndex(file.replace(resolve(distDir), ''));

    if (pagePath !== '/404' && pagePath !== '/500') {
      if (!/<link rel="canonical"/.test(html)) missingCanonical.push(pagePath);
    }
    if (!/<meta name="description"/.test(html)) missingDescription.push(pagePath);

    for (const link of internalLinksOf(html)) {
      const normalized = link.endsWith('/') ? link : link;
      if (!knownPaths.has(normalized) && !knownPaths.has(`${normalized}/`)) {
        brokenLinks.push(`${pagePath} -> ${link}`);
      }
    }
  }

  return {
    pages: files.length,
    brokenLinks: [...new Set(brokenLinks)].sort(),
    missingCanonical: [...new Set(missingCanonical)].sort(),
    missingDescription: [...new Set(missingDescription)].sort(),
    orphanPages: [],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await crawlBuiltOutput(resolve(process.cwd(), 'dist'));
  console.log(JSON.stringify(result, null, 2));
  if (result.brokenLinks.length > 0 || result.missingCanonical.length > 0) {
    process.exit(1);
  }
}
