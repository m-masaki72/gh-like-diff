import { test, expect } from './fixtures/generate-diff';

test.describe('Line Memo', () => {
  test('double-clicking a line number opens memo editor', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.dblclick();
    const editor = page.locator('.gp-memo-editor');
    await expect(editor).toBeVisible();
  });

  test('saving a memo adds a badge to the line', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.dblclick();
    await page.locator('.gp-memo-textarea').fill('Test memo');
    await page.locator('.gp-memo-save').click();
    const badge = page.locator('.gp-memo-badge');
    await expect(badge.first()).toBeVisible();
  });

  test('memo persists in localStorage', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.dblclick();
    await page.locator('.gp-memo-textarea').fill('Persisted memo');
    await page.locator('.gp-memo-save').click();
    const stored = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('gld-memos-'));
      return keys.length > 0 ? JSON.parse(localStorage.getItem(keys[0])!) : null;
    });
    expect(stored).toBeTruthy();
    const values = Object.values(stored);
    expect(values).toContain('Persisted memo');
  });

  test('cancel button closes the editor without saving', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.dblclick();
    await page.locator('.gp-memo-textarea').fill('Should not save');
    await page.locator('.gp-memo-cancel').click();
    const editor = page.locator('.gp-memo-editor');
    await expect(editor).not.toBeVisible();
    const badgeCount = await page.locator('.gp-memo-badge').count();
    expect(badgeCount).toBe(0);
  });

  test('memo panel opens and shows memos', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Create a memo first
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.dblclick();
    await page.locator('.gp-memo-textarea').fill('Panel test memo');
    await page.locator('.gp-memo-save').click();
    // Open panel
    await page.evaluate(() => (window as any).__gld.toggleMemoPanel());
    const panel = page.locator('#gp-memo-panel');
    await expect(panel).toHaveClass(/open/);
    const items = page.locator('.gp-memo-item');
    expect(await items.count()).toBe(1);
  });
});
