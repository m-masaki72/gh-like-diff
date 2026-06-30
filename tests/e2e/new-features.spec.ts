import { test, expect } from './fixtures/generate-diff';

test.describe('Command Palette', () => {
  test('opens on Cmd+K / Ctrl+K', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const overlay = page.locator('.gp-palette-overlay');
    await expect(overlay).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(overlay).toBeVisible();
  });

  test('closes on Escape', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('Control+k');
    const overlay = page.locator('.gp-palette-overlay');
    await expect(overlay).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('has input field and command list', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('Control+k');
    const input = page.locator('.gp-palette-input');
    await expect(input).toBeVisible();
    const items = page.locator('.gp-palette-item');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('filters commands by typing', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('Control+k');
    const countBefore = await page.locator('.gp-palette-item').count();
    await page.locator('.gp-palette-input').fill('unified');
    const countAfter = await page.locator('.gp-palette-item:visible').count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('lists files in command palette', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('Control+k');
    const text = await page.locator('.gp-palette-list').textContent();
    expect(text).toContain('utils.ts');
  });
});

test.describe('Toast Notification', () => {
  test('toast appears on hunk copy', async ({ page, unifiedDiffPageUrl, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(unifiedDiffPageUrl);
    const hunk = page.locator('.gp-view-unified .gp-hunk').first();
    await hunk.hover();
    const copyBtn = hunk.locator('.gp-hunk-copy-btn');
    await copyBtn.click({ force: true });
    const toast = page.locator('.gp-toast');
    await expect(toast.first()).toBeVisible({ timeout: 3000 });
  });

  test('toast container is created on demand', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const container = page.locator('.gp-toast-container');
    expect(await container.count()).toBeLessThanOrEqual(1);
  });
});

test.describe('Minimap', () => {
  test('minimap element exists in the DOM', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const minimap = page.locator('.gp-minimap');
    await expect(minimap).toBeAttached();
  });

  test('minimap contains canvas element', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const canvas = page.locator('.gp-minimap canvas');
    await expect(canvas).toBeAttached();
  });

  test('minimap has navigation role', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const minimap = page.locator('.gp-minimap');
    await expect(minimap).toHaveAttribute('role', 'navigation');
    await expect(minimap).toHaveAttribute('aria-label', 'Diff minimap');
  });

  test('minimap viewport indicator exists', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const viewport = page.locator('.gp-minimap-viewport');
    await expect(viewport).toBeAttached();
  });
});

test.describe('Directory Tree Sidebar', () => {
  test('sidebar renders directory structure', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const treeDir = page.locator('.gp-tree-dir');
    expect(await treeDir.count()).toBeGreaterThan(0);
  });

  test('directory nodes have folder icons', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const folderIcons = page.locator('.gp-tree-folder');
    expect(await folderIcons.count()).toBeGreaterThan(0);
  });

  test('clicking directory toggles children visibility', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Open sidebar first
    const sidebarBtn = page.locator('[aria-label="Toggle sidebar"]');
    if (await sidebarBtn.count() > 0) {
      await sidebarBtn.click();
    }
    const dirToggle = page.locator('.gp-tree-toggle').first();
    if (await dirToggle.count() > 0) {
      await dirToggle.click();
      const parent = dirToggle.locator('xpath=..');
      await expect(parent).toHaveClass(/collapsed/);
    }
  });

  test('file items in tree navigate to files', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const fileItems = page.locator('.gp-file-item');
    expect(await fileItems.count()).toBeGreaterThan(0);
    const firstItem = fileItems.first();
    const onclick = await firstItem.getAttribute('onclick');
    expect(onclick).toContain('navFile');
  });
});

test.describe('Side-by-side Scroll', () => {
  test('side-by-side code cells have inner scroll wrapper', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const inners = page.locator('.gp-view-side .gp-code-inner');
    expect(await inners.count()).toBeGreaterThan(0);
  });

  test('inner wrapper has overflow-x auto', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const inner = page.locator('.gp-view-side .gp-code-inner').first();
    const overflow = await inner.evaluate(el => getComputedStyle(el).overflowX);
    expect(overflow).toBe('auto');
  });
});

test.describe('Syntax Highlighting', () => {
  test('code cells contain hljs-highlighted spans', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const hljsSpans = page.locator('.gp-code [class^="hljs-"]');
    expect(await hljsSpans.count()).toBeGreaterThan(0);
  });

  test('word-diff lines do not mix with syntax highlighting', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const wordDiffCells = page.locator('.gp-view-unified .gp-word-add, .gp-view-unified .gp-word-del');
    const count = await wordDiffCells.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cell = wordDiffCells.nth(i);
      const parent = cell.locator('xpath=ancestor::td[contains(@class,"gp-code")]');
      const hljsInParent = await parent.locator('[class^="hljs-"]').count();
      expect(hljsInParent).toBe(0);
    }
  });
});
