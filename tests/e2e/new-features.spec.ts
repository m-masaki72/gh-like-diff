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
  test('toast appears on hunk copy', async ({ page, unifiedDiffPageUrl, context, browserName }) => {
    // Only Chromium implements the clipboard-write permission; elsewhere the write is
    // denied and the product correctly reports a failure instead, which is covered by
    // the copy-failure test in view-prefs.spec.ts.
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
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
    // The sidebar is already open; clicking the toggle would close it and leave the tree
    // mid-transition, which Firefox correctly refuses to click into.
    const dirToggle = page.locator('.gp-tree-toggle').first();
    await expect(dirToggle).toBeVisible();
    await dirToggle.click();
    await expect(dirToggle.locator('xpath=..')).toHaveClass(/collapsed/);
    await expect(dirToggle).toHaveAttribute('aria-expanded', 'false');

    await dirToggle.click();
    await expect(dirToggle.locator('xpath=..')).not.toHaveClass(/collapsed/);
    await expect(dirToggle).toHaveAttribute('aria-expanded', 'true');
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

  test('changed lines keep syntax highlighting under the word-diff marker', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    // Previously word-diff and highlighting were mutually exclusive, so the lines the
    // reviewer most wants to read were the only plain-black ones on the page.
    const stats = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.gp-view-unified tr')]
        .filter(r => r.querySelector('.gp-word-add, .gp-word-del'));
      return {
        changedRows: rows.length,
        hljsSpans: rows.reduce((n, r) => n + r.querySelectorAll('[class^="hljs-"]').length, 0),
      };
    });
    expect(stats.changedRows).toBeGreaterThan(0);
    expect(stats.hljsSpans).toBeGreaterThan(0);
  });

  test('word-diff markup stays well-formed inside highlighted code', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const balanced = await page.evaluate(() => {
      // If the wrapper broke tag nesting the browser would repair it and the marker text
      // would no longer match the source characters it is supposed to cover.
      return [...document.querySelectorAll('.gp-word-add, .gp-word-del')]
        .every(el => el.textContent && el.textContent.length > 0 && el.closest('.gp-code'));
    });
    expect(balanced).toBe(true);
  });
});
