import { expect, test } from '@playwright/test';

test('/blog is a native Writing surface with one canonical destination', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/writing$/);
  await expect(page.locator('a[href^="http"]').filter({ hasText: /blog/i })).toHaveCount(0);
});

test('Writing and Notes show polished honest empty states when no approved source exists', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.getByText(/no writing is published yet/i)).toBeVisible();
  await page.goto('/notes');
  await expect(page.getByText(/no notes are published yet/i)).toBeVisible();
});

test('reading surfaces remain printable and avoid horizontal page overflow at 200 percent text', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto('/writing');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.locator('main').evaluate((main) => main.scrollWidth <= main.clientWidth + 1)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('main')).toBeVisible();
});
