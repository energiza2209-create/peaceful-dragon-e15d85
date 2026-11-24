import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.js'],
    exclude: ['node_modules', 'test-results', 'playwright-report'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['data/**/*.js', 'shared/**/*.js'],
      exclude: ['node_modules', 'tests'],
    },
  },
});
