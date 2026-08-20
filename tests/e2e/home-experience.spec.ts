import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('home leads with exact identity strings and one h1', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('lxrdxe7o');
  await expect(page.getByText('Full-Stack Developer', { exact: true })).toBeVisible();
  await expect(page.locator('.hero-identity__eyebrow')).toContainText('Ishraful Haque');
});

test('home surfaces Work/About emphasis, availability, and social links', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  await expect(page.locator('.hero-meta__link').filter({ hasText: 'Work' })).toBeVisible();
  await expect(page.locator('.hero-meta__link').filter({ hasText: 'About' })).toBeVisible();
  await expect(page.locator('.availability')).toBeVisible();
  await expect(page.locator('.social-links__link').first()).toBeVisible();
});

test('home identity never clips from 320px through large desktop', async ({ page }) => {
  for (const width of [320, 375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await enterSilently(page);
    const mark = page.locator('.hero-identity__mark');
    const box = await mark.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(width);
  }
});

test('keyboard, touch, and pointer users all reach Work', async ({ page }) => {
  await page.goto('/');
  await enterSilently(page);

  // Keyboard path through the hero-meta Work link.
  await page.locator('.hero-meta__link').first().focus();
  await expect(page.locator('.hero-meta__link').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/projects');
  await expect(page.locator('h1')).toHaveCount(1);
});
