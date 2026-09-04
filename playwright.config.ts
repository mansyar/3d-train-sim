import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Two workers is the ceiling, not a suggestion: more workers hammer the
  // single shared dev server until it stops accepting connections and the
  // whole run goes red with "Could not connect" noise (observed with the
  // 10-worker local default; track e2e-stability_20260904). This also bakes
  // the historical --workers=2 rerun convention into the config.
  workers: 2,
  reporter: 'list',
  // Tablet-first with a phone project: the small-screen shell is first-class
  // at ≥360px, so both form factors are smoke-tested here. The `prod` project
  // runs the production build (served by `vite preview` on 5198) and covers
  // the prod-only assertions in e2e/prod.spec.ts (e.g. no debug grid toggle).
  projects: [
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
      testIgnore: /prod\.spec\.ts/,
    },
    {
      name: 'phone',
      use: { ...devices['iPhone 13'] },
      testIgnore: /prod\.spec\.ts/,
    },
    {
      name: 'prod',
      use: { ...devices['iPad Mini'], baseURL: 'http://localhost:5198' },
      testMatch: /prod\.spec\.ts/,
    },
  ],
  use: {
    baseURL: 'http://localhost:5199',
  },
  // Fixed high ports: 5173/5174 are commonly occupied by unrelated dev servers.
  // Invoke vite directly — `pnpm dev` swallows the port flag. The prod server
  // needs a `pnpm build` first (it serves the static `dist/`).
  webServer: [
    {
      command: 'pnpm exec vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm exec vite preview --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
