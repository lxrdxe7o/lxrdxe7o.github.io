import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { enterSilently } from '../e2e/gate';

test('the open Index has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);
  await page.locator('[data-index-open]').click();

  const results = await new AxeBuilder({ page })
    .include('[data-site-index]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('the Index background cannot receive pointer interaction while open', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);
  await page.locator('[data-index-open]').click();

  const overlayBlocks = await page.evaluate(() => {
    const index = document.querySelector('[data-site-index]');
    if (!index) return false;
    const rect = index.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && index.contains(document.elementFromPoint(rect.left + 5, rect.top + 5));
  });
  expect(overlayBlocks).toBe(true);
});

test('Tab stays inside the open Index', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);
  await page.locator('[data-index-open]').click();

  const focusables = page.locator('[data-site-index] a[href], [data-site-index] button');
  const count = await focusables.count();
  expect(count).toBeGreaterThan(0);

  // Cycle well past the end and confirm focus stays within the dialog.
  for (let index = 0; index < count + 2; index += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && document.querySelector('[data-site-index]')?.contains(active) === true;
    });
    expect(inside).toBe(true);
  }
});
