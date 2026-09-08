import { test, expect } from './fixtures/generate-diff';
import type { Page } from '@playwright/test';

async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName,
      id: el.id,
      cls: el.className,
      label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || '',
    };
  });
}

async function tabThrough(page: Page, steps: number) {
  const seen: string[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (!f) break;
    seen.push(f.id || f.label || f.cls);
  }
  return seen;
}

test.describe('Keyboard reachability', () => {
  // Safari keeps buttons and links out of the Tab order unless the user turns on
  // "Press Tab to highlight each item on a webpage", so sequential-Tab assertions can only
  // run on the engines that follow the common default. The focusability test below covers
  // the same ground everywhere.
  test('the skip link is the first stop and jumps into the diff', async ({ page, diffPageUrl, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit tabs only between form fields by default');
    await page.goto(diffPageUrl);
    await page.keyboard.press('Tab');
    const first = await focused(page);
    expect(first?.cls).toContain('gp-sr-skip');

    // It must actually become visible once focused, or it is a trap for sighted keyboard
    // users who cannot see where they are.
    const box = await page.locator('.gp-sr-skip').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => location.hash)).toBe('#gp-file-0');
  });

  test('every toolbar control is reachable by Tab', async ({ page, diffPageUrl, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit tabs only between form fields by default');
    await page.goto(diffPageUrl);
    const stops = await tabThrough(page, 20);
    for (const id of ['gp-btn-unified', 'gp-btn-split', 'gp-theme-btn', 'gp-wrap-btn',
      'gp-minimap-btn', 'gp-unreviewed-btn', 'gp-file-filter']) {
      expect(stops, `Tab never reached #${id}`).toContain(id);
    }
  });

  test('every toolbar control can take focus', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Engine-independent: a control that cannot be focused programmatically is out of
    // reach for every assistive technology, whatever the Tab default is.
    const unfocusable = await page.evaluate(() => {
      const ids = ['gp-btn-unified', 'gp-btn-split', 'gp-theme-btn', 'gp-wrap-btn',
        'gp-minimap-btn', 'gp-unreviewed-btn', 'gp-file-filter'];
      return ids.filter(id => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (!el) return true;
        el.focus();
        return document.activeElement !== el;
      });
    });
    expect(unfocusable).toEqual([]);
  });

  test('the skip link targets the first file', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const link = page.locator('.gp-sr-skip');
    await expect(link).toHaveAttribute('href', '#gp-file-0');
    await expect(page.locator('#gp-file-0')).toHaveCount(1);
  });

  test('the closed memo panel holds nothing focusable', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    // Parked off-screen it stayed in the tab order, so keyboard users landed on controls
    // that were nowhere on screen. visibility:hidden still leaves a layout box, so assert
    // on the computed style and then prove it by actually tabbing.
    const visible = await page.evaluate(() => {
      const panel = document.getElementById('gp-memo-panel')!;
      return [...panel.querySelectorAll('button, [href], input, textarea')]
        .filter(el => getComputedStyle(el).visibility !== 'hidden').length;
    });
    expect(visible).toBe(0);

    let landedInPanel = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      landedInPanel = await page.evaluate(() =>
        !!document.getElementById('gp-memo-panel')!.contains(document.activeElement));
      if (landedInPanel) break;
    }
    expect(landedInPanel).toBe(false);

    // ...and that opening it does put the controls back in reach.
    await page.click('button[aria-label="Review memos"]');
    await page.waitForTimeout(400);
    const afterOpen = await page.evaluate(() => {
      const panel = document.getElementById('gp-memo-panel')!;
      return [...panel.querySelectorAll('button')]
        .filter(el => getComputedStyle(el).visibility !== 'hidden').length;
    });
    expect(afterOpen).toBeGreaterThan(0);
  });

  test('the file collapse button reports its state', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const chevron = page.locator('.gp-chevron-btn').first();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(chevron).toHaveAttribute('aria-controls', 'gp-file-body-0');

    await chevron.focus();
    await page.keyboard.press('Enter');
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#gp-file-body-0')).toHaveClass(/collapsed/);
  });
});

test.describe('Focus management', () => {
  test('the shortcuts dialog takes focus and gives it back', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const opener = page.locator('button[aria-label="Keyboard shortcuts"]');
    await opener.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#gp-shortcuts')).toBeVisible();
    const inDialog = await page.evaluate(() =>
      !!document.getElementById('gp-shortcuts')!.contains(document.activeElement));
    expect(inDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#gp-shortcuts')).toBeHidden();
    // Returning focus to the opener is what lets a keyboard user carry on where they were.
    expect((await focused(page))?.label).toBe('Keyboard shortcuts');
  });

  test('the command palette takes focus and gives it back', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const filter = page.locator('#gp-file-filter');
    await filter.focus();

    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('.gp-palette-overlay.open')).toBeVisible();
    expect((await focused(page))?.cls).toContain('gp-palette-input');

    await page.keyboard.press('Escape');
    await expect(page.locator('.gp-palette-overlay.open')).toHaveCount(0);
    expect((await focused(page))?.id).toBe('gp-file-filter');
  });

  test('the palette dialog is announced as modal', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.locator('.gp-palette');
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.gp-palette-input')).toHaveAttribute('aria-activedescendant', /gp-palette-item-/);
  });

  test('arrow keys move the palette selection without losing the input', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.keyboard.press('ControlOrMeta+k');
    const firstSelected = await page.locator('.gp-palette-item.selected').textContent();
    await page.keyboard.press('ArrowDown');
    const secondSelected = await page.locator('.gp-palette-item.selected').textContent();

    expect(secondSelected).not.toBe(firstSelected);
    // Typing must still go to the input after arrowing.
    expect((await focused(page))?.cls).toContain('gp-palette-input');
    await expect(page.locator('.gp-palette-item.selected')).toHaveCount(1);
  });

  test('the memo editor focuses its textarea and restores nothing on cancel', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.locator('.gp-view-side .gp-ln[data-ln]').first().dblclick();
    expect((await focused(page))?.cls).toContain('gp-memo-textarea');

    await page.keyboard.press('Escape');
    await expect(page.locator('.gp-memo-editor')).toHaveCount(0);
  });
});

test.describe('Announcements', () => {
  test('review progress exposes a value and a readable description', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const bar = page.locator('#gp-review-progress');
    await page.locator('.gp-reviewed-cb').first().check();
    await page.waitForTimeout(200);
    await expect(bar).toHaveAttribute('aria-valuenow', '1');
    await expect(bar).toHaveAttribute('aria-valuetext', /1 of \d+ files viewed/);
  });

  test('toasts live in a polite live region', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    await page.evaluate(() => (window as any).__gld.toast('done'));
    const container = page.locator('.gp-toast-container');
    await expect(container).toHaveAttribute('role', 'status');
    await expect(container).toHaveAttribute('aria-live', 'polite');
  });

  test('decorative icons are hidden from assistive tech', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const undecorated = await page.locator('.gp-expand-arrow svg:not([aria-hidden="true"])').count();
    expect(undecorated).toBe(0);
  });

  test('toggle buttons report their pressed state', async ({ page, diffPageUrl }) => {
    await page.goto(diffPageUrl);
    const wrap = page.locator('#gp-wrap-btn');
    await expect(wrap).toHaveAttribute('aria-pressed', 'false');
    await wrap.click();
    await expect(wrap).toHaveAttribute('aria-pressed', 'true');
  });
});
