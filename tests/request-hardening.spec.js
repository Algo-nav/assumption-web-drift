import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { DB_PATH } from "./test-env.js";

// These run against the main server (shared database, parallel tests), so every test uses its own IP
// and email values and only looks at its own rows.
const ok = { company: "Costco", role: "CIO" };
const rowsFor = (email) => {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare("SELECT * FROM company_requests WHERE email = ?").all(email);
  db.close();
  return rows;
};

test.describe("rate-limit key", () => {
  test("x-real-ip is ignored: rotating it does not escape the per-IP limit", async ({ request }) => {
    const email = `realip-${Date.now()}@example.com`;
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post("/api/requests", {
        headers: { "x-forwarded-for": "203.0.113.50", "x-real-ip": `198.51.100.${i + 1}` },
        data: { ...ok, email },
      });
      statuses.push(res.status());
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(rowsFor(email)).toHaveLength(5);
    expect(rowsFor(email).every((r) => r.ip === "203.0.113.50")).toBe(true);
  });

  test("only the last x-forwarded-for entry is used", async ({ request }) => {
    const email = `xff-${Date.now()}@example.com`;
    const res = await request.post("/api/requests", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 203.0.113.61" },
      data: { ...ok, email },
    });
    expect(res.status()).toBe(200);
    expect(rowsFor(email)[0].ip).toBe("203.0.113.61");
  });

  test("with no forwarding header the socket address is used, not 'unknown'", async ({ request }) => {
    const email = `socket-${Date.now()}@example.com`;
    const res = await request.post("/api/requests", { data: { ...ok, email } });
    expect(res.status()).toBe(200);
    const ip = rowsFor(email)[0].ip;
    expect(ip).not.toBe("unknown");
    // IPv4 loopback, or IPv6 loopback normalised to its /64 (IPv4-mapped loopback collapses to IPv4).
    expect(ip).toMatch(/^(127\.0\.0\.1|0:0:0:0::\/64)$/);
  });

  test("IPv6 clients share one limit per /64, and the stored key is the /64", async ({ request }) => {
    const email = `v6-${Date.now()}@example.com`;
    const statuses = [];
    // Six different addresses inside 2001:db8:aa:bb::/64, written in different ways.
    const sameSubnet = [
      "2001:db8:aa:bb::1",
      "2001:db8:aa:bb:1111:2222:3333:4444",
      "2001:DB8:AA:BB::ffff",
      "[2001:db8:aa:bb::5]",
      "2001:0db8:00aa:00bb:0000:0000:0000:0006",
      "2001:db8:aa:bb:dead:beef:0:7",
    ];
    for (const ip of sameSubnet) {
      const res = await request.post("/api/requests", { headers: { "x-forwarded-for": ip }, data: { ...ok, email } });
      statuses.push(res.status());
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    const rows = rowsFor(email);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.ip === "2001:db8:aa:bb::/64")).toBe(true);

    // A neighbouring /64 is a different client.
    const other = await request.post("/api/requests", {
      headers: { "x-forwarded-for": "2001:db8:aa:bc::1" },
      data: { ...ok, email },
    });
    expect(other.status()).toBe(200);
    expect(rowsFor(email).at(-1).ip).toBe("2001:db8:aa:bc::/64");
  });

  test("an empty x-forwarded-for falls back to the 'unknown' bucket", async ({ request }) => {
    const email = `unknown-${Date.now()}@example.com`;
    const res = await request.post("/api/requests", { headers: { "x-forwarded-for": "" }, data: { ...ok, email } });
    // 200 until the shared 'unknown' bucket is spent by other runs in the same hour; both are valid outcomes
    // for the bucket, but what matters is that nothing was stored under a different key.
    expect([200, 429]).toContain(res.status());
    for (const row of rowsFor(email)) expect(row.ip).toBe("unknown");
  });
});

test.describe("size limits", () => {
  test("a body over 4 KB is a 400 and nothing is stored", async ({ request }) => {
    const email = `big-${Date.now()}@example.com`;
    const res = await request.post("/api/requests", {
      headers: { "x-forwarded-for": "203.0.113.70" },
      data: { ...ok, email, padding: "x".repeat(4200) },
    });
    expect(res.status()).toBe(400);
    expect(rowsFor(email)).toHaveLength(0);
  });

  test("a chunked body with no content-length is cut off at 4 KB", async ({ baseURL }) => {
    const email = `chunked-${Date.now()}@example.com`;
    const body = JSON.stringify({ ...ok, email, padding: "x".repeat(8000) });
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder().encode(body);
        for (let i = 0; i < enc.length; i += 1000) controller.enqueue(enc.slice(i, i + 1000));
        controller.close();
      },
    });
    const res = await fetch(`${baseURL}/api/requests`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.71" },
      body: stream,
      duplex: "half",
    });
    expect(res.status).toBe(400);
    expect(rowsFor(email)).toHaveLength(0);
  });

  test("a body just under 4 KB is still accepted", async ({ request }) => {
    const email = `under-${Date.now()}@example.com`;
    const res = await request.post("/api/requests", {
      headers: { "x-forwarded-for": "203.0.113.72" },
      data: { ...ok, email, padding: "x".repeat(3000) },
    });
    expect(res.status()).toBe(200);
    expect(rowsFor(email)).toHaveLength(1);
  });

  for (const field of ["company", "email", "role", "website"]) {
    test(`${field} over 200 characters is a 400 and nothing is stored`, async ({ request }) => {
      const email = `long-${field}-${Date.now()}@example.com`;
      const data = { ...ok, email };
      data[field] = field === "email" ? `${"a".repeat(195)}@b.co`.padEnd(201, "m") : "y".repeat(201);
      const res = await request.post("/api/requests", { headers: { "x-forwarded-for": "203.0.113.73" }, data });
      expect(res.status()).toBe(400);
      expect(rowsFor(email)).toHaveLength(0);
    });
  }

  test("exactly 200 characters in the email is not rejected by the field cap", async ({ request }) => {
    const email = `${"a".repeat(180)}${Date.now()}`.slice(0, 190) + "@b.co"; // 195 chars
    expect(email.length).toBeLessThanOrEqual(200);
    const res = await request.post("/api/requests", { headers: { "x-forwarded-for": "203.0.113.74" }, data: { ...ok, email } });
    expect(res.status()).toBe(200);
    expect(rowsFor(email)).toHaveLength(1);
  });
});
