import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  // Tablet-first with a phone project: the small-screen shell is first-class
  // at ≥360px, so both form factors are smoke-tested here.
  projects: [
    { name: 'tablet', use: { ...devices['iPad Mini'] } },
    { name: 'phone', use: { ...devices['iPhone 13'] } },
  ],
  use: {
    baseURL: 'http://localhost:5199',
  },
  // Fixed high port: 5173/5174 are commonly occupied by unrelated dev servers.
  // Invoke vite directly — `pnpm dev` swallows the port flag.
  webServer: {
    command: 'pnpm exec vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
