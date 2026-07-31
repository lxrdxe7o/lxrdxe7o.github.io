import { expect, test } from '@playwright/test';

test('archive ships a complete server-rendered list without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/archive');
  await expect(page.locator('[data-archive-item]')).toHaveCount(9);
  await expect(page.getByRole('link', { name: /surfacepro7 drivers/i })).toBeVisible();
  await context.close();
});

test('archive filters update URL state and expose a no-results message', async ({ page }) => {
  await page.goto('/archive');
  await page.getByLabel('Search projects').fill('not a published project');
  await expect(page).toHaveURL(/q=not(?:\+|%20)a(?:\+|%20)published(?:\+|%20)project/);
  await expect(page.locator('[data-archive-item]:not([hidden])')).toHaveCount(0);
  await expect(page.getByText(/no projects match/i)).toBeVisible();
});

test('archive restores filter state from the URL', async ({ page }) => {
  await page.goto('/archive?technology=QML');
  await expect(page.getByLabel('Technology')).toHaveValue('QML');
  const visible = page.locator('[data-archive-item]:not([hidden])');
  await expect(visible).toHaveCount(1);
});
