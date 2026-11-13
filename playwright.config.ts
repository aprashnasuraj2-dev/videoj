import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.DHAGO_LIVE_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
  webServer: process.env.DHAGO_LIVE_URL ? undefined : { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
