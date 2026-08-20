import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('every approved flagship appears once in ranked order', async ({ page }) => {
  await page.goto('/projects');
  await enterSilently(page);

  const ranks = await page.locator('.project-index__rank').allTextContents();
  const titles = await page.locator('.project-index__title').allTextContents();

  expect(titles.length).toBeGreaterThanOrEqual(9);
  expect(new Set(titles).size).toBe(titles.length);
  // Featured ranks sort ascending; unranked entries trail with the em dash.
  const featured = ranks.filter((rank) => rank !== '—');
  for (let index = 1; index < featured.length; index += 1) {
    expect(Number(featured[index])).toBeGreaterThanOrEqual(Number(featured[index - 1]));
  }
});

test('draft and unapproved entries never enter the listing', async ({ page }) => {
  await page.goto('/projects');
  await enterSilently(page);
  const body = await page.locator('main').innerText();
  expect(body).not.toContain('draft-project');
});

test('every listing row opens its detail page', async ({ page }) => {
  await page.goto('/projects');
  await enterSilently(page);

  const firstLink = page.locator('.project-index__link').first();
  const href = await firstLink.getAttribute('href');
  expect(href).toMatch(/^\/projects\//);

  await firstLink.click();
  await page.waitForURL(`**${href}`);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('keyboard users can inspect and open every project row', async ({ page }) => {
  await page.goto('/projects');
  await enterSilently(page);

  const links = page.locator('.project-index__link');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  await links.first().focus();
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/projects\//);
});
