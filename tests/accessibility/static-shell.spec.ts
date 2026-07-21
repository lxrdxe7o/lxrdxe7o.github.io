import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const routes = [
  '/',
  '/about',
  '/projects',
  '/experience',
  '/skills',
  '/uses',
  '/notes',
  '/now',
  '/contact',
  '/blog'
];

for (const route of routes) {
  test(`Route ${route} should not have any automatically detectable accessibility issues`, async ({ page }) => {
    await page.goto(route);
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
