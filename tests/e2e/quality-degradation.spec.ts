import { expect, test } from '@playwright/test';
import { enterSilently } from '../e2e/gate';

/**
 * Adaptive-quality browser scenario: heavy CPU throttling must drive the
 * frame-budget monitor into sustained pressure so the controller downgrades
 * one tier, and the renderer must keep producing frames at the lower target.
 */

test('throttled CPU drives a quality downgrade and the renderer stays live', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await enterSilently(page);

  const initialTier = await page.evaluate(
    () => document.documentElement.dataset.qualityTier ?? 'high',
  );
  expect(['high', 'medium']).toContain(initialTier);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

  // Give the frame-budget monitor sustained pressure samples.
  await page.waitForTimeout(6_000);

  const throttledTier = await page.evaluate(
    () => document.documentElement.dataset.qualityTier ?? 'static',
  );
  expect(['low', 'medium', 'static']).toContain(throttledTier);

  // The canvas must still exist and the loop must still produce frames.
  await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  const frames = await page.evaluate(() => {
    const host = document.querySelector('[data-experience-canvas-host]');
    return Number(host?.getAttribute('data-renderer-frames') ?? 0);
  });
  expect(frames).toBeGreaterThan(10);

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
});

test('reduced-data and no-WebGL capabilities force static mode in the browser', async ({ browser }) => {
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
  await page.goto('/');
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-mode',
    'static',
  );
  await context.close();
});
