import type { APIRoute } from 'astro';
import { absoluteUrl, robotsPolicy } from '../lib/seo/metadata';

export const GET: APIRoute = async () => {
  const policy = robotsPolicy('/', {
    production: import.meta.env.PROD,
    originConfigured: import.meta.env.PROD,
  });
  if (policy.startsWith('noindex')) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
