import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — Smoke + E2E for QA gate.
 * Install once locally:  bunx playwright install --with-deps chromium
 * Run smoke only:        bun run e2e:smoke
 * Run full E2E:          bun run e2e
 *
 * See docs/qa-onboarding.md for credentials and docs/test-accounts.md for the role matrix.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "smoke",   testMatch: /.*\.smoke\.spec\.ts/,   use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-smoke", testMatch: /.*\.smoke\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "chromium", testMatch: /.*\.e2e\.spec\.ts/,    use: { ...devices["Desktop Chrome"] } },
    { name: "mobile",   testMatch: /.*\.e2e\.spec\.ts/,    use: { ...devices["iPhone 13"] } },
  ],

  // Spin up dev server when testing locally (override with E2E_BASE_URL=http://localhost:8080).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
