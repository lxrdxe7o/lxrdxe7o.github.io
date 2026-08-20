import { test, expect } from '@playwright/test';

test('Home page renders custom cursor and hero identity', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#custom-cursor')).toBeVisible();
  await expect(page.locator('h1.hero-identity')).toHaveText('lxrdxe7o');
});
