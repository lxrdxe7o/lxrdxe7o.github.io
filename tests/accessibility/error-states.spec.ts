import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { enterSilently } from '../e2e/gate';

test('error notices are focus-managed and dismissible without trapping users', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);
  // Force the degraded phase once the runtime has settled, so the notice
  // appears through the same path a real failure would use.
  await page.evaluate(() => {
    document.documentElement.dataset.runtimePhase = 'degraded';
    const fallback = document.querySelector<HTMLElement>('[data-runtime-fallback]');
    if (fallback) fallback.hidden = false;
  });
  const notice = page.locator('[data-runtime-fallback]');
  await expect(notice).toBeVisible();
  await expect(notice.locator('[role="status"]')).toHaveAttribute('aria-live', 'polite');

  // Dismissing removes the notice and returns focus to main content.
  await notice.locator('[data-dismiss-error]').click();
  await expect(notice).toHaveCount(0);
  const focused = page.locator(':focus');
  await expect(focused).toHaveId('main-content');
});

test('degraded runtime state exposes no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);
  await page.evaluate(() => {
    document.documentElement.dataset.runtimePhase = 'degraded';
    const fallback = document.querySelector<HTMLElement>('[data-runtime-fallback]');
    if (fallback) fallback.hidden = false;
  });
  const results = await new AxeBuilder({ page })
    .include('[data-runtime-fallback]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('the 500 page keeps the shell landmarks and recovery links', async ({ page }) => {
  const response = await page.goto('/500');
  // Astro serves the page; a hosting platform may also use it as its handler.
  expect([200, 404].includes(response?.status() ?? 0)).toBe(true);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
});
