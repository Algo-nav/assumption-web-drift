import path from "node:path";

export const PORT = 3100;
export const NO_DB_PORT = 3101;
export const LIMITS_PORT = 3102;
export const DB_PATH = path.join(process.cwd(), "data", "requests-test.sqlite3");
// A path under a file, so the directory cannot be created and the database cannot be opened.
export const UNWRITABLE_DB_PATH = "/dev/null/requests.sqlite3";
export const LIMITS_DB_PATH = path.join(process.cwd(), "data", "requests-limits-test.sqlite3");
