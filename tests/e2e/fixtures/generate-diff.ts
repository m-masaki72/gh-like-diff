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

function buildHtmlPage(diffStr: string, format: 'side-by-side' | 'line-by-line' = 'side-by-side'): string {
  // We need to dynamically require the built library
  const libPath = join(__dirname, '..', '..', '..', 'dist', 'index.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require(libPath);
  return lib.generate(diffStr, { outputFormat: format });
}

export const test = base.extend<{ diffPageUrl: string; unifiedDiffPageUrl: string }>({
  diffPageUrl: async ({}, use) => {
    const html = buildHtmlPage(SAMPLE_DIFF, 'side-by-side');
    const dir = mkdtempSync(join(tmpdir(), 'gld-e2e-'));
    const filePath = join(dir, 'diff.html');
    writeFileSync(filePath, html);
    await use(`file://${filePath}`);
  },
  unifiedDiffPageUrl: async ({}, use) => {
    const html = buildHtmlPage(SAMPLE_DIFF, 'line-by-line');
    const dir = mkdtempSync(join(tmpdir(), 'gld-e2e-'));
    const filePath = join(dir, 'diff-unified.html');
    writeFileSync(filePath, html);
    await use(`file://${filePath}`);
  },
});

export { expect } from '@playwright/test';
