import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: 'tests/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Headless Chromium ships without GPU access; SwiftShader keeps the
          // WebGL probe and renderer path honest in CI and local headless runs.
          args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
          // A live DISPLAY makes ANGLE try a real X11/Vulkan connection and
          // fail before SwiftShader is attempted; clear it for headless runs.
          env: { ...process.env, DISPLAY: '' },
        },
      },
    },
    {
      name: 'a11y',
      testMatch: 'tests/accessibility/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
          env: { ...process.env, DISPLAY: '' },
        },
      },
    },
    {
      name: 'visual',
      testMatch: 'tests/visual/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
          env: { ...process.env, DISPLAY: '' },
        },
      },
    },
    {
      name: 'perf',
      testMatch: 'tests/performance/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
          env: { ...process.env, DISPLAY: '' },
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
