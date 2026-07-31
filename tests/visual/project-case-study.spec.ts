import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`Xero.dev case study has stable ${viewport.name} composition`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/projects/xero-dev');
    await expect(page).toHaveScreenshot(`project-xero-${viewport.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
}
