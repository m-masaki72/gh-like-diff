import { test, expect } from './fixtures/generate-diff';

// Both the unified and side-by-side tables are always present in the DOM; only one is
// shown. Anything that queries diff content must ignore the hidden copy, or counts double
// and scrollIntoView silently does nothing.
test.describe('Hidden view isolation', () => {
  test('search counts only the visible view', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('/');
    await page.locator('.gp-search input').fill('function');
    await page.waitForTimeout(400);

    const total = await page.locator('mark.gp-search-hit').count();
    const visible = await page.locator('.gp-view-side mark.gp-search-hit').count();
    expect(total).toBeGreaterThan(0);
    expect(visible).toBe(total);

    const label = await page.locator('.gp-search-count').textContent();
    expect(label).toBe(`1 / ${total}`);
  });

  test('Enter always moves to a match that is actually on screen', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('/');
    const input = page.locator('.gp-search input');
    await input.fill('return');
    await page.waitForTimeout(400);

    const positions: number[] = [];
    for (let i = 0; i < 3; i++) {
      await input.press('Enter');
      await page.waitForTimeout(350);
      positions.push(await page.evaluate(() => window.scrollY));
    }
    // With the hidden view included, every other Enter used to land on a display:none row
    // and leave the page exactly where it was.
    const current = await page.locator('mark.gp-search-hit-current').count();
    expect(current).toBe(1);
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  test('a permalink scrolls to the line in unified view', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    await page.locator('.gp-view-unified .gp-ln[data-side="R"][data-ln="150"]').first().click();
    const hash = await page.evaluate(() => location.hash);
    expect(hash).toContain('R150');

    // Fresh load, so nothing is restored from the previous scroll position.
    await page.goto(edgeCaseUnifiedPageUrl + hash);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await page.locator('.gp-view-unified tr.gp-highlighted').count()).toBeGreaterThan(0);
  });

  test('memo badges appear in whichever view is showing', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    await page.locator('.gp-memo-textarea').fill('note');
    await page.locator('.gp-memo-save').click();
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForTimeout(400);
    expect(await page.locator('.gp-view-side .gp-memo-badge').count()).toBeGreaterThan(0);

    await page.click('#gp-btn-unified');
    await page.waitForTimeout(200);
    expect(await page.locator('.gp-view-unified .gp-memo-badge').count()).toBeGreaterThan(0);
  });

  test('the toolbar memo counter is restored on load', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    await page.locator('.gp-memo-textarea').fill('counted');
    await page.locator('.gp-memo-save').click();
    await page.reload();
    await page.waitForTimeout(400);
    expect(await page.locator('#gp-memo-count').textContent()).toBe('1');
  });

  test('expanding in one view leaves the other view intact', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    const file = page.locator('.gp-file').filter({ hasText: 'module.ts' }).first();
    const sideHunksBefore = await file.locator('.gp-view-side .gp-hunk').count();

    await file.locator('.gp-view-unified .gp-expand-arrow-all').first().click();
    await page.waitForTimeout(300);

    // Gap ids used to collide across views, so expanding here hid the other view's header.
    const sideHunksAfter = await file.locator('.gp-view-side .gp-hunk')
      .evaluateAll(hs => hs.filter(h => (h as HTMLElement).style.display !== 'none').length);
    expect(sideHunksAfter).toBe(sideHunksBefore);
  });

  test('switching views keeps the reader near the same file', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const target = page.locator('.gp-file').filter({ hasText: 'module.ts' }).first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await page.click('#gp-btn-unified');
    await page.waitForTimeout(300);

    const box = await target.boundingBox();
    // Still within the viewport rather than thrown to an unrelated offset.
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(900);
    expect(box!.y).toBeGreaterThan(-2000);
  });
});
