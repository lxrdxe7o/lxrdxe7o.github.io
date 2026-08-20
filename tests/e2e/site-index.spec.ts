import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('the Index opens from anywhere and exposes the complete route map', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await page.locator('[data-index-open]').click();
  const index = page.locator('[data-site-index]');
  await expect(index).toBeVisible();
  await expect(index).toHaveAttribute('data-state', 'open');
  await expect(index.getByRole('dialog')).toHaveCount(0); // role lives on the container

  const routes = ['Work', 'About', 'Experience', 'Skills', 'Uses', 'Writing', 'Notes', 'Now', 'Contact'];
  for (const route of routes) {
    await expect(index.getByRole('link', { name: route, exact: true })).toBeVisible();
  }
});

test('Escape closes the Index and restores focus to the opener', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await page.locator('[data-index-open]').click();
  await page.keyboard.press('Escape');

  await expect(page.locator('[data-site-index]')).toBeHidden();
  await expect(page.locator('[data-index-open]')).toBeFocused();
});

test('backdrop click closes the Index without trapping the visitor', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await page.locator('[data-index-open]').click();
  await page.locator('[data-site-index]').click({ position: { x: 5, y: 5 } });

  await expect(page.locator('[data-site-index]')).toBeHidden();
});

test('Index navigation commits through the same route controller', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await page.locator('[data-index-open]').click();
  await page.locator('[data-site-index] a[href="/experience"]').click();
  await page.waitForURL('**/experience');

  await expect(page.locator('[data-site-index]')).toBeHidden();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );
});
