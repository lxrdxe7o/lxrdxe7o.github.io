import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Dismisses the opt-in entry gate through the silent path and returns focus
 * to the document start, so tab-order assertions begin from a clean state.
 * The gate appears only after real asset loading completes, so any test that
 * needs to interact with page content has to pass through it once.
 */
export async function enterSilently(page: Page): Promise<void> {
  await page.waitForSelector('[data-entry-gate][data-state="open"]', {
    state: 'visible',
  });
  await page.locator('[data-entry="silent"]').click();
  await expect(page.locator('[data-entry-gate]')).toBeHidden();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
}
