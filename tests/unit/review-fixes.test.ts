import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generate } from '../../src/index';
import { getStyles } from '../../src/ui/styles';
import { getClientScripts } from '../../src/ui/scripts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -10,3 +10,3 @@
 keep
-const old = 1;
+const neu = 2;
`;

describe('gap identifiers', () => {
  it('uses the same id on the expand row and the hunk header it hides', () => {
    // Prefixing one and not the other meant removeGap() matched nothing, so the stale
    // "@@ ... @@" header stayed on screen after a gap was fully expanded.
    const html = generate(DIFF, { fileContents: { 'src/a.ts': ['a', 'b', 'c'] } });
    const expandIds = [...html.matchAll(/class="gp-expand-row" data-file-idx="\d+" data-gap-id="([^"]+)"/g)]
      .map(m => m[1]);
    const hunkIds = [...html.matchAll(/class="gp-hunk" data-gap-id="([^"]+)"/g)].map(m => m[1]);
    expect(expandIds.length).toBeGreaterThan(0);
    expect(hunkIds.length).toBeGreaterThan(0);
    for (const id of hunkIds) expect(expandIds).toContain(id);
  });
});

describe('class names the stylesheet actually defines', () => {
  const css = getStyles();
  const scripts = getClientScripts();

  it('toggles the reviewed class the sidebar is styled with', () => {
    // The code toggled "reviewed" while the stylesheet only defined "gp-file-reviewed",
    // so marking a file viewed left the sidebar entry unchanged.
    expect(css).toContain('.gp-file-reviewed');
    expect(scripts).toContain("classList.toggle('gp-file-reviewed'");
    expect(scripts).not.toMatch(/classList\.toggle\('reviewed'/);
  });
});

describe('pre-paint script', () => {
  it('only sets what something later reads', () => {
    // bootView / bootWrap were written to the root element and never read by any rule or
    // script; the view and wrap preferences are applied by view-prefs at DOMContentLoaded.
    const html = generate(DIFF);
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain("localStorage.getItem('gld-theme')");
    expect(html).not.toContain('bootView');
    expect(html).not.toContain('bootWrap');
  });
});

describe('source hygiene', () => {
  it('keeps the sources free of control characters that make git treat them as binary', () => {
    // A literal NUL in template.ts made the whole file undiffable and unreviewable.
    for (const rel of ['src/core/template.ts', 'src/core/renderer.ts', 'src/core/parser.ts',
      'src/ui/components/line-memo.ts', 'src/cli/stdin.ts']) {
      const bytes = readFileSync(join(process.cwd(), rel));
      const bad = [...bytes].filter(b => b < 9 || (b > 13 && b < 32));
      expect(bad, `${rel} contains control characters`).toEqual([]);
    }
  });
});

describe('single-view controls', () => {
  it('omits the copy-new-side button when there is no side view', () => {
    const count = (h: string) => (h.match(/class="gp-copy-btn gp-copy-new-btn"/g) || []).length;
    expect(count(generate(DIFF, { outputFormat: 'side-by-side' }))).toBe(1);
    expect(count(generate(DIFF, { outputFormat: 'side-by-side', singleView: true }))).toBe(1);
    // Unified-only: the button would always report "Nothing to copy".
    expect(count(generate(DIFF, { outputFormat: 'line-by-line', singleView: true }))).toBe(0);
  });

  it('hides the view-switch commands from the palette', () => {
    expect(getClientScripts()).toContain("document.body.dataset.singleView !== '1'");
  });
});

describe('working-tree source fallback', () => {
  const spawnSync = vi.fn();
  const execSync = vi.fn();
  const readFileSync2 = vi.fn();

  beforeEach(() => {
    spawnSync.mockReset();
    execSync.mockReset().mockReturnValue('/repo\n');
    readFileSync2.mockReset();
  });

  it('falls back to HEAD, never to the literal ref "null"', async () => {
    vi.doMock('node:child_process', () => ({
      spawnSync: (...a: unknown[]) => spawnSync(...a),
      execSync: (...a: unknown[]) => execSync(...a),
    }));
    vi.doMock('node:fs', () => ({ readFileSync: (...a: unknown[]) => readFileSync2(...a) }));
    vi.resetModules();
    const { getNewFileContents } = await import('../../src/cli/git');

    readFileSync2.mockImplementation(() => { throw new Error('ENOENT'); });
    spawnSync.mockReturnValue({ status: 0, stdout: 'recovered\n' });
    getNewFileContents([{ newName: 'src/a.ts', oldName: 'src/a.ts' }], null);

    // `git show null:src/a.ts` is not a ref and would always fail.
    expect(spawnSync.mock.calls[0][1]).toEqual(['show', 'HEAD:src/a.ts']);
    vi.doUnmock('node:child_process');
    vi.doUnmock('node:fs');
  });
});
