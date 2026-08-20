import { test, expect } from '@playwright/test';

test('BaseLayout contains proper semantic HTML shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toBeVisible();
});
