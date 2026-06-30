import { test, expect } from './fixtures/generate-diff';

test.describe('Accessibility', () => {
  test('header uses banner role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const header = page.locator('[role="banner"]');
    await expect(header).toBeAttached();
  });

  test('toolbar uses toolbar role with aria-label', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const toolbar = page.locator('[role="toolbar"]');
    await expect(toolbar).toBeAttached();
    await expect(toolbar).toHaveAttribute('aria-label', 'Diff controls');
  });

  test('main content uses main role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const main = page.locator('[role="main"]');
    await expect(main).toBeAttached();
    await expect(main).toHaveAttribute('aria-label', 'Diff content');
  });

  test('memo panel uses complementary role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const aside = page.locator('[role="complementary"]');
    await expect(aside).toBeAttached();
    await expect(aside).toHaveAttribute('aria-label', 'Review memos');
  });

  test('skip link exists and is focusable', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const skipLink = page.locator('.gp-sr-skip');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#gp-file-0');
  });

  test('view toggle buttons have aria-pressed', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const unified = page.locator('#gp-btn-unified');
    const split = page.locator('#gp-btn-split');
    await expect(unified).toHaveAttribute('aria-pressed');
    await expect(split).toHaveAttribute('aria-pressed');
  });

  test('search overlay has search role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const search = page.locator('[role="search"]');
    await expect(search).toBeAttached();
  });

  test('review progress has progressbar role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const progressbar = page.locator('[role="progressbar"]');
    await expect(progressbar).toBeAttached();
    await expect(progressbar).toHaveAttribute('aria-valuenow');
    await expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    const max = await progressbar.getAttribute('aria-valuemax');
    expect(Number(max)).toBeGreaterThan(0);
  });

  test('sidebar has navigation role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const nav = page.locator('nav[aria-label="File tree"]');
    await expect(nav).toBeAttached();
  });
});
