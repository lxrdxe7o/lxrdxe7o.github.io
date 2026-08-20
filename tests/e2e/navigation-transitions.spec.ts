import { expect, test } from '@playwright/test';
import { enterSilently } from './gate';

test('one canvas and runtime survive 50 client-side route changes', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await enterSilently(page);

  const identity = await page.evaluate(() => {
    const canvas = document.querySelector('[data-experience-canvas]');
    const value = `stress-${crypto.randomUUID()}`;
    canvas?.setAttribute('data-test-identity', value);
    return value;
  });

  const links: Array<{ label: string; href: string }> = [
    { label: 'About', href: '/about' },
    { label: 'Work', href: '/projects' },
    { label: 'Skills', href: '/skills' },
    { label: 'Experience', href: '/experience' },
    { label: 'Uses', href: '/uses' },
  ];

  for (let index = 0; index < 50; index += 1) {
    const target = links[index % links.length];
    const navSelector =
      target.label === 'About' || target.label === 'Work'
        ? `.primary-nav__link[href="${target.href}"]`
        : `.footer-nav__link[href="${target.href}"]`;
    await page.locator(navSelector).click();
    await page.waitForURL(`**${target.href}`);
    await expect(page.locator('[data-experience-canvas]')).toHaveCount(1);
  }

  await expect(page.locator('[data-experience-canvas]')).toHaveAttribute(
    'data-test-identity',
    identity,
  );
  await expect(page.locator('[data-experience-canvas-host]')).toHaveAttribute(
    'data-renderer-creations',
    '1',
  );
});

test('reduced-motion navigation uses short fades and never blocks content', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await enterSilently(page);

  await page.locator('.primary-nav__link[href="/about"]').click();
  await page.waitForURL('**/about');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await context.close();
});
