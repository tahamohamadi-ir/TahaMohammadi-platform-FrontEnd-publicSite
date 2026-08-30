import { expect, test } from '@playwright/test';

test.describe('PUBLIC-170 atlas gate', () => {
  test('does not expose /_design without DESIGN_ATLAS @atlas', async ({ page }) => {
    const response = await page.goto('/_design');
    expect(response?.status()).toBe(404);
  });
});
