import { describe, it, expect } from 'vitest';
import { buildHtml } from '../../src/core/template';
import type { DiffFile } from 'diff2html/lib/types';
import { LineType } from 'diff2html/lib/types';

function makeMockFile(): DiffFile {
  return {
    blocks: [{
      lines: [
        { type: LineType.CONTEXT, content: ' ctx', oldNumber: 1, newNumber: 1 },
      ],
      oldStartLine: 1,
      oldStartLine2: null,
      newStartLine: 1,
      header: '@@ -1,1 +1,1 @@',
    }],
    deletedLines: 0,
    addedLines: 0,
    checksumBefore: 'a',
    checksumAfter: 'b',
    oldName: 'test.ts',
    newName: 'test.ts',
    language: 'ts',
    isCombined: false,
    isGitDiff: true,
    isDeleted: false,
    isNew: false,
    isRename: false,
    isBinary: false,
    isTooLarge: false,
    unchangedPercentage: 100,
  } as DiffFile;
}

describe('buildHtml', () => {
  const baseOpts = {
    title: 'Test Diff',
    repoName: 'test-repo',
    branch: 'main',
    timestamp: '2024-01-01',
    outputFormat: 'side-by-side' as const,
    colorScheme: 'auto' as const,
    files: [makeMockFile()],
    stats: { totalAdditions: 0, totalDeletions: 0, fileCount: 1 },
  };

  it('generates a valid HTML document', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<title>Test Diff</title>');
  });

  it('includes embedded diff data', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('id="gp-diff-data"');
  });

  it('includes client scripts', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('window.__gld');
  });

  it('includes review progress bar', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('gp-review-progress');
    expect(html).toContain('gp-review-bar');
  });

  it('includes memo panel', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('gp-memo-panel');
    expect(html).toContain('Review Memos');
  });

  it('respects dark color scheme', () => {
    const html = buildHtml({ ...baseOpts, colorScheme: 'dark' });
    expect(html).toContain('data-theme="dark"');
  });

  it('auto color scheme has no data-theme on html tag', () => {
    const html = buildHtml({ ...baseOpts, colorScheme: 'auto' });
    const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? '';
    expect(htmlTag).not.toContain('data-theme=');
  });

  it('includes sidebar with file tree', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('gp-sidebar');
    expect(html).toContain('gp-file-item');
  });

  it('includes toolbar buttons', () => {
    const html = buildHtml(baseOpts);
    expect(html).toContain('gp-btn-unified');
    expect(html).toContain('gp-btn-split');
  });

  it('escapes HTML in title and repo name', () => {
    const html = buildHtml({ ...baseOpts, title: '<script>xss</script>', repoName: '&danger' });
    expect(html).not.toContain('<script>xss</script>');
    expect(html).toContain('&amp;danger');
  });

  it('includes file contents JSON when provided', () => {
    const html = buildHtml({ ...baseOpts, fileContents: { 'test.ts': ['line1', 'line2'] } });
    expect(html).toContain('gp-file-sources');
    expect(html).toContain('line1');
  });
});
