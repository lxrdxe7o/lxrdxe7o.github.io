import { expect, test } from '@playwright/test';

/**
 * Security boundary checks for the static deployment: headers are configured
 * in vercel.json/netlify.toml, so this suite validates the config files and
 * every outbound link policy rather than requiring a live hosted preview.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();

test('header configuration is restrictive and fails closed', () => {
  const vercel = JSON.parse(
    readFileSync(resolve(workspaceRoot, 'vercel.json'), 'utf8'),
  ) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const headers = Object.fromEntries(
    vercel.headers.flatMap((block) => block.headers.map((h) => [h.key, h.value])),
  );

  expect(headers['X-Frame-Options']).toBe('DENY');
  expect(headers['X-Content-Type-Options']).toBe('nosniff');
  expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
  expect(headers['Content-Security-Policy']).toContain('object-src \'none\'');
  expect(headers['Content-Security-Policy']).toContain('frame-ancestors \'none\'');
  expect(headers['Permissions-Policy']).toContain('microphone=()');
});

test('external links carry safe rel values', async ({ page }) => {
  await page.goto('/contact');
  const external = page.locator('a[target="_blank"]');
  const count = await external.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const rel = await external.nth(index).getAttribute('rel');
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  }
});

test('no page embeds third-party frames or scripts', async ({ request }) => {
  for (const route of ['/', '/about', '/projects', '/contact']) {
    const response = await request.get(route);
    const html = await response.text();
    expect(html).not.toMatch(/<iframe/);
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\/(?!localhost)/);
  }
});

test('contact uses only https or mailto schemes', async ({ page }) => {
  await page.goto('/contact');
  const links = page.locator('main a[href]');
  const count = await links.count();
  for (let index = 0; index < count; index += 1) {
    const href = (await links.nth(index).getAttribute('href')) ?? '';
    expect(href).toMatch(/^(https:\/\/|mailto:|\/)/);
  }
});
