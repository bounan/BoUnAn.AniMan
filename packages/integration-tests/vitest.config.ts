import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: resolve(__dirname, '../..'),
  test: {
    globals: true,
    include: ['packages/integration-tests/tests/**/*.test.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
      include: ['packages/app/src/handlers/**/handler.ts'],
    },
  },
});
