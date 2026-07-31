import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

for (const route of ['/about', '/experience', '/skills']) {
  test(`${route} has no serious automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });

  test(`${route} remains readable at a 200 percent text scale`, async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const overflows = await page.locator('main').evaluate((main) => main.scrollWidth > main.clientWidth + 1);
    expect(overflows).toBe(false);
  });
}
