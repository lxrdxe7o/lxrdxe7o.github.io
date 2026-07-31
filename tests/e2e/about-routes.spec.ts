import { expect, test } from '@playwright/test';

for (const route of ['/about', '/experience', '/skills']) {
  test(`${route} has a factual editorial outline`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toContainText(/Ishraful|project|capabilit|evidence/i);
    await expect(page.locator('[class*="progress"], [aria-valuenow]')).toHaveCount(0);
  });
}

test('about omits recognition and collaborators when no approved records exist', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: /recognition/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /collaborators/i })).toHaveCount(0);
});
