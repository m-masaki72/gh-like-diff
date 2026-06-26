import { test, expect } from './fixtures/generate-diff';

test.describe('Review Progress', () => {
  test('review checkbox exists on each file', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const checkboxes = page.locator('.gp-reviewed-cb');
    const fileCount = await page.locator('.gp-file').count();
    expect(await checkboxes.count()).toBe(fileCount);
  });

  test('checking a file updates progress bar text', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const cb = page.locator('.gp-reviewed-cb').first();
    await cb.check();
    const countText = await page.locator('.gp-review-count').textContent();
    expect(countText).toMatch(/^1\//);
  });

  test('review state persists in localStorage', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const cb = page.locator('.gp-reviewed-cb').first();
    await cb.check();
    const stored = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('gld-reviewed-'));
      return keys.length > 0 ? JSON.parse(localStorage.getItem(keys[0])!) : null;
    });
    expect(stored).toBeTruthy();
    expect(stored['0']).toBe(true);
  });

  test('keyboard shortcut r toggles review for current file', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Scroll past the header so first file is detected as "current"
    await page.evaluate(() => {
      var file = document.querySelector('.gp-file');
      if (file) window.scrollTo(0, file.getBoundingClientRect().top + window.scrollY - 50);
    });
    await page.waitForTimeout(200);
    await page.keyboard.press('r');
    const isChecked = await page.locator('.gp-reviewed-cb').first().isChecked();
    expect(isChecked).toBe(true);
  });
});
