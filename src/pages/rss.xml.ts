import type { APIRoute } from 'astro';
import { getWriting } from '../lib/content/getWriting';
import { getNotes } from '../lib/content/getNotes';
import { absoluteUrl, SITE_DESCRIPTION, SITE_TITLE } from '../lib/seo/metadata';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
  const writing = await getWriting({ includeDrafts: false });
  const notes = await getNotes({ includeDrafts: false });

  const writingItems = writing
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      link: absoluteUrl(`/writing/${entry.data.slug}`),
      publishedAt: entry.data.publishDate,
      updatedAt: entry.data.updatedDate,
    }))
    .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());

  const noteItems = notes
    .map((entry) => ({
      title: entry.data.title,
      description: `Note: ${entry.data.title}`,
      link: absoluteUrl(`/notes/${entry.data.slug}`),
      publishedAt: entry.data.date,
    }))
    .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());

  const items = [...writingItems, ...noteItems]
    .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime())
    .slice(0, 30);

  const channel = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `<channel>`,
    `<title>${escapeXml(SITE_TITLE)}</title>`,
    `<link>${escapeXml(absoluteUrl('/'))}</link>`,
    `<description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    `<atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />`,
    ...items.map((item) => {
      const updated = 'updatedAt' in item && item.updatedAt
        ? `<lastBuildDate>${item.updatedAt.toUTCString()}</lastBuildDate>`
        : '';
      return [
        `<item>`,
        `<title>${escapeXml(item.title)}</title>`,
        `<link>${escapeXml(item.link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
        `<pubDate>${item.publishedAt.toUTCString()}</pubDate>`,
        `<description>${escapeXml(item.description)}</description>`,
        updated,
        `</item>`,
      ].filter(Boolean).join('');
    }),
    `</channel>`,
    `</rss>`,
  ].join('\n');

  return new Response(channel, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
