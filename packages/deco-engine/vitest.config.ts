import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Phase 0 ships types only. Remove once the first ZHL-16C tests land so a
    // vanished test suite fails loudly instead of passing silently.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Type-only modules emit no runtime code; they cannot be covered.
      exclude: ['src/types.ts', 'src/index.ts'],
      // Safety-critical code — 100% coverage is a hard gate.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
