import { test, expect } from '@playwright/test';

test('Shell components (header and footer) are present on the homepage', async ({ page }) => {
  await page.goto('/');
  
  // Header
  const header = page.locator('header');
  await expect(header).toBeVisible();
  await expect(header.locator('nav')).toBeVisible();

  // Footer
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();
});
