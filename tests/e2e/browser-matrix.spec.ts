import { expect, test } from '@playwright/test';

/**
 * Browser-floor matrix: current Chromium (the only engine installed in this
 * environment) covers the shell; Firefox and WebKit projects run where their
 * binaries are available in CI via `npx playwright install --with-deps`.
 */

const ROUTES = ['/', '/about', '/projects', '/contact', '/writing'];

for (const route of ROUTES) {
  test(`${route} renders the persistent shell in Chromium`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('static fallback works when WebGL is unavailable in Chromium', async ({ page }) => {
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype as unknown as {
      getContext(contextId: string, options?: unknown): unknown;
    };
    const original = prototype.getContext;
    prototype.getContext = function getContext(contextId: string, options?: unknown): unknown {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) {
        return null;
      }
      return original.call(this, contextId, options);
    };
  });
  await page.goto('/');
  await expect(page.locator('[data-experience-canvas]')).toBeHidden();
  await expect(page.locator('[data-renderer-fallback]')).toBeVisible();
});
