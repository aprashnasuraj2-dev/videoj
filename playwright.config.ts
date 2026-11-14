import { defineConfig } from '@playwright/test';

const browserName=(process.env.DHAGO_BROWSER ?? 'chromium') as 'chromium'|'firefox'|'webkit';
const chromeExecutable=browserName==='chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE : undefined;

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{
    name: browserName,
    use: {
      browserName,
      baseURL: process.env.DHAGO_LIVE_URL || 'http://127.0.0.1:4173',
      trace: 'retain-on-failure',
      ...(chromeExecutable ? { launchOptions: { executablePath: chromeExecutable } } : {}),
    },
  }],
  webServer: process.env.DHAGO_LIVE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
