import { defineConfig, devices } from "@playwright/test";

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = hostedBaseUrl ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL, trace: "on-first-retry" },
  webServer: hostedBaseUrl ? undefined : { command: "pnpm dev", url: baseURL, reuseExistingServer: !process.env.CI },
  projects: [
    { name: "chromium", testIgnore: /mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],
});
