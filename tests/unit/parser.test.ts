import { describe, it, expect } from 'vitest';
import { parse } from '../../src/core/parser';

const SIMPLE_DIFF = `diff --git a/file.ts b/file.ts
index abc1234..def5678 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 line1
-line2
+line2-modified
+line2b
 line3
`;

const MULTI_FILE_DIFF = `diff --git a/a.ts b/a.ts
index 111..222 100644
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,2 @@
-old
+new
 same
diff --git a/b.ts b/b.ts
new file mode 100644
index 0000000..333 100644
--- /dev/null
+++ b/b.ts
@@ -0,0 +1,2 @@
+new file line1
+new file line2
`;

describe('parse', () => {
  it('parses a simple diff into files and stats', () => {
    const result = parse(SIMPLE_DIFF);
    expect(result.files).toHaveLength(1);
    expect(result.stats.fileCount).toBe(1);
    expect(result.stats.totalAdditions).toBe(2);
    expect(result.stats.totalDeletions).toBe(1);
  });

  it('extracts file name correctly', () => {
    const result = parse(SIMPLE_DIFF);
    expect(result.files[0].newName).toBe('file.ts');
  });

  it('parses multiple files', () => {
    const result = parse(MULTI_FILE_DIFF);
    expect(result.files).toHaveLength(2);
    expect(result.stats.fileCount).toBe(2);
  });

  it('detects new files', () => {
    const result = parse(MULTI_FILE_DIFF);
    const newFile = result.files.find(f => f.newName === 'b.ts');
    expect(newFile).toBeDefined();
    expect(newFile!.isNew).toBe(true);
  });

  it('parses hunks with correct line numbers', () => {
    const result = parse(SIMPLE_DIFF);
    const blocks = result.files[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].oldStartLine).toBe(1);
    expect(blocks[0].newStartLine).toBe(1);
  });

  it('returns empty result for empty diff', () => {
    const result = parse('');
    expect(result.files).toHaveLength(0);
    expect(result.stats.fileCount).toBe(0);
  });
});
