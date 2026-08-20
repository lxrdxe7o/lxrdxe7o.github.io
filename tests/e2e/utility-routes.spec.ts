import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

for (const route of ['/uses', '/now', '/archive', '/contact']) {
  test(`${route} is useful without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await context.close();
  });
}

test('Uses and Now display maintenance dates', async ({ page }) => {
  for (const route of ['/uses', '/now']) {
    await page.goto(route);
    await enterSilently(page);
    await expect(page.locator('time[data-reviewed-at]')).toBeVisible();
  }
});

test('Contact exposes direct email and GitHub paths without a form', async ({ page }) => {
  await page.goto('/contact');
  await enterSilently(page);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  await expect(
    page.locator('a[href="https://github.com/lxrdxe7o"]', { hasText: 'github.com/lxrdxe7o' }),
  ).toBeVisible();
});
