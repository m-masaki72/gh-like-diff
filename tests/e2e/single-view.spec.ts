import { test, expect } from './fixtures/generate-diff';

// --single-view halves the output by rendering one table instead of two. Everything else
// must keep working: the client scopes its queries by view, so an empty counterpart view
// is exactly the case those helpers must tolerate.
test.describe('Single-view pages', () => {
  test('render one view and no toggle', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    await expect(page.locator('#gp-btn-unified')).toHaveCount(0);
    await expect(page.locator('#gp-btn-split')).toHaveCount(0);
    await expect(page.locator('.gp-view-label')).toHaveText('Split');

    expect(await page.locator('.gp-view-side table').count()).toBeGreaterThan(0);
    expect(await page.locator('.gp-view-unified table').count()).toBe(0);
  });

  test('load without console errors', async ({ page, singleViewPageUrl }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(singleViewPageUrl);
    await page.waitForTimeout(600);
    expect(errors).toEqual([]);
  });

  test('refuse to switch views even if asked directly', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    // A view preference saved from a two-view page would otherwise blank the diff.
    await page.evaluate(() => (window as any).__gld.switchView('line'));
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.body.dataset.view)).toBe('side');
    await expect(page.locator('.gp-view-side table').first()).toBeVisible();
  });

  test('search still counts and navigates correctly', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    await page.keyboard.press('/');
    await page.locator('.gp-search input').fill('function');
    await page.waitForTimeout(400);

    const hits = await page.locator('mark.gp-search-hit').count();
    expect(hits).toBeGreaterThan(0);
    await expect(page.locator('.gp-search-count')).toHaveText(`1 / ${hits}`);
  });

  test('line highlighting and permalinks still work', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().click();
    const hash = await page.evaluate(() => location.hash);
    expect(hash).toMatch(/^#diff-/);

    await page.goto(singleViewPageUrl + hash);
    await page.waitForTimeout(500);
    expect(await page.locator('tr.gp-highlighted').count()).toBeGreaterThan(0);
  });

  test('memos still save and restore', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    await page.locator('.gp-memo-textarea').fill('single view note');
    await page.locator('.gp-memo-save').click();
    await page.reload();
    await page.waitForTimeout(400);
    expect(await page.locator('.gp-memo-badge').count()).toBe(1);
    await expect(page.locator('#gp-memo-count')).toHaveText('1');
  });

  test('context expansion still works', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    const before = await page.locator('.gp-view-side tr').count();
    await page.locator('.gp-view-side .gp-expand-arrow-all').first().click();
    await page.waitForTimeout(300);
    expect(await page.locator('.gp-view-side tr').count()).toBeGreaterThan(before);
  });

  test('review state and the minimap still work', async ({ page, singleViewPageUrl }) => {
    await page.goto(singleViewPageUrl);
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    await expect(page.locator('#gp-review-progress')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('#gp-minimap canvas')).toHaveCount(1);
  });
});
