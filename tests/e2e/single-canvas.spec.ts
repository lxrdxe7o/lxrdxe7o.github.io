import { expect, test } from '@playwright/test';

test('Astro route changes preserve one canvas and one renderer instance', async ({ page }) => {
  await page.goto('/');

  const canvas = page.locator('[data-experience-canvas]');
  const host = page.locator('[data-experience-canvas-host]');
  await expect(canvas).toHaveCount(1);
  await expect(host).toHaveAttribute('data-renderer-attempts', '1');
  await expect(host).toHaveAttribute('data-renderer-creations', '1');

  const identity = await canvas.evaluate((element) => {
    const value = `canvas-${crypto.randomUUID()}`;
    element.setAttribute('data-test-identity', value);
    return value;
  });

  await page.locator('a[href="/about"]').first().click();
  await page.waitForURL('**/about');
  await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toHaveAttribute(
    'data-test-identity',
    identity,
  );
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );

  await page.locator('a[href="/projects"]').first().click();
  await page.waitForURL('**/projects');
  await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toHaveAttribute(
    'data-test-identity',
    identity,
  );
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );
});

test('no-WebGL browsers retain semantic content and expose the static fallback', async ({ page }) => {
  await page.addInitScript(() => {
    type CanvasPrototype = {
      getContext(contextId: string, options?: unknown): unknown;
    };
    const prototype = HTMLCanvasElement.prototype as unknown as CanvasPrototype;
    const original = prototype.getContext;
    prototype.getContext = function getContext(contextId: string, options?: unknown): unknown {
      if (
        contextId === 'webgl' ||
        contextId === 'webgl2' ||
        contextId === 'experimental-webgl'
      ) {
        return null;
      }
      return original.call(this, contextId, options);
    };
  });

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas]')).toBeHidden();
  await expect(page.locator('[data-renderer-fallback]')).toBeVisible();
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-mode',
    'static',
  );
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-attempts',
    '0',
  );
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '0',
  );
});
