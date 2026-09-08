import { test, expect } from './fixtures/generate-diff';

test.describe('Special file kinds', () => {
  test('every file card explains itself instead of rendering blank', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const bodies = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll('.gp-file')].map(f => [
        f.querySelector('.gp-file-header-name')!.textContent!.trim(),
        (f.querySelector('.gp-file-body') as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
      ])));

    expect(bodies['a.txt → b.txt']).toContain('File renamed without content changes');
    expect(bodies['empty.txt']).toContain('Empty file');
    expect(bodies['logo.png']).toContain('Binary file not shown');
  });

  test('a binary file gets no expand controls', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const binary = page.locator('.gp-file').filter({ hasText: 'logo.png' }).first();
    // The synthetic "Binary file" block used to produce a gap row offering to reveal
    // lines that do not exist.
    expect(await binary.locator('.gp-expand-arrow').count()).toBe(0);
  });

  test('a deleted file shows its real path, not /dev/null', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('.gp-file-header-name')].map(e => e.textContent!.trim()));
    expect(names).toContain('oldfile.txt');
    expect(names.join(' ')).not.toContain('/dev/null');
  });

  test('a deleted file does not invent a dev/ folder in the sidebar', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const tree = await page.evaluate(() => ({
      dirs: [...document.querySelectorAll('.gp-tree-dir-name')].map(e => e.textContent),
      files: [...document.querySelectorAll('.gp-file-name')].map(e => e.textContent),
    }));
    expect(tree.dirs).not.toContain('dev');
    expect(tree.files).not.toContain('null');
    expect(tree.files).toContain('oldfile.txt');
  });

  test('a missing trailing newline is visible', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    // Otherwise the removed and added rows are character-for-character identical and the
    // reviewer has no way to tell what changed.
    const badge = page.locator('.gp-no-newline').first();
    expect(await page.locator('.gp-no-newline').count()).toBeGreaterThan(0);
    await expect(badge).toHaveAttribute('title', 'No newline at end of file');
  });

  test('an emoji is not split in half by the word diff', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    const text = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.gp-file')].find(e => e.textContent!.includes('unicode.ts'))!;
      return (f.querySelector('.gp-view-unified') as HTMLElement).innerText;
    });
    expect(text).toContain('🎉');
    expect(text).toContain('🎊');
    expect(text).not.toContain('�');
  });

  test('the sidebar highlights the file the user actually navigated to', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    // Directories sort before sibling files, so sidebar DOM order never matches file
    // index order; matching by position highlighted an unrelated entry.
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('.gp-file-item')].map(a => (a as HTMLElement).dataset.fileIndex));
    expect(order).not.toEqual([...order].sort((a, b) => Number(a) - Number(b)));

    await page.evaluate(() => (window as any).__gld.navFile('0'));
    await page.waitForTimeout(500);
    const active = await page.evaluate(() =>
      (document.querySelector('.gp-file-item.active') as HTMLElement)?.dataset.fileIndex);
    expect(active).toBe('0');
  });

  test('long file names carry a title for the full path', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const item = page.locator('.gp-file-item').filter({ hasText: 'module.ts' }).first();
    await expect(item).toHaveAttribute('title', 'src/deep/nested/module.ts');
  });
});

test.describe('Context expansion', () => {
  test('every gap offers both directions plus show-all', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    const file = page.locator('.gp-file').filter({ hasText: 'module.ts' }).first();
    const rows = file.locator('.gp-view-unified .gp-expand-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      // The first and last gaps used to expose a single arrow, and that arrow revealed
      // the far end of the file rather than the lines next to the hunk.
      await expect(rows.nth(i).locator('.gp-expand-arrow-up')).toHaveCount(1);
      await expect(rows.nth(i).locator('.gp-expand-arrow-down')).toHaveCount(1);
      await expect(rows.nth(i).locator('.gp-expand-arrow-all')).toHaveCount(1);
    }
  });

  test('the up arrow reveals the lines next to the following hunk', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    const revealed = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.gp-file')].find(e => e.textContent!.includes('module.ts'))!;
      const view = f.querySelector('.gp-view-unified')!;
      const gap = view.querySelector('.gp-expand-row') as HTMLElement;
      const hiddenEnd = Number(gap.dataset.newEnd);
      (gap.querySelector('.gp-expand-arrow-up') as HTMLElement).click();
      const rows = [...view.querySelectorAll('tr')];
      const after = rows.slice(rows.indexOf(gap) + 1, rows.indexOf(gap) + 3)
        .map(r => r.querySelector('.gp-ln[data-side="R"]')?.textContent?.trim());
      return { hiddenEnd, after };
    });
    // Immediately below the gap row, so contiguous with the hunk that follows it.
    expect(Number(revealed.after[0])).toBeGreaterThan(revealed.hiddenEnd - 25);
  });

  test('the down arrow reveals the lines after the preceding hunk', async ({ page, edgeCaseUnifiedPageUrl }) => {
    await page.goto(edgeCaseUnifiedPageUrl);
    const revealed = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.gp-file')].find(e => e.textContent!.includes('module.ts'))!;
      const view = f.querySelector('.gp-view-unified')!;
      const gap = view.querySelector('.gp-expand-row') as HTMLElement;
      const hiddenStart = Number(gap.dataset.newStart);
      (gap.querySelector('.gp-expand-arrow-down') as HTMLElement).click();
      const rows = [...view.querySelectorAll('tr')];
      const idx = rows.indexOf(gap);
      const before = rows.slice(Math.max(0, idx - 2), idx)
        .map(r => r.querySelector('.gp-ln[data-side="R"]')?.textContent?.trim());
      return { hiddenStart, before };
    });
    expect(Number(revealed.before[revealed.before.length - 1])).toBeLessThan(revealed.hiddenStart + 25);
  });

  test('expanded rows use the same cell structure as rendered rows', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const file = page.locator('.gp-file').filter({ hasText: 'module.ts' }).first();
    await file.locator('.gp-view-side .gp-expand-arrow-up').first().click();
    await page.waitForTimeout(200);
    // Without .gp-code-inner the expanded lines cannot scroll and overflow the other pane.
    const withoutInner = await file.locator('.gp-view-side td.gp-ctx.gp-code:not(:has(.gp-code-inner))').count();
    expect(withoutInner).toBe(0);
  });

  test('the library entry point omits expand controls without fileContents', async () => {
    // generate() used to render inert buttons: the page embedded an empty source map, so
    // clicking an arrow did nothing at all, with no error and no feedback.
    const lib = require(require('path').join(process.cwd(), 'dist', 'index.js'));
    const diff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -10,1 +10,1 @@
-a
+b
`;
    // Class names also appear in the inlined stylesheet, so assert on the handlers.
    const bare = lib.generate(diff);
    expect(bare).not.toContain('__gld.expandUp(this)');
    expect(bare).not.toContain('__gld.expandAll(this)');

    const withSource = lib.generate(diff, { fileContents: { 'x.ts': ['a', 'b', 'c'] } });
    expect(withSource).toContain('__gld.expandUp(this)');
    expect(withSource).toContain('__gld.expandAll(this)');
  });
});
