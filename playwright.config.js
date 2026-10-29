import { defineConfig } from "@playwright/test";
import { PORT, NO_DB_PORT, LIMITS_PORT, DB_PATH, LIMITS_DB_PATH, UNWRITABLE_DB_PATH } from "./tests/test-env.js";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: [
    {
      command: `rm -f ${DB_PATH}* && npm run build && npm run start -- -p ` + PORT,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        REQUESTS_DB_PATH: DB_PATH,
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
      },
    },
  ],
  projects: [
    {
      name: "default",
      testIgnore: ["**/requests-unavailable.spec.js", "**/requests-limits.spec.js"],
    },
    {
      name: "requests-unavailable",
      testMatch: "**/requests-unavailable.spec.js",
      use: { baseURL: `http://localhost:${NO_DB_PORT}` },
    },
    {
      name: "requests-limits",
      testMatch: "**/requests-limits.spec.js",
      use: { baseURL: `http://localhost:${LIMITS_PORT}` },
    },
  ],
});
