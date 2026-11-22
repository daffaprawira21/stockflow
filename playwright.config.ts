import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/start-e2e-server.mjs',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
