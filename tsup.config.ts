import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  // CLI build
  {
    entry: ['bin/gh-like-diff.ts'],
    format: ['cjs'],
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
