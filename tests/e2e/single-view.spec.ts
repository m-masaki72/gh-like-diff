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

test.describe('Side-by-side horizontal scroll', () => {
  test('scrolling one cell moves its partner by the same amount', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const row = page.locator('.gp-file').filter({ hasText: 'long.ts' })
      .locator('.gp-view-side tr').filter({ hasText: 'const url' }).first();

    const cells = row.locator('.gp-code-inner');
    expect(await cells.count()).toBe(2);
    // Both sides overflow: that is the case worth syncing, a long line changed slightly.
    const overflow = await cells.evaluateAll(els => els.map(el => el.scrollWidth > el.clientWidth));
    expect(overflow).toEqual([true, true]);

    await cells.first().evaluate(el => { el.scrollLeft = 250; });
    await page.waitForTimeout(300);

    const after = await cells.evaluateAll(els => els.map(el => el.scrollLeft));
    // Comparing the two used to mean scrolling each side to the same offset by hand.
    expect(after[0]).toBeGreaterThan(0);
    expect(after[1]).toBe(after[0]);
  });

  test('syncs in the other direction too', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const cells = page.locator('.gp-file').filter({ hasText: 'long.ts' })
      .locator('.gp-view-side tr').filter({ hasText: 'const url' }).first()
      .locator('.gp-code-inner');

    await cells.nth(1).evaluate(el => { el.scrollLeft = 180; });
    await page.waitForTimeout(300);
    const after = await cells.evaluateAll(els => els.map(el => el.scrollLeft));
    expect(after[1]).toBeGreaterThan(0);
    expect(after[0]).toBe(after[1]);
  });

  test('leaves the other rows where they were', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const file = page.locator('.gp-file').filter({ hasText: 'long.ts' });
    await file.locator('.gp-view-side tr').filter({ hasText: 'const url' }).first()
      .locator('.gp-code-inner').first().evaluate(el => { el.scrollLeft = 250; });
    await page.waitForTimeout(300);

    // Only the row the user touched moves. Syncing the whole file would be surprising and,
    // on a large diff, expensive.
    const moved = await file.locator('.gp-view-side .gp-code-inner')
      .evaluateAll(els => els.filter(el => el.scrollLeft > 0).length);
    expect(moved).toBe(2);
  });
});
