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

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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
