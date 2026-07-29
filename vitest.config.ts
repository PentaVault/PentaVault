import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Ratchet: set just under the measured level so coverage cannot regress
      // silently. Raise these as coverage climbs rather than lowering them to
      // make a red build pass.
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 53,
        lines: 61,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
