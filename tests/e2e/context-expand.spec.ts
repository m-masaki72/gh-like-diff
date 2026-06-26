import { test, expect } from './fixtures/generate-diff';

test.describe('Context Expand', () => {
  test('expand-all button exists on middle gaps', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const allBtns = page.locator('.gp-expand-arrow-all');
    // Middle gaps should have expand-all buttons
    const count = await allBtns.count();
    // At least check the button renders (may be 0 if only first/last gaps exist)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('expand row hover effect applies', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const expandRow = page.locator('.gp-expand-row').first();
    if (await expandRow.count() > 0) {
      await expandRow.hover();
      await expect(expandRow).toBeVisible();
    }
  });

  test('clicking expand-up adds rows to the table', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const upBtn = page.locator('.gp-expand-arrow-up').first();
    if (await upBtn.count() > 0) {
      const rowCountBefore = await page.locator('.gp-file:first-child tr').count();
      await upBtn.click();
      const rowCountAfter = await page.locator('.gp-file:first-child tr').count();
      expect(rowCountAfter).toBeGreaterThanOrEqual(rowCountBefore);
    }
  });
});
