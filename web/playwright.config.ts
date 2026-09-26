import { defineConfig } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests against a production build (next build + next start), as
 * the Next.js testing guide recommends. Runs on the locally installed Chrome
 * (`channel: "chrome"`), so no Playwright browser download is needed here; CI
 * needs `npx playwright install chrome` (or a Chrome image) first.
 *
 * Screenshot baselines are platform-specific (…-chrome-win32.png on Windows);
 * a Linux CI runner needs its own baselines (`--update-snapshots` once).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  // At most 2 browsers locally (the laptop runs near 85% RAM); CI uses the default.
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  projects: [{ name: "chrome", use: { channel: "chrome" } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
