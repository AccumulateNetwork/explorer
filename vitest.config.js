import { defineConfig } from 'vitest/config';

// Test runner config kept separate from vite.config.js so the build config
// (node polyfills, manual chunks) does not affect the test environment.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // jsx/js included too: 11 .jsx files exist and their tests were
    // silently skipped by a ts/tsx-only glob (#67).
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
  },
});
