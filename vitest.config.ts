import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        // The CLI entry point is exercised by spawning the built binary, so none of it is
        // attributed here even though tests/unit/cli-integration.test.ts drives it end to
        // end. Including it would report 0% for code that is in fact covered.
        'bin/**',
        // Every file here is a function that returns the client-side script or stylesheet
        // as one template literal. Calling it executes the single return statement, so v8
        // reports 100% while none of the JavaScript or CSS inside the string is measured —
        // a number that would be actively misleading. That code is covered by the
        // Playwright suite, which runs it in a real browser.
        'src/ui/**',
      ],
      thresholds: {
        // Just under the current numbers (99.2% / 92.4% / 100% / 99.2%): high enough to
        // catch a real drop, with enough slack that an unrelated refactor does not fail.
        statements: 97,
        branches: 90,
        functions: 100,
        lines: 97,
      },
    },
  },
});
