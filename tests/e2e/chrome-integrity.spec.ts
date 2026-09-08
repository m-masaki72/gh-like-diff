import { test, expect } from './fixtures/generate-diff';

/**
 * Structural CSS guards.
 *
 * Existence assertions cannot catch a stylesheet regression: an element with no rules
 * still renders, just in the wrong place. These tests pin the computed styles that make
 * the chrome usable, so deleting a rule fails the suite instead of only looking wrong.
 */
test.describe('Stylesheet integrity', () => {
  test('the memo panel is off-screen until it is opened', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const panel = page.locator('#gp-memo-panel');

    const closed = await panel.evaluate(el => {
      const s = getComputedStyle(el);
      return { position: s.position, right: el.getBoundingClientRect().left };
    });
    expect(closed.position).toBe('fixed');
    // Parked outside the viewport rather than sitting on top of the diff.
    expect(closed.right).toBeGreaterThanOrEqual(await page.evaluate(() => window.innerWidth) - 1);

    await page.click('button[aria-label="Review memos"]');
    await page.waitForTimeout(400);
    const openLeft = await panel.evaluate(el => el.getBoundingClientRect().left);
    expect(openLeft).toBeLessThan(await page.evaluate(() => window.innerWidth));
  });

  test('the review progress bar has a visible track and fill', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const track = await page.locator('.gp-review-bar').evaluate(el => el.getBoundingClientRect());
    expect(track.width).toBeGreaterThan(0);
    expect(track.height).toBeGreaterThan(0);

    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    const fill = await page.locator('.gp-review-bar-fill').evaluate(el => el.getBoundingClientRect());
    expect(fill.width).toBeGreaterThan(0);
  });

  test('the memo badge sits inside the gutter cell', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    await page.locator('.gp-memo-textarea').fill('badge');
    await page.locator('.gp-memo-save').click();
    await page.waitForTimeout(300);

    const geometry = await page.locator('.gp-memo-badge').first().evaluate(el => {
      const badge = el.getBoundingClientRect();
      const cell = el.closest('.gp-ln')!.getBoundingClientRect();
      return { badge, cell, position: getComputedStyle(el).position };
    });
    expect(geometry.position).toBe('absolute');
    expect(geometry.badge.right).toBeLessThanOrEqual(geometry.cell.right + 1);
  });

  test('the memo editor textarea is laid out, not collapsed', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    const box = await page.locator('.gp-memo-textarea').evaluate(el => el.getBoundingClientRect());
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(20);
  });

  test('the file card sits below the sticky header, not under it', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const stickyTop = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gld-sticky-top')));
    // Measured from the real header height rather than the old hard-coded 82px, so a
    // wrapped toolbar cannot hide the content it scrolls under.
    expect(stickyTop).toBeGreaterThan(0);

    const header = await page.locator('.gp-header').evaluate(el => el.getBoundingClientRect().height);
    const toolbar = await page.locator('.gp-toolbar').evaluate(el => el.getBoundingClientRect().height);
    expect(Math.abs(stickyTop - (header + toolbar))).toBeLessThanOrEqual(2);
  });

  test('the sticky offset follows the toolbar when it wraps', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const wide = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gld-sticky-top')));
    await page.setViewportSize({ width: 420, height: 900 });
    await page.waitForTimeout(400);
    const narrow = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gld-sticky-top')));
    expect(narrow).toBeGreaterThan(wide);
  });

  test('line numbers and prefixes are excluded from a text selection', async ({ page, unifiedDiffPageUrl }) => {
    await page.goto(unifiedDiffPageUrl);
    const styles = await page.evaluate(() => ({
      ln: getComputedStyle(document.querySelector('.gp-ln')!).userSelect,
      prefix: getComputedStyle(document.querySelector('.gp-prefix')!).userSelect,
    }));
    expect(styles.ln).toBe('none');
    expect(styles.prefix).toBe('none');
  });

  test('tabs render at four columns, not the browser default eight', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const tabSize = await page.locator('.gp-code').first().evaluate(el => getComputedStyle(el).tabSize);
    expect(tabSize).toBe('4');
  });
});
