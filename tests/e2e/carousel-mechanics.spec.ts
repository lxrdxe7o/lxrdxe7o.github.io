import { test, expect } from '@playwright/test';

test('Project index hijacks scroll to cycle through projects', async ({ page }) => {
  await page.goto('/projects');
  
  const carousel = page.locator('#work-carousel');
  await expect(carousel).toBeVisible();
  
  // Verify body is not scrollable normally
  const overflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
  expect(overflow).toBe('hidden');
});
