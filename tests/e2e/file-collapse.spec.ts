import { test, expect } from './fixtures/generate-diff';

test.describe('File Collapse (Chevron)', () => {
  test('clicking chevron hides the file body', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const chevron = page.locator('.gp-chevron-btn').first();
    const fileBody = page.locator('#gp-file-body-0');
    await expect(fileBody).toBeVisible();
    await chevron.click();
    await expect(fileBody).toBeHidden();
  });

  test('clicking chevron rotates the icon', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const chevronIcon = page.locator('.gp-chevron-icon').first();
    await page.locator('.gp-chevron-btn').first().click();
    const transform = await chevronIcon.evaluate(el => (el as HTMLElement).style.transform);
    expect(transform).toBe('rotate(-90deg)');
  });

  test('clicking chevron again restores file body', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const chevron = page.locator('.gp-chevron-btn').first();
    const fileBody = page.locator('#gp-file-body-0');
    await chevron.click();
    await expect(fileBody).toBeHidden();
    await chevron.click();
    await expect(fileBody).toBeVisible();
  });

  test('clicking file name also toggles collapse', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const fileName = page.locator('.gp-file-header-clickable').first();
    const fileBody = page.locator('#gp-file-body-0');
    await fileName.click();
    await expect(fileBody).toBeHidden();
    await fileName.click();
    await expect(fileBody).toBeVisible();
  });
});
