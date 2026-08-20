import { test, expect } from '@playwright/test';

test('Four-corner UI frame is visible on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.corner-frame-top-left')).toBeVisible();
  await expect(page.locator('.corner-frame-top-right')).toBeVisible();
  await expect(page.locator('.corner-frame-bottom-left')).toBeVisible();
  await expect(page.locator('.corner-frame-bottom-right')).toBeVisible();
});
