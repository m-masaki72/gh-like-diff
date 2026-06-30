import { describe, it, expect } from 'vitest';
import { renderDiff, renderSidebar } from '../../src/core/renderer';
import type { DiffFile } from 'diff2html/lib/types';
import { LineType } from 'diff2html/lib/types';

function makeMockFile(overrides?: Partial<DiffFile>): DiffFile {
  return {
    blocks: [{
      lines: [
        { type: LineType.CONTEXT, content: ' context line', oldNumber: 1, newNumber: 1 },
        { type: LineType.DELETE, content: '-deleted line', oldNumber: 2, newNumber: undefined },
        { type: LineType.INSERT, content: '+inserted line', oldNumber: undefined, newNumber: 2 },
      ],
      oldStartLine: 1,
      oldStartLine2: null,
      newStartLine: 1,
      header: '@@ -1,3 +1,3 @@',
    }],
    deletedLines: 1,
    addedLines: 1,
    checksumBefore: 'abc',
    checksumAfter: 'def',
    oldName: 'src/foo.ts',
    newName: 'src/foo.ts',
    language: 'ts',
    isCombined: false,
    isGitDiff: true,
    isDeleted: false,
    isNew: false,
    isRename: false,
    isBinary: false,
    isTooLarge: false,
    unchangedPercentage: 66,
    ...overrides,
  } as DiffFile;
}

describe('renderDiff', () => {
  it('renders side-by-side format with data attributes on line numbers', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'side-by-side' });
    expect(html).toContain('data-file-idx="0"');
    expect(html).toContain('data-ln=');
    expect(html).toContain('data-side="L"');
    expect(html).toContain('data-side="R"');
  });

  it('renders unified format with data attributes on line numbers', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'line-by-line' });
    expect(html).toContain('data-file-idx="0"');
    expect(html).toContain('data-ln=');
    expect(html).toContain('data-side="L"');
    expect(html).toContain('data-side="R"');
  });

  it('includes data-file-hash on the file container', () => {
    const file = makeMockFile();
    const html = renderDiff([file]);
    expect(html).toMatch(/data-file-hash="[a-f0-9]{8}"/);
  });

  it('includes chevron button instead of collapse button', () => {
    const file = makeMockFile();
    const html = renderDiff([file]);
    expect(html).toContain('gp-chevron-btn');
    expect(html).toContain('gp-chevron-icon');
    expect(html).not.toContain('>Hide</button>');
  });

  it('includes clickable file name', () => {
    const file = makeMockFile();
    const html = renderDiff([file]);
    expect(html).toContain('gp-file-header-clickable');
  });

  it('includes reviewed checkbox', () => {
    const file = makeMockFile();
    const html = renderDiff([file]);
    expect(html).toContain('gp-reviewed-cb');
    expect(html).toContain('Viewed');
  });

  it('includes hunk copy button', () => {
    const file = makeMockFile();
    const html = renderDiff([file]);
    expect(html).toContain('gp-hunk-copy-btn');
  });

  it('generates expand row with expand-all button for middle gaps', () => {
    const file = makeMockFile({
      blocks: [
        {
          lines: [{ type: LineType.CONTEXT, content: ' line1', oldNumber: 1, newNumber: 1 }],
          oldStartLine: 1,
          oldStartLine2: null,
          newStartLine: 1,
          header: '@@ -1,1 +1,1 @@',
        },
        {
          lines: [{ type: LineType.CONTEXT, content: ' line20', oldNumber: 20, newNumber: 20 }],
          oldStartLine: 20,
          oldStartLine2: null,
          newStartLine: 20,
          header: '@@ -20,1 +20,1 @@',
        },
      ],
    });
    const html = renderDiff([file]);
    expect(html).toContain('gp-expand-arrow-all');
  });

  it('escapes HTML in file content', () => {
    const file = makeMockFile({
      blocks: [{
        lines: [{ type: LineType.CONTEXT, content: ' <script>alert("xss")</script>', oldNumber: 1, newNumber: 1 }],
        oldStartLine: 1,
        oldStartLine2: null,
        newStartLine: 1,
        header: '@@ -1,1 +1,1 @@',
      }],
    });
    const html = renderDiff([file]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles multiple files with correct file indices', () => {
    const file1 = makeMockFile({ newName: 'a.ts', oldName: 'a.ts' });
    const file2 = makeMockFile({ newName: 'b.ts', oldName: 'b.ts' });
    const html = renderDiff([file1, file2]);
    expect(html).toContain('id="gp-file-0"');
    expect(html).toContain('id="gp-file-1"');
    expect(html).toContain('data-file-idx="0"');
    expect(html).toContain('data-file-idx="1"');
  });

  it('generates lazy placeholder for large files', () => {
    const file = makeMockFile({ addedLines: 300, deletedLines: 300 });
    const html = renderDiff([file], { outputFormat: 'side-by-side', maxLinesBeforeLazy: 500 });
    expect(html).toContain('gp-lazy-placeholder');
  });

  it('applies syntax highlighting to .ts files', () => {
    const file = makeMockFile({
      newName: 'src/utils.ts',
      oldName: 'src/utils.ts',
      blocks: [{
        lines: [
          { type: LineType.CONTEXT, content: ' const x = 42;', oldNumber: 1, newNumber: 1 },
        ],
        oldStartLine: 1,
        oldStartLine2: null,
        newStartLine: 1,
        header: '@@ -1,1 +1,1 @@',
      }],
    });
    const html = renderDiff([file], { outputFormat: 'line-by-line' });
    expect(html).toContain('hljs-');
  });

  it('does not apply highlighting to unknown file types', () => {
    const file = makeMockFile({
      newName: 'data.xyz',
      oldName: 'data.xyz',
      blocks: [{
        lines: [
          { type: LineType.CONTEXT, content: ' some data', oldNumber: 1, newNumber: 1 },
        ],
        oldStartLine: 1,
        oldStartLine2: null,
        newStartLine: 1,
        header: '@@ -1,1 +1,1 @@',
      }],
    });
    const html = renderDiff([file], { outputFormat: 'line-by-line' });
    expect(html).not.toContain('hljs-');
  });

  it('renders only unified view when embed is true and format is line-by-line', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'line-by-line', embed: true });
    expect(html).toContain('gp-unified-wrapper');
    expect(html).not.toContain('gp-side-table');
  });

  it('renders only side-by-side view when embed is true and format is side-by-side', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'side-by-side', embed: true });
    expect(html).toContain('gp-side-table');
    expect(html).not.toContain('gp-unified-wrapper');
  });

  it('renders both views when embed is false', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'side-by-side' });
    expect(html).toContain('gp-side-table');
    expect(html).toContain('gp-unified-wrapper');
  });

  it('side-by-side cells have gp-code-inner wrapper', () => {
    const file = makeMockFile();
    const html = renderDiff([file], { outputFormat: 'side-by-side' });
    expect(html).toContain('gp-code-inner');
  });
});

describe('renderSidebar', () => {
  it('renders sidebar with file items', () => {
    const file = makeMockFile();
    const html = renderSidebar([file]);
    expect(html).toContain('gp-sidebar');
    expect(html).toContain('gp-file-item');
    expect(html).toContain('foo.ts');
  });

  it('renders correct file count', () => {
    const files = [makeMockFile(), makeMockFile({ newName: 'bar.ts', oldName: 'bar.ts' })];
    const html = renderSidebar(files);
    expect(html).toContain('Files (2)');
  });

  it('shows file status tags', () => {
    const added = makeMockFile({ isNew: true });
    const deleted = makeMockFile({ isDeleted: true });
    const renamed = makeMockFile({ isRename: true, oldName: 'old.ts', newName: 'new.ts' });
    expect(renderSidebar([added])).toContain('class="gp-file-icon added"');
    expect(renderSidebar([deleted])).toContain('class="gp-file-icon deleted"');
    expect(renderSidebar([renamed])).toContain('class="gp-file-icon renamed"');
  });

  it('renders directory tree structure for nested paths', () => {
    const files = [
      makeMockFile({ newName: 'src/core/parser.ts', oldName: 'src/core/parser.ts' }),
      makeMockFile({ newName: 'src/core/renderer.ts', oldName: 'src/core/renderer.ts' }),
      makeMockFile({ newName: 'src/ui/styles.ts', oldName: 'src/ui/styles.ts' }),
    ];
    const html = renderSidebar(files);
    expect(html).toContain('gp-tree-dir');
    expect(html).toContain('gp-tree-toggle');
    expect(html).toContain('gp-tree-folder');
  });

  it('uses nav element with aria-label', () => {
    const file = makeMockFile();
    const html = renderSidebar([file]);
    expect(html).toContain('role="navigation"');
    expect(html).toContain('aria-label="File tree"');
  });
});
