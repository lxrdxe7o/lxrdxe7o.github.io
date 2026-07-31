import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

for (const route of ['/writing', '/notes']) {
  test(`${route} index has a valid outline and no serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
}

test('article anchors are keyboard focusable when article source is available', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('main')).toHaveAttribute('id', 'main-content');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});
