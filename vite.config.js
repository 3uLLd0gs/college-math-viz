import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'taylor-series': resolve(__dirname, 'playgrounds/taylor-series/index.html'),
        'partial-derivatives': resolve(__dirname, 'playgrounds/partial-derivatives/index.html'),
      },
    },
  },
});
