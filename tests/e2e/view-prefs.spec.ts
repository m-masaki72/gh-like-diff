import { test, expect } from './fixtures/generate-diff';

test.describe('View preferences', () => {
  test('line wrapping can be toggled and survives a reload', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await expect(page.locator('body')).not.toHaveClass(/gp-wrap/);

    await page.click('#gp-wrap-btn');
    await expect(page.locator('body')).toHaveClass(/gp-wrap/);
    await expect(page.locator('#gp-wrap-btn')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toHaveClass(/gp-wrap/);
  });

  test('wrapping stops long lines from being clipped out of sight', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    const overflowingCells = () => page.evaluate(() => {
      const f = [...document.querySelectorAll('.gp-file')].find(e => e.textContent!.includes('long.ts'))!;
      return [...f.querySelectorAll('.gp-view-side .gp-code-inner')]
        .filter(el => el.scrollWidth > el.clientWidth + 1).length;
    });

    // The 4px scrollbars are invisible on macOS, so without wrapping the user has no cue
    // that the line continues past the edge.
    expect(await overflowingCells()).toBeGreaterThan(0);

    await page.click('#gp-wrap-btn');
    await page.waitForTimeout(300);
    expect(await overflowingCells()).toBe(0);
  });

  test('the minimap can be hidden and stays hidden', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // toggleMinimap existed but nothing called it, so the 48px strip over the right edge
    // of the code could not be dismissed.
    await page.click('#gp-minimap-btn');
    await expect(page.locator('#gp-minimap')).toHaveClass(/collapsed/);

    await page.reload();
    await page.waitForTimeout(300);
    await expect(page.locator('#gp-minimap')).toHaveClass(/collapsed/);
  });

  test('the theme cycles and persists', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.click('#gp-theme-btn');
    const chosen = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(chosen).toBe('dark');

    await page.reload();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  });

  test('file tag chips stay readable in dark mode', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.evaluate(() => (window as any).__gld.setTheme('dark'));
    await page.waitForTimeout(200);

    const worst = await page.evaluate(() => {
      const parse = (c: string) => {
        const n = c.match(/[\d.]+/g)!.map(Number);
        return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
      };
      const over = (fg: any, bg: any) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1,
      });
      const lum = (o: any) => {
        const m = [o.r, o.g, o.b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
      };
      const canvas = parse(getComputedStyle(document.body).backgroundColor);
      let min = Infinity;
      document.querySelectorAll('.gp-file-tag').forEach(t => {
        const s = getComputedStyle(t);
        const bg = over(parse(s.backgroundColor), canvas);
        const fg = over(parse(s.color), bg);
        const l1 = lum(bg), l2 = lum(fg);
        min = Math.min(min, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
      });
      return min;
    });
    // The chips used to keep their light-mode pastel background against a dark page,
    // landing around 2:1.
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Review workflow', () => {
  test('marking a file viewed collapses it', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    await expect(page.locator('#gp-file-body-0')).toHaveClass(/collapsed/);
  });

  test('the progress bar reports its value to assistive tech', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const bar = page.locator('#gp-review-progress');
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    // Previously hard-coded to 0 in the template and never updated.
    await expect(bar).toHaveAttribute('aria-valuenow', '1');
  });

  test('the unreviewed filter hides files already marked viewed', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const total = await page.locator('.gp-file').count();
    await page.locator('.gp-reviewed-cb').first().check();
    await page.click('#gp-unreviewed-btn');
    await page.waitForTimeout(200);

    const visible = await page.locator('.gp-file').evaluateAll(
      els => els.filter(e => (e as HTMLElement).style.display !== 'none').length);
    expect(visible).toBe(total - 1);
  });

  test('filtering to nothing says so instead of showing a blank page', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('#gp-file-filter').fill('zzz-no-such-file');
    await page.waitForTimeout(200);
    await expect(page.locator('#gp-no-matches')).toBeVisible();
  });

  test('filtering hides folder headings that lost all their children', async ({ page, edgeCasePageUrl }) => {
    await page.goto(edgeCasePageUrl);
    await page.locator('#gp-file-filter').fill('README');
    await page.waitForTimeout(200);
    const visibleDirs = await page.locator('.gp-tree-dir').evaluateAll(
      els => els.filter(e => (e as HTMLElement).style.display !== 'none').length);
    expect(visibleDirs).toBe(0);
  });

  test('review state is scoped to this diff', async ({ page, diffPageUrl, edgeCasePageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);

    // A different diff of the same repository used to inherit these ticks, because the
    // storage key was derived from the page title alone.
    await page.goto(edgeCasePageUrl);
    await page.waitForTimeout(300);
    expect(await page.locator('.gp-reviewed-cb:checked').count()).toBe(0);
  });

  test('reset clears the saved state for this diff', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);

    page.on('dialog', d => d.accept());
    await page.click('button[aria-label="Reset saved state"]');
    // Reset reloads the page; a fixed wait raced the reload on slower engines, so poll
    // for the post-reload state instead.
    await expect(page.locator('.gp-reviewed-cb:checked')).toHaveCount(0, { timeout: 10000 });
  });
});

test.describe('Feedback', () => {
  test('the shortcuts dialog lists the key bindings', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.click('button[aria-label="Keyboard shortcuts"]');
    const dialog = page.locator('#gp-shortcuts');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Next / previous file');
    await expect(dialog).toContainText('Toggle line wrapping');
  });

  test('toasts are announced and can be dismissed by clicking', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.evaluate(() => (window as any).__gld.toast('hello', { duration: 60000 }));
    const container = page.locator('.gp-toast-container');
    await expect(container).toHaveAttribute('aria-live', 'polite');

    const toast = page.locator('.gp-toast').first();
    await expect(toast).toBeVisible();
    await toast.click();
    await expect(page.locator('.gp-toast')).toHaveCount(0);
  });

  test('exporting with no memos reports it rather than doing nothing', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.evaluate(() => (window as any).__gld.exportMemos());
    await expect(page.locator('.gp-toast')).toContainText('No memos to export');
  });

  test('the search can be limited to added or deleted lines', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    await page.keyboard.press('/');
    await page.locator('.gp-search input').fill('return');
    await page.waitForTimeout(400);
    const all = await page.locator('mark.gp-search-hit').count();

    await page.click('.gp-search-scope button[data-scope="add"]');
    await page.waitForTimeout(400);
    const added = await page.locator('mark.gp-search-hit').count();

    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThan(all);
    const onlyAdditions = await page.evaluate(() =>
      [...document.querySelectorAll('mark.gp-search-hit')]
        .every(m => !!m.closest('tr.gp-add')));
    expect(onlyAdditions).toBe(true);
  });
});
