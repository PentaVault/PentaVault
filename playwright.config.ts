import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  ...(process.env.CI ? { workers: 1 } : {}),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api',
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_MOCK_AUTH_ENABLED: process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED ?? 'true',
      NEXT_PUBLIC_MOCK_AUTH_EMAIL:
        process.env.NEXT_PUBLIC_MOCK_AUTH_EMAIL ?? 'demo@pentavault.local',
      NEXT_PUBLIC_MOCK_AUTH_PASSWORD:
        process.env.NEXT_PUBLIC_MOCK_AUTH_PASSWORD ?? 'demo-password-123',
      NEXT_PUBLIC_MOCK_AUTH_NAME: process.env.NEXT_PUBLIC_MOCK_AUTH_NAME ?? 'Demo User',
      NEXT_PUBLIC_MOCK_AUTH_USER_ID: process.env.NEXT_PUBLIC_MOCK_AUTH_USER_ID ?? 'mock-user-1',
    },
  },
})
