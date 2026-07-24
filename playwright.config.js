import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npx vite preview --port 4188',
    port: 4188,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:4188' },
});
