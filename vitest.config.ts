import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Astro bundles zod v4 under its own node_modules and never exposes it at
      // the project top level. The pure schema factories accept an injected `z`,
      // so unit/integration tests import that exact same zod here WITHOUT pulling
      // in the `astro:content` runtime. This alias only affects Vitest resolution.
      zod: fileURLToPath(
        new URL('./node_modules/astro/node_modules/zod', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/visual/**',
      'tests/accessibility/**',
      'node_modules/**',
      'dist/**',
    ],
  },
});
