import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('Lab index shows an honest empty state when nothing is approved', async ({ page }) => {
  await page.goto('/lab');
  await enterSilently(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Experiments' })).toBeVisible();
  await expect(page.getByText(/no experiments are published yet/i)).toBeVisible();
});

test('Lab routes keep one renderer and one canvas across the site', async ({ page }) => {
  await page.goto('/lab');
  await enterSilently(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );

  // And navigating away keeps the same renderer.
  await page.locator('.primary-nav__link[href="/about"]').click();
  await page.waitForURL('**/about');
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );
});

test('Lab static fallback renders without WebGL', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype as unknown as {
      getContext(contextId: string, options?: unknown): unknown;
    };
    const original = prototype.getContext;
    prototype.getContext = function getContext(contextId: string, options?: unknown): unknown {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null;
      return original.call(this, contextId, options);
    };
  });
  await page.goto('/lab');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toBeHidden();
  await context.close();
});
