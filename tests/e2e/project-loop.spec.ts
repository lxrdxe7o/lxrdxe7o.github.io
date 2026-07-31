import { expect, test } from '@playwright/test';

test('the complete flagship handoff follows rank and wraps deterministically', async ({ page }) => {
  await page.goto('/projects/xero-dev');
  await expect(page.getByRole('heading', { level: 1, name: 'Xero.dev' })).toBeVisible();
  const firstNext = page.getByRole('link', { name: /next project: krakenvim/i });
  await expect(firstNext).toHaveAttribute('href', '/projects/krakenvim');
  await firstNext.click();

  await expect(page.getByRole('heading', { level: 1, name: 'KrakenVim' })).toBeVisible();
  const secondNext = page.getByRole('link', { name: /next project: hachi/i });
  await expect(secondNext).toHaveAttribute('href', '/projects/hachi');

  await page.goto('/projects/kuro-nekoo-215');
  const wrappedNext = page.getByRole('link', { name: /next project: xero\.dev/i });
  await expect(wrappedNext).toHaveAttribute('href', '/projects/xero-dev');
});

test('project video is controllable, muted, poster-backed, and opt-in loaded', async ({ page }) => {
  await page.goto('/projects/xero-dev');
  const video = page.locator('video').first();
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).toHaveAttribute('muted', '');
  await expect(video).toHaveAttribute('poster', /poster/);
  await expect(video.locator('source')).toHaveCount(0);
  await expect(video).toHaveAttribute('data-video-enhance');
});

test('every project detail keeps one h1 and a contact path', async ({ page }) => {
  await page.goto('/projects/hachi');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /email ishraful haque/i })).toBeVisible();
});
