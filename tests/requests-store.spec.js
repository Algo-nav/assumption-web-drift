import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Both tests recreate and share one database file, so they must not run in parallel.
test.describe.configure({ mode: "serial" });

const DB = path.join(process.cwd(), "data", "requests-store-test.sqlite3");
const FIXTURE = path.join(process.cwd(), "tests", "fixtures", "record-once.mjs");

function setup() {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB + suffix, { force: true });
  const db = new Database(DB);
  db.pragma("journal_mode = WAL");
  db.exec(
    "CREATE TABLE company_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL, ip TEXT NOT NULL DEFAULT 'unknown')"
  );
  return db;
}

function runChild(ip) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [FIXTURE, DB, ip], { env: { PATH: process.env.PATH }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`child exited ${code}: ${err}`))));
  });
}

test("12 simultaneous writers on one database cannot all pass the per-IP count", async () => {
  const db = setup();
  const results = await Promise.all(Array.from({ length: 12 }, () => runChild("203.0.113.90")));
  const stored = db.prepare("SELECT COUNT(*) AS n FROM company_requests WHERE ip = ?").get("203.0.113.90").n;
  db.close();
  expect(results.filter((r) => r === "ok")).toHaveLength(5);
  expect(results.filter((r) => r === "hour")).toHaveLength(7);
  expect(stored).toBe(5);
});

test("the daily total also holds under simultaneous writers", async () => {
  const db = setup();
  const insert = db.prepare("INSERT INTO company_requests (company, email, role, created_at, ip) VALUES ('X','x@example.com','CIO',?,?)");
  for (let i = 0; i < 46; i++) insert.run(new Date().toISOString(), `10.2.0.${i + 1}`);
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => runChild(`10.3.0.${i + 1}`)));
  const total = db.prepare("SELECT COUNT(*) AS n FROM company_requests").get().n;
  db.close();
  expect(results.filter((r) => r === "ok")).toHaveLength(4);
  expect(results.filter((r) => r === "day")).toHaveLength(6);
  expect(total).toBe(50);
});
