import { defineConfig } from "@playwright/test";
import { PORT, NO_DB_PORT, LIMITS_PORT, DB_PATH, LIMITS_DB_PATH, UNWRITABLE_DB_PATH, GA_ID, CLARITY_ID, INDEXNOW_KEY, BROWSER_ARGS } from "./tests/test-env.js";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { args: BROWSER_ARGS },
  },
  webServer: [
    {
      command: `rm -f ${DB_PATH}* && npm run build && npm run start -- -p ` + PORT,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        REQUESTS_DB_PATH: DB_PATH,
        // Inlined into the build that all three servers share.
        NEXT_PUBLIC_GA_ID: GA_ID,
        NEXT_PUBLIC_CLARITY_ID: CLARITY_ID,
        INDEXNOW_KEY,
      },
    },
    {
      // Reuses the build produced by the entry above (started sequentially beforehand).
      // Its database path cannot be created, so the request form's failure path runs for real.
      command: "npm run start -- -p " + NO_DB_PORT,
      url: `http://localhost:${NO_DB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        REQUESTS_DB_PATH: UNWRITABLE_DB_PATH,
        // Empty, so a key in the developer's shell does not leak in: this server is the "no key" case.
        INDEXNOW_KEY: "",
      },
    },
    {
      // Fresh database, used only by the abuse-limit tests, which fill it on purpose.
      command: `rm -f ${LIMITS_DB_PATH}* && npm run start -- -p ` + LIMITS_PORT,
      url: `http://localhost:${LIMITS_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        REQUESTS_DB_PATH: LIMITS_DB_PATH,
        INDEXNOW_KEY: "",
      },
    },
  ],
  projects: [
    {
      name: "default",
      testIgnore: ["**/requests-unavailable.spec.js", "**/requests-limits.spec.js", "**/indexnow-unset.spec.js"],
    },
    {
      name: "requests-unavailable",
      testMatch: "**/requests-unavailable.spec.js",
      use: { baseURL: `http://localhost:${NO_DB_PORT}` },
    },
    {
      // The server on NO_DB_PORT has no INDEXNOW_KEY.
      name: "indexnow-unset",
      testMatch: "**/indexnow-unset.spec.js",
      use: { baseURL: `http://localhost:${NO_DB_PORT}` },
    },
    {
      name: "requests-limits",
      testMatch: "**/requests-limits.spec.js",
      use: { baseURL: `http://localhost:${LIMITS_PORT}` },
    },
  ],
});
