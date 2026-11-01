import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let cachedDb;

// Returns the requests database, or null when the path is unset. Throws when the path cannot be opened.
export function getRequestsDb() {
  const dbPath = process.env.REQUESTS_DB_PATH;
  if (!dbPath) {
    console.error("REQUESTS_DB_PATH is not set. Company requests are not being stored.");
    return null;
  }
  if (cachedDb) return cachedDb;

  // The file holds requester emails: owner-only for anything this process creates.
  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new Database(dbPath);
  try {
    fs.chmodSync(dbPath, 0o600);
  } catch (err) {
    console.warn(`could not restrict permissions on ${dbPath}: ${err.message}`);
  }
  db.pragma("journal_mode = WAL");
  // Wait for a competing writer (a second process on the same file) instead of failing straight away.
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ip TEXT NOT NULL DEFAULT 'unknown'
    )
  `);
  // Databases created before the ip column existed.
  const cols = db.prepare("PRAGMA table_info(company_requests)").all();
  if (!cols.some((c) => c.name === "ip")) {
    db.exec("ALTER TABLE company_requests ADD COLUMN ip TEXT NOT NULL DEFAULT 'unknown'");
  }
  db.exec("CREATE INDEX IF NOT EXISTS company_requests_ip_created ON company_requests (ip, created_at)");
  cachedDb = db;
  return cachedDb;
}
