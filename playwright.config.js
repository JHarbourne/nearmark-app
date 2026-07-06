import { defineConfig, devices } from '@playwright/test'

// Accessibility regression gate. Builds the app in "test" mode (seed data, no
// Supabase — see .env.test), serves the production build, and scans the key
// public screens with axe-core. Runs in CI on every PR (see ci.yml).
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run build -- --mode test && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
})
