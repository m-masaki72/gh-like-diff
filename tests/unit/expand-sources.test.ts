import { describe, it, expect } from 'vitest';
import { buildExpandSources, EXPAND_SOURCE_BUDGET, buildHtml } from '../../src/core/template';
import { parse } from '../../src/core/parser';

function lines(n: number, prefix = 'export const value') {
  return Array.from({ length: n }, (_, i) => `${prefix}${i} = ${i};`);
}

describe('buildExpandSources', () => {
  it('highlights the embedded lines so expanded context matches the diff', () => {
    const out = buildExpandSources({ 'a.ts': ['const x = 1;'] });
    expect(out['a.ts'][0]).toContain('hljs-');
  });

  it('escapes rather than highlights a language it does not know', () => {
    // The lines are inserted with innerHTML, so the fallback must escape too.
    const out = buildExpandSources({ 'notes.unknownext': ['<img src=x onerror=alert(1)>'] });
    expect(out['notes.unknownext'][0]).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('returns nothing when there is nothing to embed', () => {
    expect(buildExpandSources(undefined)).toEqual({});
    expect(buildExpandSources({})).toEqual({});
  });

  it('keeps every file when they fit the budget', () => {
    const out = buildExpandSources({ 'a.ts': lines(10), 'b.ts': lines(10) });
    expect(Object.keys(out).sort()).toEqual(['a.ts', 'b.ts']);
  });

  it('stops once the budget is spent', () => {
    // Whole-file sources are expensive and highlighting multiplies the cost again; without
    // a ceiling a handful of large files produced a 42MB page.
    const out = buildExpandSources({ 'a.ts': lines(50), 'b.ts': lines(50) }, 200);
    expect(Object.keys(out).length).toBeLessThan(2);
  });

  it('takes the smallest files first, so the most files keep expansion', () => {
    const out = buildExpandSources({ big: lines(4000), small: lines(5) }, 2000);
    expect(Object.keys(out)).toEqual(['small']);
  });

  it('never exceeds the budget it was given', () => {
    const budget = 5000;
    const out = buildExpandSources(
      { 'a.ts': lines(100), 'b.ts': lines(100), 'c.ts': lines(100) }, budget);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(budget * 1.1);
  });

  it('has a budget large enough for ordinary diffs', () => {
    expect(EXPAND_SOURCE_BUDGET).toBeGreaterThanOrEqual(1024 * 1024);
  });
});

describe('page generation with large sources', () => {
  const diff = (() => {
    let d = '';
    for (let f = 0; f < 20; f++) {
      const p = `src/big${f}.ts`;
      d += `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n`
        + '@@ -10,3 +10,3 @@\n keep\n-const old = 1;\n+const neu = 2;\n';
    }
    return d;
  })();
  const sources = Object.fromEntries(
    Array.from({ length: 20 }, (_, f) => [`src/big${f}.ts`, lines(5000)]));

  function build() {
    const parsed = parse(diff);
    let info: { included: number; total: number } | null = null;
    const start = performance.now();
    const html = buildHtml({
      title: 't', repoName: 'r', branch: 'b', timestamp: 'ts',
      outputFormat: 'side-by-side', colorScheme: 'auto',
      files: parsed.files, stats: parsed.stats, fileContents: sources,
      onExpandSources: i => { info = i; },
    });
    return { html, info, ms: performance.now() - start };
  }

  it('stays bounded when the changed files are huge but the diff is tiny', () => {
    // 20 files of 5000 lines with one changed line each used to take 1.7s and produce
    // 42MB, because every line of every file was highlighted and embedded.
    const { html, ms } = build();
    expect(html.length).toBeLessThan(8 * 1024 * 1024);
    expect(ms).toBeLessThan(5000);
  });

  it('does not highlight files it is going to discard', () => {
    // Ordering by raw size first is what keeps the time flat as files are added.
    const { ms } = build();
    expect(ms).toBeLessThan(2000);
  });

  it('reports how many files kept their expand controls', () => {
    const { info } = build();
    expect(info).not.toBeNull();
    expect(info!.total).toBe(20);
    expect(info!.included).toBeLessThan(20);
    expect(info!.included).toBeGreaterThan(0);
  });

  it('renders expand controls only for the files it embedded', () => {
    const { html, info } = build();
    // 3 buttons per gap, 2 gaps per file, in each of the two views.
    const buttons = (html.match(/__gld\.expandUp\(this\)/g) || []).length;
    expect(buttons).toBe(info!.included * 2 * 2);
  });
});
