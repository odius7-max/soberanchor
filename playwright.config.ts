import { defineConfig, devices } from '@playwright/test'

/**
 * SoberAnchor e2e config.
 *
 * Point PLAYWRIGHT_BASE_URL at whatever environment you want to hit:
 *   - http://localhost:3000   (local `npm run dev`)
 *   - https://<branch>.vercel.app  (Vercel preview for the dev branch)
 *   - https://soberanchor.com (prod — read-only smokes only)
 *
 * Defaults to localhost so `npm run test:e2e` "just works" when the dev
 * server is already running.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
