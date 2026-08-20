import { test, expect } from '@playwright/test';

test('Lab index renders and initializes experiment registry', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.locator('h1')).toHaveText('LABORATORY');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
});
