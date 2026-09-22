import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pyodide โหลด pandas ครั้งแรกใช้เวลาหลายวินาที
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
