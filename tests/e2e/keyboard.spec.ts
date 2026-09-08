import { test, expect } from './fixtures/generate-diff';

async function defaultPrevented(page: any, key: string, init: Record<string, unknown>) {
  return page.evaluate(([k, i]: [string, Record<string, unknown>]) => {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...i });
    if ((i as any).isComposing) Object.defineProperty(ev, 'isComposing', { value: true });
    document.body.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, [key, init]);
}

test.describe('Keyboard shortcuts', () => {
  test('modifier combinations stay with the browser', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Cmd+R reload, Cmd+P print, Cmd+J downloads: all were swallowed by the bare-letter
    // handlers, which also toggled "Viewed" and scrolled the page as a side effect.
    // 'k' is excluded: Cmd/Ctrl+K is our own palette shortcut, covered separately.
    for (const key of ['r', 'p', 'j', 'n', 'b', 'w', 'm', 'u']) {
      expect(await defaultPrevented(page, key, { metaKey: true })).toBe(false);
      expect(await defaultPrevented(page, key, { ctrlKey: true })).toBe(false);
    }
  });

  test('Cmd/Ctrl+K is reserved for the command palette', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    expect(await defaultPrevented(page, 'k', { metaKey: true })).toBe(true);
    expect(await defaultPrevented(page, 'k', { ctrlKey: true })).toBe(true);
  });

  test('Cmd+R does not toggle the review checkbox', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const before = await page.locator('.gp-reviewed-cb:checked').count();
    await page.keyboard.press('Meta+r');
    await page.keyboard.press('Control+r');
    await page.waitForTimeout(300);
    expect(await page.locator('.gp-reviewed-cb:checked').count()).toBe(before);
  });

  test('keys are ignored while an IME conversion is in progress', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Confirming a Japanese conversion sends Enter/letters with isComposing set; acting on
    // them fired shortcuts and stole the candidate selection.
    expect(await defaultPrevented(page, 'r', { isComposing: true })).toBe(false);
    expect(await defaultPrevented(page, 'j', { isComposing: true })).toBe(false);
  });

  test('the search box ignores an IME confirmation Enter', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('/');
    await page.locator('.gp-search input').fill('return');
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => window.scrollY);
    const prevented = await page.evaluate(() => {
      const input = document.querySelector('.gp-search input')!;
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'isComposing', { value: true });
      input.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    await page.waitForTimeout(300);
    expect(prevented).toBe(false);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('r marks the first file even at the top of the page', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    // The old handler only looked *above* the fold, so at scrollY 0 it found nothing.
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    expect(await page.locator('.gp-reviewed-cb:checked').count()).toBe(1);
  });

  test('shortcuts still work right after clicking a checkbox', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    // A checkbox is an INPUT but not text entry; blocking on it left the page unresponsive.
    // Asserted via the sidebar rather than scrolling, which depends on document height.
    const sidebar = page.locator('#gp-sidebar');
    const collapsedBefore = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    await page.keyboard.press('b');
    await page.waitForTimeout(300);
    const collapsedAfter = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(collapsedAfter).toBe(!collapsedBefore);
  });

  test('typing ? into the search box does not open the shortcuts dialog', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('/');
    await page.keyboard.press('?');
    await expect(page.locator('#gp-shortcuts')).toBeHidden();
    expect(await page.locator('.gp-search input').inputValue()).toBe('?');
  });

  test('Escape closes the innermost overlay first', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('/');
    await expect(page.locator('.gp-search')).toHaveClass(/open/);

    // Memo editor opens on top of the still-open search bar.
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    await expect(page.locator('.gp-memo-editor')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('.gp-memo-editor')).toHaveCount(0);
    // The search bar underneath must survive that first Escape.
    await expect(page.locator('.gp-search')).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('.gp-search')).not.toHaveClass(/open/);
  });

  test('Escape closes the shortcuts dialog', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('?');
    await expect(page.locator('#gp-shortcuts')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#gp-shortcuts')).toBeHidden();
  });

  test('the memo editor closes on Escape and saves on Cmd+Enter', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const cell = page.locator('.gp-view-side .gp-ln[data-ln]').first();
    await cell.dblclick();
    await page.locator('.gp-memo-textarea').fill('draft');
    await page.locator('.gp-memo-textarea').press('Escape');
    await expect(page.locator('.gp-memo-editor')).toHaveCount(0);

    await cell.dblclick();
    await page.locator('.gp-memo-textarea').fill('kept');
    await page.locator('.gp-memo-textarea').press('ControlOrMeta+Enter');
    await expect(page.locator('.gp-memo-editor')).toHaveCount(0);
    expect(await page.locator('.gp-memo-badge').count()).toBeGreaterThan(0);
  });
});
