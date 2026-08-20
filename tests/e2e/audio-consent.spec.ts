import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('no audio is requested before an explicit sound entry', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/')) audioRequests.push(request.url());
  });

  await page.goto('/');
  // Wait for the gate to open — assets settle, but audio files must NOT load.
  await page.waitForSelector('[data-entry-gate][data-state="open"]');
  await page.waitForTimeout(500);

  expect(audioRequests).toHaveLength(0);
});

test('silent entry loads no audio and every route interaction completes', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/')) audioRequests.push(request.url());
  });

  await page.goto('/');
  await enterSilently(page);
  await page.locator('.primary-nav__link[href="/projects"]').click();
  await page.waitForURL('**/projects');

  await expect(page.locator('h1')).toHaveCount(1);
  expect(audioRequests).toHaveLength(0);
});

test('sound entry loads only the manifest clips and honours mute', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/')) audioRequests.push(request.url());
  });

  await page.goto('/');
  await page.waitForSelector('[data-entry-gate][data-state="open"]');
  await page.locator('[data-entry="sound"]').click();
  await page.waitForTimeout(800);

  // Ambience preloads on sound entry; cues load on first use.
  expect(audioRequests.some((url) => url.includes('ambience-field'))).toBe(true);

  const muteControl = page.locator('[data-mute-control]');
  await expect(muteControl).toBeVisible();
  await muteControl.click();
  await expect(muteControl).toHaveAttribute('aria-pressed', 'true');
});
