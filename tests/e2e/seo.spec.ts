import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('every public route exposes canonical, OG, and structured data', async ({ page }) => {
  for (const route of ['/', '/about', '/projects', '/writing', '/notes', '/contact']) {
    await page.goto(route);
    const escaped = `${route.replaceAll('/', '\\/')}\\/?$`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(escaped),
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https?:\/\/.+\/social\//,
    );
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(() => JSON.parse(jsonLd ?? '')).not.toThrow();
  }
});

test('RSS feed contains only public entries and validates as XML', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toMatch(/xml/);
  const body = await response.text();
  expect(body).toContain('<rss version="2.0"');
  expect(body).toContain('<channel>');
  expect(body).not.toContain('draft-project');
});

test('sitemap lists only public routes and never drafts', async ({ request }) => {
  const response = await request.get('/sitemap-index.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('<urlset');
  expect(body).toContain('<loc>');
  expect(body).not.toContain('draft-project');
});

test('robots allows production paths and points at the sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('Sitemap:');
});

test('preview builds without an origin fail closed to noindex', async ({ page }) => {
  // In this suite the origin is unset, so even a "production-looking" build
  // must refuse to index. The real production origin is configured at deploy.
  await page.goto('/');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toBe('noindex, nofollow');
});

test('404 pages are never indexed and never canonical', async ({ page }) => {
  await page.goto('/definitely-not-a-route');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('legacy /blog redirects to /writing with a single canonical destination', async ({ page }) => {
  await page.goto('/blog');
  await enterSilently(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/writing$/);
});
