import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('contact links have copyable text, safe external behavior, and accessible names', async ({ page }) => {
  await page.goto('/contact');
  const email = page.getByRole('link', { name: /email ishraful haque/i });
  await expect(email).toHaveAttribute('href', 'mailto:ishrak7106@gmail.com');
  await expect(page.getByRole('button', { name: /copy email address/i })).toBeVisible();

  const github = page.getByRole('link', { name: /open github profile/i });
  await expect(github).toHaveAttribute('target', '_blank');
  await expect(github).toHaveAttribute('rel', /noopener/);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});
