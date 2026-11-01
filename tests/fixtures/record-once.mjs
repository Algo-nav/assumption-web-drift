// Child process for the transaction test: one competing writer on a shared database file.
// Usage: node record-once.mjs <db-path> <ip>
import Database from "better-sqlite3";
import { recordRequest } from "../../app/lib/requests-store.js";

const [dbPath, ip] = process.argv.slice(2);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 10000");
const outcome = recordRequest(db, {
  company: "Costco",
  email: "race@example.com",
  role: "CIO",
  ip,
  perIpPerHour: 5,
  perDay: 50,
});
db.close();
console.log(outcome);
