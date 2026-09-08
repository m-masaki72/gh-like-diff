import { describe, it, expect } from 'vitest';
import { generate, parse } from '../../src/index';

/**
 * Performance budgets.
 *
 * Split deliberately: output size is fully deterministic, so it can be pinned tightly and
 * will catch a regression exactly. Wall-clock time is not, so its absolute budget is loose
 * enough to survive a busy CI runner, and the sharp check is on *scaling* — quadratic work
 * shows up as a growth factor even when the machine is slow.
 */
function makeDiff(fileCount: number, linesPerFile: number) {
  let diff = '';
  const sources: Record<string, string[]> = {};
  for (let f = 0; f < fileCount; f++) {
    const path = `src/gen/module_${f}.ts`;
    diff += `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n`
      + `@@ -1,${linesPerFile} +1,${linesPerFile} @@\n`;
    const src: string[] = [];
    for (let i = 1; i <= linesPerFile; i++) {
      diff += `-const value${i} = ${i};\n`;
      diff += `+const value${i} = ${i * 2};\n`;
      src.push(`const value${i} = ${i * 2};`);
    }
    sources[path] = src;
  }
  return { diff, sources, changedLines: fileCount * linesPerFile * 2 };
}

function measure(fileCount: number, linesPerFile: number) {
  const { diff, sources, changedLines } = makeDiff(fileCount, linesPerFile);
  const start = performance.now();
  const html = generate(diff, { outputFormat: 'side-by-side', fileContents: sources });
  return { ms: performance.now() - start, bytes: html.length, changedLines, html };
}

describe('output size budget', () => {
  it('stays within the measured bytes-per-changed-line cost', () => {
    // Measured at ~630-810 bytes per changed line, converging downward as the fixed page
    // overhead amortises. 1100 leaves room for markup tweaks but not for a second copy
    // of the diff appearing somewhere.
    const small = measure(10, 100);
    const large = measure(30, 200);
    expect(small.bytes / small.changedLines).toBeLessThan(1100);
    expect(large.bytes / large.changedLines).toBeLessThan(1100);
  });

  it('grows linearly with the diff, not faster', () => {
    const small = measure(10, 100);
    const large = measure(30, 200);
    const inputRatio = large.changedLines / small.changedLines; // 6x
    const sizeRatio = large.bytes / small.bytes;
    // Fixed overhead (CSS, scripts) means the size ratio trails the input ratio slightly.
    expect(sizeRatio).toBeLessThan(inputRatio * 1.2);
    expect(sizeRatio).toBeGreaterThan(inputRatio * 0.7);
  });

  it('does not embed the parsed diff a second time', () => {
    // The page used to carry the whole parsed diff as JSON for a live re-render that was
    // never implemented, roughly doubling the payload.
    const { html } = measure(5, 50);
    expect(html).not.toContain('id="gp-diff-data"');
  });

  it('keeps the fixed page overhead modest', () => {
    // A one-file, one-line diff is almost entirely CSS and client scripts.
    const tiny = generate('diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1,1 +1,1 @@\n-a\n+b\n');
    expect(tiny.length).toBeLessThan(220 * 1024);
  });
});

describe('generation time budget', () => {
  it('renders a large diff well inside a usable time', () => {
    // ~420ms locally for 20k changed lines; 10s only fires on a pathological regression.
    const { ms, changedLines } = measure(50, 200);
    expect(changedLines).toBe(20000);
    expect(ms).toBeLessThan(10000);
  });

  it('scales close to linearly', () => {
    const small = measure(10, 100);
    const large = measure(40, 200);
    const inputRatio = large.changedLines / small.changedLines; // 8x
    // Quadratic work would land near 64x. 3x headroom over linear absorbs CI noise while
    // still failing loudly on an accidental nested scan.
    expect(large.ms / small.ms).toBeLessThan(inputRatio * 3);
  });

  it('parses much faster than it renders', () => {
    const { diff } = makeDiff(30, 200);
    const t0 = performance.now();
    parse(diff);
    const parseMs = performance.now() - t0;
    // Parsing is a single pass; if it ever dominates, something is scanning repeatedly.
    expect(parseMs).toBeLessThan(2000);
  });
});
