import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Type-aware rules for the code that ships. They need the TypeScript program, which is
  // why they are scoped rather than applied to config files as well.
  {
    files: ['src/**/*.ts', 'bin/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.node,
    },
    rules: {
      // A clipboard write or a git read that rejects unnoticed is exactly the class of bug
      // this project keeps finding: a control that silently does nothing.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Unused code is already caught by noUnusedLocals/noUnusedParameters in tsconfig.
      '@typescript-eslint/no-unused-vars': 'off',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Tests and tooling: they reach for `any` and non-null assertions to set up awkward
  // states, and the screenshot script runs code inside the browser via page.evaluate, so
  // both the Node and the DOM globals are legitimate here.
  {
    files: ['tests/**/*.ts', '*.config.ts', 'eslint.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty-pattern': 'off',
      // Stripping ANSI colour codes from CLI output needs \x1b in a pattern.
      'no-control-regex': 'off',
    },
  },
);
