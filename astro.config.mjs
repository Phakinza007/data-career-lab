import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  // GitHub Pages จะตั้ง BASE_PATH=/data-career-lab/ ตอน deploy (Plan 6)
  base: process.env.BASE_PATH ?? '/',
  integrations: [mdx(), react()],
  vite: {
    optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
    worker: { format: 'es' },
  },
});
