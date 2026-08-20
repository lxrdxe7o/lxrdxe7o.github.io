import { test, expect, type Page } from '@playwright/test';
import { enterSilently } from '../e2e/gate';

/**
 * Visual regression coverage for the static shell (Task 6): the persistent
 * header/footer, tokens, and typography that every route inherits before any
 * animation, WebGL, or JavaScript-driven behavior loads.
 *
 * Route archetypes covered: home, a populated listing, an empty listing
 * (proves the shell holds up with no content), and utility pages. There is
 * no case-study or long-form article template yet — those arrive in Tasks
 * 17 and 21 respectively — so this suite does not fabricate placeholder
 * coverage for routes that don't exist.
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const;

const ROUTE_ARCHETYPES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'listing-populated', path: '/projects' },
  { name: 'listing-empty', path: '/notes' },
  { name: 'utility', path: '/contact' },
];

async function gotoAndSettle(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'networkidle' });
  await enterSilently(page);
  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  });
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`${viewportName} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport });

    for (const route of ROUTE_ARCHETYPES) {
      test(`${route.name} shell matches its baseline`, async ({ page }) => {
        await gotoAndSettle(page, route.path);
        await expect(page).toHaveScreenshot(`${route.name}-${viewportName}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}

test('the header keeps a stable height and structure across route archetypes', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  const heights = new Set<number>();

  for (const route of ROUTE_ARCHETYPES) {
    await gotoAndSettle(page, route.path);
    const header = page.locator('.site-header');
    await expect(header.locator('.brand-mark')).toBeVisible();
    await expect(header.locator('.primary-nav__link')).toHaveCount(2);
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    heights.add(Math.round(box!.height));
  }

  // The header must not reflow between routes — one height, regardless of
  // which (if any) primary nav link is showing its aria-current treatment.
  expect(heights.size).toBe(1);
});

test('renders a coherent shell with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: VIEWPORTS.desktop });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'load' });

  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.brand-mark')).toBeVisible();
  await expect(page.locator('.primary-nav__link').first()).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();

  await context.close();
});
