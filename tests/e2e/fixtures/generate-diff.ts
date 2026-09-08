import { test as base } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SAMPLE_DIFF = `diff --git a/src/utils.ts b/src/utils.ts
index abc1234..def5678 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,8 +1,9 @@
 import { Config } from './config';

 export function greet(name: string): string {
-  return \`Hello, \${name}!\`;
+  return \`Hello, \${name}! Welcome!\`;
+  // Added welcome suffix
 }

 export function add(a: number, b: number): number {
@@ -15,7 +16,7 @@ export function multiply(a: number, b: number): number {
 }

 export function subtract(a: number, b: number): number {
-  return a - b;
+  return Math.abs(a - b);
 }

 export function divide(a: number, b: number): number {
diff --git a/src/config.ts b/src/config.ts
index 1111111..2222222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,5 +1,7 @@
 export interface Config {
   name: string;
+  version: number;
+  debug: boolean;
 }

 export const defaultConfig: Config = {
`;

// Sources for the two files above, so the context-expand controls have something to
// reveal. Without them the buttons are (correctly) not rendered at all.
const SAMPLE_SOURCES: Record<string, string[]> = {
  'src/utils.ts': Array.from({ length: 40 }, (_, i) => `// utils line ${i + 1}`),
  'src/config.ts': Array.from({ length: 20 }, (_, i) => `// config line ${i + 1}`),
};

/**
 * A deliberately awkward diff: the cases the original single-file fixture could never
 * exercise — binaries, pure renames, empty files, missing trailing newlines, nested
 * directories (which reorder the sidebar), very long lines, astral characters, and a
 * file large enough to have first/middle/last gaps.
 */
function buildEdgeCaseDiff(): { diff: string; sources: Record<string, string[]> } {
  const long = 'y'.repeat(400);
  const diff = `diff --git a/README.md b/README.md
index 1111111..2222222 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,2 @@
 line1
-line2
+line2 changed
diff --git a/a.txt b/b.txt
similarity index 100%
rename from a.txt
rename to b.txt
diff --git a/empty.txt b/empty.txt
new file mode 100644
index 0000000..e69de29
diff --git a/eof.txt b/eof.txt
index 1111111..2222222 100644
--- a/eof.txt
+++ b/eof.txt
@@ -1 +1 @@
-no newline here
\\ No newline at end of file
+no newline here
diff --git a/logo.png b/logo.png
new file mode 100644
index 0000000..3333333
Binary files /dev/null and b/logo.png differ
diff --git a/oldfile.txt b/oldfile.txt
deleted file mode 100644
index 1111111..0000000
--- a/oldfile.txt
+++ /dev/null
@@ -1 +0,0 @@
-to be deleted
diff --git a/src/deep/nested/module.ts b/src/deep/nested/module.ts
index 1111111..2222222 100644
--- a/src/deep/nested/module.ts
+++ b/src/deep/nested/module.ts
@@ -147,7 +147,7 @@
   const nested_147 = 147;
   const nested_148 = 148;
   const nested_149 = 149;
-  const nested_150 = 150;
+  const nested_150 = 150; // MODIFIED
   const nested_151 = 151;
   const nested_152 = 152;
   const nested_153 = 153;
@@ -217,7 +217,7 @@
   const nested_217 = 217;
   const nested_218 = 218;
   const nested_219 = 219;
-  const nested_220 = 220;
+  const nested_220 = 220; // MODIFIED
   const nested_221 = 221;
   const nested_222 = 222;
   const nested_223 = 223;
diff --git a/src/long.ts b/src/long.ts
index 1111111..2222222 100644
--- a/src/long.ts
+++ b/src/long.ts
@@ -1,2 +1,2 @@
-const url = "x";
+const url = "${long}";
 const short = 1;
diff --git a/src/unicode.ts b/src/unicode.ts
index 1111111..2222222 100644
--- a/src/unicode.ts
+++ b/src/unicode.ts
@@ -1,2 +1,2 @@
-const emoji = "🎉 done";
+const emoji = "🎊 done";
 const tail = 1;
`;

  const sources: Record<string, string[]> = {
    'src/deep/nested/module.ts': Array.from({ length: 300 }, (_, i) => `  const nested_${i + 1} = ${i + 1};`),
    'README.md': ['line1', 'line2 changed'],
    'src/long.ts': [`const url = "${long}";`, 'const short = 1;'],
    'src/unicode.ts': ['const emoji = "🎊 done";', 'const tail = 1;'],
  };
  return { diff, sources };
}

function buildHtmlPage(
  diffStr: string,
  format: 'side-by-side' | 'line-by-line',
  fileContents?: Record<string, string[]>,
): string {
  const libPath = join(__dirname, '..', '..', '..', 'dist', 'index.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require(libPath);
  return lib.generate(diffStr, { outputFormat: format, fileContents, repoName: 'fixture' });
}

function writePage(html: string, name: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'gld-e2e-'));
  const filePath = join(dir, name);
  writeFileSync(filePath, html);
  return `file://${filePath}`;
}

export const test = base.extend<{
  diffPageUrl: string;
  unifiedDiffPageUrl: string;
  edgeCasePageUrl: string;
  edgeCaseUnifiedPageUrl: string;
}>({
  diffPageUrl: async ({}, use) => {
    await use(writePage(buildHtmlPage(SAMPLE_DIFF, 'side-by-side', SAMPLE_SOURCES), 'diff.html'));
  },
  unifiedDiffPageUrl: async ({}, use) => {
    await use(writePage(buildHtmlPage(SAMPLE_DIFF, 'line-by-line', SAMPLE_SOURCES), 'diff-unified.html'));
  },
  edgeCasePageUrl: async ({}, use) => {
    const { diff, sources } = buildEdgeCaseDiff();
    await use(writePage(buildHtmlPage(diff, 'side-by-side', sources), 'edge.html'));
  },
  edgeCaseUnifiedPageUrl: async ({}, use) => {
    const { diff, sources } = buildEdgeCaseDiff();
    await use(writePage(buildHtmlPage(diff, 'line-by-line', sources), 'edge-unified.html'));
  },
});

export { expect } from '@playwright/test';
