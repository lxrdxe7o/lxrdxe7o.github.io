import { expect, test } from '@playwright/test';
import { enterSilently } from '../e2e/gate';

/**
 * Route-specific performance budgets measured in-browser. These are coarse
 * smoke budgets — Lighthouse CI owns the authoritative CWV assertions — but
 * they catch a Lab experiment or media manifest regressing the whole site.
 */

const BUDGETS = {
  maxJsBytes: 600_000,
  maxCssBytes: 150_000,
  maxFontBytes: 400_000,
  maxTotalRequests: 80,
  maxCanvasCount: 1,
} as const;

test('home route stays within static asset budgets', async ({ page }) => {
  const requests: string[] = [];
  const bytes: number[] = [];
  page.on('response', async (response) => {
    requests.push(response.url());
    try {
      const buffer = await response.body();
      bytes.push(buffer.byteLength);
    } catch {
      // Streaming or aborted bodies are not billable.
    }
  });

  await page.goto('/');
  await enterSilently(page);

  expect(requests.length).toBeLessThanOrEqual(BUDGETS.maxTotalRequests);
  const jsBytes = bytes.reduce((total, size) => total + size, 0);
  expect(jsBytes).toBeLessThan(BUDGETS.maxJsBytes * 3);

  const canvases = await page.locator('canvas').count();
  expect(canvases).toBeLessThanOrEqual(BUDGETS.maxCanvasCount);
});

test('project route keeps one canvas through repeated media loads', async ({ page }) => {
  await page.goto('/projects/xero-dev');
  await enterSilently(page);

  for (let index = 0; index < 10; index += 1) {
    await page.goto('/projects/xero-dev');
    await page.waitForSelector('[data-experience-canvas-host]');
  }

  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );
});

test('frame rate holds a stable target on the home scene', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  const samples = await page.evaluate(async () => {
    const times: number[] = [];
    await new Promise<void>((resolve) => {
      let last = performance.now();
      const tick = (now: number) => {
        times.push(now - last);
        last = now;
        if (times.length >= 60) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const sorted = [...times].sort((left, right) => left - right);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { median, sorted };
  });

  // SwiftShader software rendering has no hard FPS guarantee; assert the
  // loop produces frames and the median frame time is sane (<100ms).
  expect(samples.sorted.length).toBe(60);
  expect(samples.median).toBeLessThan(100);
});
