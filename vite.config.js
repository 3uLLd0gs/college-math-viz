import { defineConfig } from 'vite';
import { resolve } from 'path';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'taylor-series': resolve(__dirname, 'playgrounds/taylor-series/index.html'),
        'solids-of-revolution': resolve(__dirname, 'playgrounds/solids-of-revolution/index.html'),
        'partial-derivatives': resolve(__dirname, 'playgrounds/partial-derivatives/index.html'),
        'riemann-sums': resolve(__dirname, 'playgrounds/riemann-sums/index.html'),
        'unit-circle': resolve(__dirname, 'playgrounds/unit-circle/index.html'),
        'secant-tangent': resolve(__dirname, 'playgrounds/secant-tangent/index.html'),
        'related-rates': resolve(__dirname, 'playgrounds/related-rates/index.html'),
        'gradient': resolve(__dirname, 'playgrounds/gradient/index.html'),
        'vector-fields': resolve(__dirname, 'playgrounds/vector-fields/index.html'),
        'curl-divergence': resolve(__dirname, 'playgrounds/curl-divergence/index.html'),
        'greens-theorem': resolve(__dirname, 'playgrounds/greens-theorem/index.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    // e2e/ holds Playwright specs (run via `npm run test:e2e`), not Vitest
    // unit tests — without this they match Vitest's default *.spec.js glob
    // and fail to load because they import '@playwright/test'.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
