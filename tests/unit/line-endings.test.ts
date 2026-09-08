import { describe, it, expect } from 'vitest';
import { parse, scanCarriageReturns } from '../../src/core/parser';
import { renderDiff } from '../../src/core/renderer';

// A CRLF -> LF conversion: every line changes, yet diff2html strips the CR so the two
// sides render byte-identical and the reviewer cannot see what moved.
const CRLF_TO_LF = 'diff --git a/win.ts b/win.ts\n'
  + 'index 1111111..2222222 100644\n'
  + '--- a/win.ts\n'
  + '+++ b/win.ts\n'
  + '@@ -1,2 +1,2 @@\n'
  + '-const a = 1;\r\n'
  + '-const b = 2;\r\n'
  + '+const a = 1;\n'
  + '+const b = 2;\n';

// Already CRLF on both sides: the marker would be pure noise here.
const CRLF_BOTH = 'diff --git a/win.ts b/win.ts\n'
  + 'index 1111111..2222222 100644\n'
  + '--- a/win.ts\n'
  + '+++ b/win.ts\n'
  + '@@ -1,1 +1,1 @@\n'
  + '-const a = 1;\r\n'
  + '+const a = 99;\r\n';

const LF_ONLY = 'diff --git a/unix.ts b/unix.ts\n'
  + '--- a/unix.ts\n'
  + '+++ b/unix.ts\n'
  + '@@ -1,1 +1,1 @@\n'
  + '-const a = 1;\n'
  + '+const a = 2;\n';

describe('scanCarriageReturns', () => {
  it('records the side whose lines carried a CR', () => {
    const cr = scanCarriageReturns(CRLF_TO_LF);
    expect(cr.has('0:L:1')).toBe(true);
    expect(cr.has('0:L:2')).toBe(true);
    expect(cr.has('0:R:1')).toBe(false);
  });

  it('records both sides when both use CRLF', () => {
    const cr = scanCarriageReturns(CRLF_BOTH);
    expect(cr.has('0:L:1')).toBe(true);
    expect(cr.has('0:R:1')).toBe(true);
  });

  it('finds nothing in a pure LF diff', () => {
    expect(scanCarriageReturns(LF_ONLY).size).toBe(0);
  });

  it('is exposed on the parse result', () => {
    expect(parse(CRLF_TO_LF).crlf.has('0:L:1')).toBe(true);
  });
});

function render(diff: string): string {
  const p = parse(diff);
  return renderDiff(p.files, { outputFormat: 'side-by-side', crlf: p.crlf, noNewline: p.noNewline });
}

describe('CRLF marker', () => {
  it('marks the old side of a line-ending conversion', () => {
    const html = render(CRLF_TO_LF);
    // Both views are rendered, so scope the count to one of them: two deleted lines lose
    // their CR, so exactly two markers, and none on the new side.
    const sideView = html.slice(html.indexOf('gp-view-side'), html.indexOf('gp-view-unified'));
    expect((sideView.match(/gp-eol-marker/g) || []).length).toBe(2);
    // Every marker sits inside a deleted cell.
    for (const m of sideView.matchAll(/<td class="gp-code([^"]*)"[^>]*>(?:(?!<\/td>)[\s\S])*?gp-eol-marker/g)) {
      expect(m[1]).toContain('gp-del');
    }
  });

  it('stays silent when both sides use the same line ending', () => {
    expect(render(CRLF_BOTH)).not.toContain('gp-eol-marker');
    expect(render(LF_ONLY)).not.toContain('gp-eol-marker');
  });

  it('is omitted entirely when the parser did not supply the data', () => {
    const p = parse(CRLF_TO_LF);
    expect(renderDiff(p.files, { outputFormat: 'side-by-side' })).not.toContain('gp-eol-marker');
  });

  it('carries an accessible description', () => {
    expect(render(CRLF_TO_LF)).toContain('aria-label="Line ends with CRLF"');
  });
});
