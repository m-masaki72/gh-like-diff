import { describe, it, expect } from 'vitest';
import { parse, generate, render } from '../../src/index';

const DIFF = `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,3 @@
 const keep = 1;
-const old = 2;
+const renamed = 2;
`;

describe('parse', () => {
  it('returns files, stats and the no-newline markers', () => {
    const p = parse(DIFF);
    expect(p.files).toHaveLength(1);
    expect(p.stats).toEqual({ totalAdditions: 1, totalDeletions: 1, fileCount: 1 });
    expect(p.noNewline).toBeInstanceOf(Set);
  });

  it('rejects a non-string input instead of failing deep inside diff2html', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => parse(null)).toThrow('diffString must be a string');
  });

  it('handles an empty diff without throwing', () => {
    expect(parse('').files).toEqual([]);
  });
});

describe('generate', () => {
  it('produces a self-contained document', () => {
    const html = generate(DIFF);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
    // No network requests: everything is inlined.
    expect(html).not.toMatch(/<link\s[^>]*href="http/);
    expect(html).not.toMatch(/<script\s[^>]*src=/);
    expect(html).not.toMatch(/<img\s[^>]*src="http/);
  });

  it('honours the requested output format', () => {
    expect(generate(DIFF, { outputFormat: 'line-by-line' })).toContain('<body data-view="line"');
    expect(generate(DIFF, { outputFormat: 'side-by-side' })).toContain('<body data-view="side"');
  });

  it('honours the colour scheme', () => {
    // Scoped to the <html> tag: the stylesheet itself contains [data-theme="dark"]
    // selectors regardless of the chosen scheme.
    const htmlTag = (h: string) => h.match(/<html\b[^>]*>/)![0];
    expect(htmlTag(generate(DIFF, { colorScheme: 'dark' }))).toContain('data-theme="dark"');
    expect(htmlTag(generate(DIFF, { colorScheme: 'light' }))).toContain('data-theme="light"');
    expect(htmlTag(generate(DIFF, { colorScheme: 'auto' }))).not.toContain('data-theme');
  });

  it('escapes the title rather than injecting markup', () => {
    const html = generate(DIFF, { title: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<title><script>');
  });

  it('rejects a non-string input', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => generate(42)).toThrow('diffString must be a string');
  });

  it('embeds file sources only when they are supplied', () => {
    expect(generate(DIFF)).toContain('id="gp-file-sources">{}');
    expect(generate(DIFF, { fileContents: { 'src/a.ts': ['x'] } })).toContain('"src/a.ts"');
  });

  it('cannot be broken out of by a closing script tag in the source', () => {
    // Two layers protect the inline JSON block: the embedded lines are highlighted (which
    // escapes < and >), and safeJson() rewrites any surviving </ sequence. Either alone
    // would be enough; together there is no literal </script> before the real one.
    const html = generate(DIFF, {
      fileContents: { 'src/a.ts': ['</script><img onerror=alert(1)>'] },
    });
    const marker = 'id="gp-file-sources">';
    const block = html.slice(html.indexOf(marker) + marker.length);
    const json = block.slice(0, block.indexOf('</script>'));

    expect(json).not.toContain('<img onerror');
    expect(JSON.parse(json)['src/a.ts'][0]).toContain('&lt;/script&gt;');
  });

  it('escapes embedded sources for a language it cannot highlight', () => {
    // The fallback path must escape too — the lines are inserted with innerHTML.
    const diff = DIFF.replaceAll('src/a.ts', 'notes.unknownext');
    const html = generate(diff, {
      fileContents: { 'notes.unknownext': ['<img src=x onerror=alert(1)>'] },
    });
    const marker = 'id="gp-file-sources">';
    const block = html.slice(html.indexOf(marker) + marker.length);
    const json = block.slice(0, block.indexOf('</script>'));
    expect(JSON.parse(json)['notes.unknownext'][0]).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('gives two different diffs different storage identities', () => {
    // replaceAll, not replace: the path appears in the git header and in both ---/+++
    // lines, and diff2html reads the names from the latter.
    const other = DIFF.replaceAll('src/a.ts', 'src/b.ts');
    const idOf = (h: string) => h.match(/data-diff-id="([0-9a-f]+)"/)![1];
    expect(idOf(generate(DIFF))).not.toBe(idOf(generate(other)));
  });
});

describe('render', () => {
  it('returns a fragment with no document wrapper', () => {
    const fragment = render(DIFF);
    expect(fragment).not.toContain('<!DOCTYPE');
    expect(fragment).not.toContain('<body');
    expect(fragment).toContain('gp-file');
  });

  it('respects the output format', () => {
    expect(render(DIFF, { outputFormat: 'line-by-line' })).toContain('gp-view-unified');
  });
});
