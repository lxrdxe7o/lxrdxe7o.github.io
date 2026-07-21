import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
