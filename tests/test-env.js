import path from "node:path";

// The suite runs against a build with analytics configured, so the consent banner, the loader and the CSP's
// Google hosts are all under test. NEXT_PUBLIC_* is inlined at build time; the web servers and the test workers
// both read it from here. The id is a dummy.
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ||= "G-TEST0000000");
// REAL_GTAG=1 runs the consent spec once against Google's real loader:
//   REAL_GTAG=1 npx playwright test tests/consent.spec.js
export const REAL_GTAG = process.env.REAL_GTAG === "1";
// Otherwise no test reaches Google: these hosts resolve nowhere in the test browser, and the consent spec
// answers gtag.js itself. The production hostname resolves to the local server, so cookies on the parent
// domain can be tested for real.
export const PILOT_HOST = "pilot.scndorder.com";
const GOOGLE_HOSTS = ["www.googletagmanager.com", "www.google-analytics.com", "analytics.google.com", "region1.google-analytics.com", "region1.analytics.google.com"];
export const BROWSER_ARGS = [
  "--host-resolver-rules=" +
    [`MAP ${PILOT_HOST} 127.0.0.1`, ...(REAL_GTAG ? [] : GOOGLE_HOSTS.map((h) => `MAP ${h} ~NOTFOUND`))].join(", "),
];

export const PORT = 3100;
export const NO_DB_PORT = 3101;
export const LIMITS_PORT = 3102;
export const DB_PATH = path.join(process.cwd(), "data", "requests-test.sqlite3");
// A path under a file, so the directory cannot be created and the database cannot be opened.
export const UNWRITABLE_DB_PATH = "/dev/null/requests.sqlite3";
export const LIMITS_DB_PATH = path.join(process.cwd(), "data", "requests-limits-test.sqlite3");
