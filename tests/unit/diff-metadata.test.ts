import { describe, it, expect } from 'vitest';
import { parse, scanNoNewline } from '../../src/core/parser';
import { filePath, emptyBodyReason, renderDiff, renderSidebar } from '../../src/core/renderer';
import { computeDiffId } from '../../src/core/template';
import { resolveNewSideRef } from '../../src/cli/git';
import type { DiffFile } from 'diff2html/lib/types';

const NO_NEWLINE_DIFF = `diff --git a/eof.txt b/eof.txt
index 1111111..2222222 100644
--- a/eof.txt
+++ b/eof.txt
@@ -1 +1 @@
-no newline here
\\ No newline at end of file
+no newline here
`;

const DELETED_DIFF = `diff --git a/old.txt b/old.txt
deleted file mode 100644
index 1111111..0000000
--- a/old.txt
+++ /dev/null
@@ -1 +0,0 @@
-gone
`;

describe('scanNoNewline', () => {
  it('marks the line that lacks a trailing newline', () => {
    // diff2html drops the "\\ No newline" marker, so a newline-only change would
    // otherwise render as two identical rows with nothing to distinguish them.
    const marks = scanNoNewline(NO_NEWLINE_DIFF);
    expect(marks.has('0:L:1')).toBe(true);
    expect(marks.has('0:R:1')).toBe(false);
  });

  it('does not mistake the ---/+++ headers for content lines', () => {
    const marks = scanNoNewline(NO_NEWLINE_DIFF);
    expect(marks.size).toBe(1);
  });

  it('returns an empty set for a diff without the marker', () => {
    expect(scanNoNewline(DELETED_DIFF).size).toBe(0);
  });

  it('tracks file indices across multiple files', () => {
    const twoFiles = `diff --git a/a.txt b/a.txt
--- a/a.txt
+++ b/a.txt
@@ -1 +1 @@
-a
+a2
` + NO_NEWLINE_DIFF.replace('eof.txt', 'eof.txt');
    const marks = scanNoNewline(twoFiles);
    expect([...marks].every(k => k.startsWith('1:'))).toBe(true);
  });
});

describe('parse', () => {
  it('exposes the no-newline markers alongside the files', () => {
    const parsed = parse(NO_NEWLINE_DIFF);
    expect(parsed.noNewline.has('0:L:1')).toBe(true);
  });
});

describe('filePath', () => {
  it('resolves a deleted file to its old name rather than /dev/null', () => {
    const parsed = parse(DELETED_DIFF);
    expect(filePath(parsed.files[0])).toBe('old.txt');
  });

  it('keeps the new name for a normal modification', () => {
    const parsed = parse(NO_NEWLINE_DIFF);
    expect(filePath(parsed.files[0])).toBe('eof.txt');
  });
});

describe('deleted files in the output', () => {
  it('never renders a /dev/null path or a phantom dev/ folder', () => {
    const parsed = parse(DELETED_DIFF);
    const html = renderDiff(parsed.files) + renderSidebar(parsed.files);
    expect(html).not.toContain('/dev/null');
    expect(html).not.toContain('>null<');
    expect(html).toContain('old.txt');
  });
});

function fileWith(overrides: Partial<DiffFile>): DiffFile {
  return {
    blocks: [],
    deletedLines: 0,
    addedLines: 0,
    oldName: 'a.txt',
    newName: 'a.txt',
    isCombined: false,
    isGitDiff: true,
    language: 'txt',
    ...overrides,
  } as DiffFile;
}

describe('emptyBodyReason', () => {
  it('explains a binary file even when a synthetic block is present', () => {
    const file = fileWith({
      isBinary: true,
      blocks: [{ lines: [], oldStartLine: 0, oldStartLine2: null, newStartLine: 0, header: 'Binary file' }],
    });
    expect(emptyBodyReason(file)).toBe('Binary file not shown');
  });

  it('explains a rename with no content change', () => {
    expect(emptyBodyReason(fileWith({ isRename: true }))).toBe('File renamed without content changes');
  });

  it('explains an empty new file', () => {
    expect(emptyBodyReason(fileWith({ isNew: true }))).toBe('Empty file');
  });

  it('explains a mode-only change', () => {
    expect(emptyBodyReason(fileWith({ oldMode: '100644', newMode: '100755' })))
      .toBe('Mode changed 100644 → 100755');
  });

  it('returns null when there is real content to render', () => {
    const parsed = parse(DELETED_DIFF);
    expect(emptyBodyReason(parsed.files[0])).toBeNull();
  });
});

describe('empty file bodies in the output', () => {
  it('states why the body is empty instead of rendering a blank card', () => {
    const html = renderDiff([fileWith({ isRename: true, oldName: 'a.txt', newName: 'b.txt' })]);
    expect(html).toContain('File renamed without content changes');
  });

  it('does not attach expand controls to a binary file', () => {
    const file = fileWith({
      isBinary: true,
      blocks: [{ lines: [], oldStartLine: 0, oldStartLine2: null, newStartLine: 0, header: 'Binary file' }],
    });
    const html = renderDiff([file], {
      outputFormat: 'side-by-side',
      expandableFiles: new Set(['a.txt']),
    });
    expect(html).not.toContain('gp-expand-arrow');
  });
});

describe('computeDiffId', () => {
  it('differs between two diffs of the same repository', () => {
    const a = parse(NO_NEWLINE_DIFF).files;
    const b = parse(DELETED_DIFF).files;
    // Memo and review state are keyed on this; a shared id leaked notes between diffs.
    expect(computeDiffId(a)).not.toBe(computeDiffId(b));
  });

  it('is stable for the same diff', () => {
    expect(computeDiffId(parse(DELETED_DIFF).files)).toBe(computeDiffId(parse(DELETED_DIFF).files));
  });

  it('is a non-empty hex string', () => {
    expect(computeDiffId(parse(DELETED_DIFF).files)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('resolveNewSideRef', () => {
  it('uses the working tree when no refs are given', () => {
    expect(resolveNewSideRef({})).toBeNull();
  });

  it('uses the index for --staged', () => {
    expect(resolveNewSideRef({ staged: true })).toBe('');
  });

  it('uses the right-hand side of a range', () => {
    // Expanding context on a historical range must read that revision, not the checkout.
    expect(resolveNewSideRef({ refs: ['HEAD~5..HEAD~3'] })).toBe('HEAD~3');
    expect(resolveNewSideRef({ refs: ['main...feature'] })).toBe('feature');
  });

  it('falls back to HEAD for an open-ended range', () => {
    expect(resolveNewSideRef({ refs: ['main...'] })).toBe('HEAD');
  });

  it('uses the working tree for a single ref, matching git diff <rev>', () => {
    expect(resolveNewSideRef({ refs: ['HEAD~1'] })).toBeNull();
  });
});
