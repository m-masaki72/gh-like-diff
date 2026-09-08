import { describe, it, expect } from 'vitest';
import { getClientScripts } from '../../src/ui/scripts';
import { buildHtml } from '../../src/core/template';
import { parse } from '../../src/core/parser';

const DIFF = `diff --git a/src/deep/a.ts b/src/deep/a.ts
index 1111111..2222222 100644
--- a/src/deep/a.ts
+++ b/src/deep/a.ts
@@ -10,3 +10,3 @@
 keep
-old
+new
`;

function page(): string {
  const parsed = parse(DIFF);
  return buildHtml({
    title: 't',
    repoName: 'r',
    branch: 'b',
    timestamp: 'ts',
    outputFormat: 'side-by-side',
    colorScheme: 'auto',
    files: parsed.files,
    stats: parsed.stats,
    noNewline: parsed.noNewline,
    fileContents: { 'src/deep/a.ts': ['a', 'b', 'c'] },
  });
}

const scripts = getClientScripts();
const html = page();

function matchAll(source: string, re: RegExp): string[] {
  return [...source.matchAll(re)].map(m => m[1]);
}

const defined = new Set(matchAll(scripts, /window\.__gld\.(\w+)\s*=/g));
const called = new Set([
  ...matchAll(scripts, /window\.__gld\.(\w+)\s*\(/g),
  ...matchAll(html, /window\.__gld\.(\w+)\s*\(/g),
]);

describe('client script wiring', () => {
  it('every window.__gld.* that is called is also defined', () => {
    // The worst bug this project shipped was a call to window.__gld.renderFile that had
    // no definition anywhere: the button turned into a permanent "Loading..." and the
    // failure was invisible to every existing test.
    const missing = [...called].filter(name => !defined.has(name));
    expect(missing).toEqual([]);
  });

  it('exposes the helpers the components depend on', () => {
    for (const name of ['q', 'qa', 'storageKey', 'shortcutBlocked', 'composing',
      'scrollToElement', 'stickyOffset', 'notifyLayoutChanged', 'toast']) {
      expect(defined.has(name)).toBe(true);
    }
  });

  it('defines dom-utils before anything that uses it', () => {
    // The components are concatenated IIFEs; a helper referenced at load time must be
    // registered earlier in the bundle.
    expect(scripts.indexOf('window.__gld.qa =')).toBeLessThan(scripts.indexOf('window.__gld.openSearch ='));
    expect(scripts.indexOf('window.__gld.qa =')).toBeLessThan(scripts.indexOf('window.__gld.toggleReviewed ='));
  });

  it('does not leak an unevaluated template placeholder', () => {
    // `${...}` inside the client-script template literals is interpolated by esbuild;
    // anything left behind means a string was quoted wrongly.
    expect(scripts).not.toMatch(/\$\{/);
  });

  it('never emits a literal </script> that would end the inline block early', () => {
    expect(html.match(/<\/script>/g)!.length).toBe(html.match(/<script/g)!.length);
  });

  it('registers every component module in the bundle', () => {
    for (const marker of [
      'window.__gld.openSearch',      // search
      'window.__gld.switchView',      // toolbar
      'window.__gld.toggleSidebar',   // file-tree
      'window.__gld.navFile',         // keyboard-nav
      'window.__gld.toggleTheme',     // theme-toggle
      'window.__gld.expandUp',        // context-expand
      'window.__gld.startSplitResize',// split-resizer
      'window.__gld.toggleMemoPanel', // line-memo
      'window.__gld.toggleReviewed',  // review-progress
      'window.__gld.openPalette',     // command-palette
      'window.__gld.renderMinimap',   // minimap
      'window.__gld.toggleWrap',      // view-prefs
    ]) {
      expect(scripts).toContain(marker);
    }
  });

  it('drops the removed lazy-loading entry points', () => {
    expect(scripts).not.toContain('renderFile');
    expect(scripts).not.toContain('loadFile');
  });
});

describe('generated page structure', () => {
  it('gives every button an accessible name', () => {
    // Either visible text (Unified, Split, Reset...) or, for icon-only buttons, an
    // aria-label / title. An icon button with neither is unusable with a screen reader.
    const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
    expect(buttons.length).toBeGreaterThan(5);
    const unnamed = buttons.filter(([, attrs, inner]) => {
      if (/aria-label=|aria-labelledby=|title=/.test(attrs)) return false;
      return inner.replace(/<[^>]*>/g, '').replace(/&\w+;/g, 'x').trim() === '';
    });
    expect(unnamed.map(m => m[0].slice(0, 80))).toEqual([]);
  });

  it('marks decorative icons as hidden from assistive tech', () => {
    const expandIcons = [...html.matchAll(/<button class="gp-expand-arrow[^>]*>\s*<svg([^>]*)>/g)];
    expect(expandIcons.length).toBeGreaterThan(0);
    expect(expandIcons.every(m => /aria-hidden="true"/.test(m[1]))).toBe(true);
  });

  it('carries the per-diff identity used for scoped storage', () => {
    expect(html).toMatch(/data-diff-id="[0-9a-f]{16}"/);
  });

  it('applies the saved theme before first paint', () => {
    // Reading localStorage in <head> avoids a flash of the generated default.
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain("localStorage.getItem('gld-theme')");
  });

  it('sizes the gutter from the largest line number in the diff', () => {
    expect(html).toMatch(/--gld-ln-width:\d+px/);
  });
});
