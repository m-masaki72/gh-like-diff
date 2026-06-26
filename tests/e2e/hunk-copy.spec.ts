import { test, expect } from './fixtures/generate-diff';

test.describe('Hunk Copy', () => {
  test('hunk copy button exists on hunk headers', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const copyBtns = page.locator('.gp-hunk-copy-btn');
    const hunkCount = await page.locator('.gp-hunk').count();
    expect(await copyBtns.count()).toBe(hunkCount);
  });

  test('hunk copy button is visible on hover', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const hunk = page.locator('.gp-hunk').first();
    await hunk.hover();
    const copyBtn = hunk.locator('.gp-hunk-copy-btn');
    await expect(copyBtn).toBeAttached();
  });

  test('clicking copy button copies hunk code to clipboard', async ({ page, unifiedDiffPageUrl, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(unifiedDiffPageUrl);
    const hunk = page.locator('.gp-hunk').first();
    await hunk.hover();
    const copyBtn = hunk.locator('.gp-hunk-copy-btn');
    await copyBtn.click({ force: true });
    const checkIcon = copyBtn.locator('.gp-check-icon');
    const display = await checkIcon.evaluate(el => (el as HTMLElement).style.display);
    expect(display).not.toBe('none');
  });
});
