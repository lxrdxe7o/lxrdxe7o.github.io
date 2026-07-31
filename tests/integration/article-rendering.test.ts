import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { stableHeadingId, filterRelatedEditorialEntries } from '../../src/data/editorial';

const fixtureEntries = [
  { slug: 'fictional-current', draft: false, tags: ['Astro', 'CSS'] },
  { slug: 'fictional-related', draft: false, tags: ['CSS'] },
  { slug: 'fictional-draft', draft: true, tags: ['CSS'] },
  { slug: 'fictional-unrelated', draft: false, tags: ['Rust'] },
];

describe('article rendering helpers', () => {
  it('generates stable, normalized heading IDs', () => {
    expect(stableHeadingId('Code, Media & Accessibility')).toBe('code-media-accessibility');
    expect(stableHeadingId('  Code   Media  ')).toBe('code-media');
    expect(stableHeadingId('Code Media')).toBe('code-media');
  });

  it('filters drafts, the current entry, and unrelated content', () => {
    expect(filterRelatedEditorialEntries(fixtureEntries, 'fictional-current', ['CSS']).map((entry) => entry.slug)).toEqual(['fictional-related']);
    expect(filterRelatedEditorialEntries(fixtureEntries, 'fictional-current', undefined)).toEqual([]);
  });

  it('keeps code overflow, copy semantics, reduced motion, and print rules in source', () => {
    const code = readFileSync(new URL('../../src/components/content/CodeBlock.astro', import.meta.url), 'utf8');
    const layout = readFileSync(new URL('../../src/layouts/ArticleLayout.astro', import.meta.url), 'utf8');
    expect(code).toMatch(/overflow-x:\s*auto/);
    expect(code).toMatch(/navigator\.clipboard/);
    expect(code).toMatch(/aria-live/);
    expect(layout).toMatch(/@media print/);
    expect(layout).toMatch(/prefers-reduced-motion/);
  });
});
