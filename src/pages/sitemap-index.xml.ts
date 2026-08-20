import type { APIRoute } from 'astro';
import { getProjects } from '../lib/content/getProjects';
import { getWriting } from '../lib/content/getWriting';
import { getNotes } from '../lib/content/getNotes';
import { getExperiments } from '../lib/content/getExperiments';
import { absoluteUrl, robotsPolicy } from '../lib/seo/metadata';

const STATIC_ROUTES: ReadonlyArray<{ path: string; priority: number }> = [
  { path: '/', priority: 1 },
  { path: '/projects', priority: 0.9 },
  { path: '/about', priority: 0.8 },
  { path: '/experience', priority: 0.7 },
  { path: '/skills', priority: 0.7 },
  { path: '/uses', priority: 0.5 },
  { path: '/writing', priority: 0.8 },
  { path: '/notes', priority: 0.6 },
  { path: '/now', priority: 0.5 },
  { path: '/contact', priority: 0.7 },
];

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = async () => {
  const [projects, writing, notes, experiments] = await Promise.all([
    getProjects({ includeDrafts: false }),
    getWriting({ includeDrafts: false }),
    getNotes({ includeDrafts: false }),
    getExperiments({ includeDrafts: false }),
  ]);

  const urls: Array<{ path: string; priority: number; lastmod?: Date }> = [
    ...STATIC_ROUTES.map((route) => ({ ...route })),
    ...projects.map((project) => ({
      path: `/projects/${project.data.slug}`,
      priority: 0.8,
    })),
    ...writing.map((entry) => ({
      path: `/writing/${entry.data.slug}`,
      priority: 0.6,
      lastmod: entry.data.updatedDate ?? entry.data.publishDate,
    })),
    ...notes.map((entry) => ({
      path: `/notes/${entry.data.slug}`,
      priority: 0.5,
      lastmod: entry.data.date,
    })),
    ...experiments.map((entry) => ({
      path: `/lab/${entry.data.slug}`,
      priority: 0.5,
    })),
  ];

  const policy = robotsPolicy('/', {
    production: import.meta.env.PROD,
    originConfigured: import.meta.env.PROD,
  });
  if (policy.startsWith('noindex')) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const entries = urls.map((url) => {
    const lastmod = url.lastmod
      ? `\n    <lastmod>${url.lastmod.toISOString().split('T')[0]}</lastmod>`
      : '';
    return `  <url>
    <loc>${escapeXml(absoluteUrl(url.path))}</loc>${lastmod}
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
