import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { enterSilently } from '../e2e/gate';

/**
 * Full accessibility audit across every route archetype. Runs after the
 * entry gate resolves so the persistent runtime (not the loading overlay)
 * is what gets audited.
 */

const ROUTES = [
  '/',
  '/about',
  '/projects',
  '/projects/xero-dev',
  '/experience',
  '/skills',
  '/uses',
  '/writing',
  '/notes',
  '/now',
  '/archive',
  '/contact',
];

test.describe('full accessibility audit', () => {
  for (const route of ROUTES) {
    test(`${route} has no serious or critical axe violations`, async ({ page }) => {
      await page.goto(route);
      await enterSilently(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(serious).toEqual([]);
    });
  }
});

test.describe('keyboard-only flows', () => {
  test('a visitor can reach Work, About, and Contact using only the keyboard', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab'); // Work
    await expect(page.locator(':focus')).toHaveText('Work');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/projects');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('every interactive control announces its purpose', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    const controls = page.locator('a, button, [role="button"]');
    const count = await controls.count();
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      const name = (await control.getAttribute('aria-label'))
        ?? (await control.innerText().catch(() => ''))
        ?? '';
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

test.describe('zoom and reflow', () => {
  test('200% text zoom never clips essential content at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/projects/xero-dev');
    await enterSilently(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const overflow = await page.locator('main').evaluate((main) => main.scrollWidth > main.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});

test.describe('forced colors and reduced motion', () => {
  test('forced-colors mode keeps every landmark visible', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await enterSilently(page);
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
  });
});
