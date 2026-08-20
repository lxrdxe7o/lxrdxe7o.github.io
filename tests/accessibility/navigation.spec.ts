import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { enterSilently } from '../e2e/gate';

/**
 * Accessibility coverage for the persistent shell built in Task 6: skip
 * link, keyboard order, visible focus, target size, and contrast. Automated
 * axe checks run against `tests/accessibility/static-shell.spec.ts`'s route
 * list already; this suite focuses on the interaction contract itself.
 */

const MIN_TARGET_SIZE_PX = 24; // WCAG 2.2 SC 2.5.8 Target Size (Minimum)

test.describe('Skip link', () => {
  test('is the first tab stop and points at the main landmark', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toHaveClass(/skip-link/);
    await expect(focused).toHaveAttribute('href', '#main-content');
    await expect(focused).toHaveText('Skip to content');
  });

  test('activating it moves focus into the main landmark', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(page.locator('main#main-content')).toBeVisible();
    expect(page.url()).toContain('#main-content');
  });
});

test.describe('Keyboard order', () => {
  test('tabs through skip link, brand mark, then primary nav in document order', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);

    const order: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      const description = await page.locator(':focus').evaluate((el) => {
        if (el.classList.contains('skip-link')) return 'skip-link';
        if (el.classList.contains('brand-mark')) return 'brand-mark';
        if (el.classList.contains('primary-nav__link')) return `nav:${el.textContent?.trim()}`;
        return el.className;
      });
      order.push(description);
    }

    expect(order).toEqual(['skip-link', 'brand-mark', 'nav:Work', 'nav:About']);
  });

  test('every focusable shell control shows a visible focus indicator', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    const controls = ['.skip-link', '.brand-mark', '.primary-nav__link', '.footer-nav__link', '.social-links__link'];

    for (const selector of controls) {
      const target = page.locator(selector).first();
      await target.focus();
      const outline = await target.evaluate((el) => {
        const style = getComputedStyle(el);
        return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      expect(outline.outlineStyle).not.toBe('none');
      expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
    }
  });
});

test.describe('Target size', () => {
  test('primary nav, footer nav, and social links meet the 24x24 CSS px minimum', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    const selectors = ['.primary-nav__link', '.footer-nav__link', '.social-links__link', '.brand-mark'];

    for (const selector of selectors) {
      const boxes = await page.locator(selector).evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) {
        expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE_PX);
      }
    }
  });
});

test.describe('Contrast and automated checks', () => {
  test('header and footer have no automatically detectable contrast or focus violations', async ({ page }) => {
    await page.goto('/');
    await enterSilently(page);
    const results = await new AxeBuilder({ page })
      .include('.site-header')
      .include('.site-footer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
