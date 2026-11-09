import { defineConfig, devices } from "@playwright/test";

const DEV = (process.env.NODE_ENV ?? "production") === "development";

export default defineConfig({
  webServer: [
    {
      command: "bun run --filter @usenullish/nullish-server dev",
      url: "http://localhost:3000/health",
      reuseExistingServer: true,
    },
    ...(DEV
      ? [
          {
            command: "VITE_E2E=true bun run --filter @usenullish/nullish-client dev",
            url: "http://localhost:5173",
            reuseExistingServer: true,
          },
        ]
      : [
          {
            command:
              "VITE_E2E=true bun run --filter @usenullish/nullish-client build && PORT=5174 NULLISH_API_URL=http://localhost:3000 bun run --filter @usenullish/nullish-client start",
            url: "http://localhost:5174",
            timeout: 180_000,
            reuseExistingServer: false,
          },
          {
            command: "bun ./e2e/_proxy.ts",
            url: "http://localhost:5173",
            reuseExistingServer: false,
          },
        ]),
  ],
  testDir: "./e2e",
  snapshotDir: `./${DEV ? "tmp" : "e2e"}/snapshots`,
  testMatch: ["**/*.e2e.ts", "**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    testIdAttribute: "data-tid",
    baseURL: "http://localhost:5173",
    trace: "on",
    ...(DEV && { headless: false }),
    timezoneId: "Europe/Zurich",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
