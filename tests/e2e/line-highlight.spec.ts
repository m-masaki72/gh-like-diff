import { test, expect } from './fixtures/generate-diff';

test.describe('Line Highlight (GitHub-compatible)', () => {
  test('clicking a line number highlights the row', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln]').first();
    await lnCell.click();
    const row = lnCell.locator('..');
    await expect(row).toHaveClass(/gp-highlighted/);
  });

  test('clicking updates the URL hash', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const lnCell = page.locator('.gp-ln[data-ln="1"][data-side="R"]').first();
    await lnCell.click();
    const url = page.url();
    expect(url).toMatch(/#diff-[a-f0-9]+R1$/);
  });

  test('clicking another line clears previous highlight', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const firstLn = page.locator('.gp-ln[data-ln="1"][data-side="R"]').first();
    const secondLn = page.locator('.gp-ln[data-ln="3"][data-side="R"]').first();
    await firstLn.click();
    await secondLn.click();
    const highlightedCount = await page.locator('.gp-highlighted').count();
    expect(highlightedCount).toBe(1);
  });

  test('shift+click selects a range of lines', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const firstLn = page.locator('.gp-ln[data-ln="1"][data-side="R"]').first();
    const thirdLn = page.locator('.gp-ln[data-ln="3"][data-side="R"]').first();
    await firstLn.click();
    await thirdLn.click({ modifiers: ['Shift'] });
    const highlightedCount = await page.locator('.gp-highlighted').count();
    expect(highlightedCount).toBeGreaterThanOrEqual(3);
  });

  test('shift+click updates URL hash with range format', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const firstLn = page.locator('.gp-ln[data-ln="1"][data-side="R"]').first();
    const thirdLn = page.locator('.gp-ln[data-ln="3"][data-side="R"]').first();
    await firstLn.click();
    await thirdLn.click({ modifiers: ['Shift'] });
    const url = page.url();
    expect(url).toMatch(/#diff-[a-f0-9]+R1-R3$/);
  });

  test('navigating to URL with hash highlights the line', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // First get a valid file hash
    const fileHash = await page.locator('.gp-file[data-file-hash]').first().getAttribute('data-file-hash');
    await page.goto(`${diffPageUrl}#diff-${fileHash}R1`);
    await page.waitForTimeout(200);
    const highlightedCount = await page.locator('.gp-highlighted').count();
    expect(highlightedCount).toBeGreaterThanOrEqual(1);
  });

  test('works in unified view', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const lnCell = page.locator('.gp-view-unified .gp-ln[data-ln]').first();
    await lnCell.click();
    const row = lnCell.locator('..');
    await expect(row).toHaveClass(/gp-highlighted/);
  });
});
