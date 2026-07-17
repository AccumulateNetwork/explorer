import { defineConfig } from 'vitest/config';

// Test runner config kept separate from vite.config.js so the build config
// (node polyfills, manual chunks) does not affect the test environment.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
