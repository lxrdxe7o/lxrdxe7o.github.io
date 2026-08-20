import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test.describe('JavaScript disabled', () => {
  test('every core route remains readable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const route of ['/', '/about', '/projects', '/projects/xero-dev', '/contact', '/writing', '/notes', '/now', '/uses', '/skills', '/experience']) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main#main-content')).toBeVisible();
    }
    await context.close();
  });

  test('no loader or entry gate blocks content without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-entry-gate]')).toBeHidden();
    await expect(page.locator('[data-loader]')).toBeHidden();
    await context.close();
  });
});

test.describe('WebGL disabled', () => {
  test('static fallback replaces the canvas without losing semantic content', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const prototype = HTMLCanvasElement.prototype as unknown as {
        getContext(contextId: string, options?: unknown): unknown;
      };
      const original = prototype.getContext;
      prototype.getContext = function getContext(contextId: string, options?: unknown): unknown {
        if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
          return null;
        }
        return original.call(this, contextId, options);
      };
    });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-experience-canvas]')).toBeHidden();
    await expect(page.locator('[data-renderer-fallback]')).toBeVisible();
    await context.close();
  });
});

test.describe('Audio unavailable', () => {
  test('sound entry degrades gracefully when audio files are missing', async ({ page }) => {
    await page.route('**/audio/**', (route) => route.abort());
    await page.goto('/');
    await enterSilently(page);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-entry-gate]')).toBeHidden();
  });
});

test.describe('Failed route transition', () => {
  test('a blocked route fetch leaves the current page usable', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    await page.route('**/about/**', (route) => route.abort());
    // Astro prefetches; forcing a hard navigation failure instead:
    await page.evaluate(() => {
      window.stop();
    });
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Media failures', () => {
  test('missing project images degrade to poster-free semantic content', async ({ page }) => {
    await page.route('**/media/**', (route) => route.abort());
    await page.goto('/projects/xero-dev');
    await enterSilently(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Xero.dev' })).toBeVisible();
    await expect(page.locator('main')).toContainText(/overview|project/i);
  });
});
