import { describe, it, expect } from 'vitest';
import { getStyles } from '../../src/ui/styles';

const css = getStyles();

function varsDefinedIn(block: string): Set<string> {
  return new Set([...block.matchAll(/(--gld-[\w-]+)\s*:/g)].map(m => m[1]));
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  expect(start, `missing block: ${marker}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('\n}', start));
}

describe('stylesheet health', () => {
  it('has balanced braces', () => {
    expect((css.match(/{/g) || []).length).toBe((css.match(/}/g) || []).length);
  });

  it('defines every custom property it references', () => {
    const used = new Set([...css.matchAll(/var\((--gld-[\w-]+)/g)].map(m => m[1]));
    const defined = varsDefinedIn(css);
    // --gld-sticky-top is set from JS at runtime and always used with a fallback.
    const runtimeOnly = new Set(['--gld-sticky-top']);
    const missing = [...used].filter(v => !defined.has(v) && !runtimeOnly.has(v));
    expect(missing).toEqual([]);
  });

  it('always pairs a runtime-set property with a fallback', () => {
    const bare = [...css.matchAll(/var\(--gld-sticky-top\s*\)/g)];
    expect(bare).toEqual([]);
  });
});

describe('theme symmetry', () => {
  // Two dark blocks exist: one for prefers-color-scheme and one for the explicit
  // [data-theme="dark"] toggle. Adding a variable to one and forgetting the other leaves
  // the toggle and the OS setting disagreeing.
  const light = varsDefinedIn(blockAfter(':root {'));
  const auto = varsDefinedIn(blockAfter(':root:not([data-theme="light"]) {'));
  const explicit = varsDefinedIn(blockAfter('[data-theme="dark"] {'));

  it('the two dark blocks define exactly the same variables', () => {
    expect([...auto].sort()).toEqual([...explicit].sort());
  });

  it('every dark override corresponds to a light default', () => {
    const orphans = [...auto].filter(v => !light.has(v));
    expect(orphans).toEqual([]);
  });

  it('themes the file tag and search-hit colours rather than hard-coding them', () => {
    for (const name of ['--gld-tag-changed-bg', '--gld-tag-changed-fg',
      '--gld-tag-added-bg', '--gld-tag-deleted-bg', '--gld-tag-renamed-bg',
      '--gld-search-hit-bg', '--gld-search-cur-bg']) {
      expect(light.has(name)).toBe(true);
      expect(auto.has(name)).toBe(true);
      expect(explicit.has(name)).toBe(true);
    }
    // The old pastel literals must not survive on the chips themselves.
    expect(css).not.toMatch(/\.gp-file-tag\.\w+\s*{\s*background:\s*#/);
  });
});

describe('required rules', () => {
  // Deleting a section wholesale is easy and silent: element-existence tests still pass
  // while the memo panel drifts on screen and the progress bar collapses to nothing.
  const required = [
    '.gp-memo-panel', '.gp-memo-panel.open', '.gp-memo-badge', '.gp-memo-editor',
    '.gp-memo-textarea', '.gp-memo-item',
    '.gp-review-progress', '.gp-review-bar', '.gp-review-bar-fill', '.gp-reviewed-label',
    '.gp-hunk-copy-btn', '.gp-copy-new-btn',
    '.gp-shortcuts', '.gp-shortcuts-panel', '.gp-shortcuts-list',
    '.gp-no-newline', '.gp-empty-file-cell', '.gp-no-matches',
    '.gp-search-hit', '.gp-search-hit-current', '.gp-search-scope',
    '.gp-palette-empty', '.gp-minimap.collapsed',
    '.gp-toast', '.gp-toast-container', '.gp-sr-skip',
  ];
  for (const selector of required) {
    it(`styles ${selector}`, () => {
      expect(css).toContain(selector);
    });
  }

  it('keeps the icon buttons hidden until hover', () => {
    expect(css).toMatch(/\.gp-hunk-copy-btn\s*{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.gp-copy-new-btn\s*{[^}]*opacity:\s*0/);
    expect(css).toContain('.gp-hunk:hover .gp-hunk-copy-btn');
  });

  it('drops the rules for features that no longer exist', () => {
    expect(css).not.toContain('.gp-kbd-hint');
    expect(css).not.toContain('.gp-lazy-placeholder');
  });

  it('excludes gutters and diff prefixes from text selection', () => {
    expect(css).toMatch(/\.gp-ln\s*{[^}]*user-select:\s*none/);
    expect(css).toMatch(/\.gp-prefix\s*{[^}]*user-select:\s*none/);
  });

  it('sets an explicit tab width', () => {
    expect(css).toMatch(/tab-size:\s*4/);
  });

  it('lets the toolbar wrap so its right-hand controls stay reachable', () => {
    expect(css).toMatch(/\.gp-toolbar\s*{[^}]*flex-wrap:\s*wrap/);
  });

  it('offsets anchor jumps by the sticky header height', () => {
    expect(css).toMatch(/scroll-margin-top:\s*calc\(var\(--gld-sticky-top/);
  });
});

describe('print rules', () => {
  const print = css.slice(css.indexOf('@media print'));

  it('restores a light palette so a dark page prints legibly', () => {
    expect(print).toContain('--gld-canvas: #ffffff');
    expect(print).toContain('--gld-fg: #1f2328');
  });

  it('wraps long lines instead of clipping them off the page', () => {
    expect(print).toMatch(/white-space:\s*pre-wrap\s*!important/);
  });

  it('hides the interactive chrome', () => {
    for (const sel of ['.gp-toolbar', '.gp-sidebar', '.gp-minimap', '.gp-shortcuts']) {
      expect(print).toContain(sel);
    }
  });
});
