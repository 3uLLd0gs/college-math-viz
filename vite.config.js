import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'taylor-series': resolve(__dirname, 'playgrounds/taylor-series/index.html'),
        'solids-of-revolution': resolve(__dirname, 'playgrounds/solids-of-revolution/index.html'),
        'partial-derivatives': resolve(__dirname, 'playgrounds/partial-derivatives/index.html'),
        'riemann-sums': resolve(__dirname, 'playgrounds/riemann-sums/index.html'),
        'secant-tangent': resolve(__dirname, 'playgrounds/secant-tangent/index.html'),
        'gradient': resolve(__dirname, 'playgrounds/gradient/index.html'),
        'vector-fields': resolve(__dirname, 'playgrounds/vector-fields/index.html'),
        'curl-divergence': resolve(__dirname, 'playgrounds/curl-divergence/index.html'),
        'greens-theorem': resolve(__dirname, 'playgrounds/greens-theorem/index.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
