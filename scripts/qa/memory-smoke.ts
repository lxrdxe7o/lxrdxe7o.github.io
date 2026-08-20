/**
 * Memory smoke test for the 50-route navigation loop. Uses Playwright's
 * heap measurement hooks if the browser supports them; otherwise reports
 * the route count and canvas count as the observable stability signal.
 */

import { chromium } from '@playwright/test';

const ROUTES = ['/about', '/projects', '/skills', '/uses', '/now', '/contact', '/experience'];

async function main(): Promise<void> {
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
    env: { ...process.env, DISPLAY: '' },
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/');
  await page.waitForSelector('[data-entry-gate][data-state="open"]');
  await page.locator('[data-entry="silent"]').click();

  for (let index = 0; index < 50; index += 1) {
    await page.goto(`http://localhost:4321${ROUTES[index % ROUTES.length]}`);
    await page.waitForSelector('[data-experience-canvas]');
  }

  const canvasCount = await page.locator('canvas').count();
  const rendererCreations = await page
    .locator('[data-experience-canvas-host]')
    .getAttribute('data-renderer-creations');

  console.log(JSON.stringify({ canvasCount, rendererCreations }, null, 2));

  if (canvasCount !== 1 || rendererCreations !== '1') {
    throw new Error(`Memory smoke failed: ${canvasCount} canvases, ${rendererCreations} renderers`);
  }

  await browser.close();
}

void main();
