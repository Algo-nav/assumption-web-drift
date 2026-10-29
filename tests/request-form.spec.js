import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { DB_PATH } from "./test-env.js";

test("a request is stored with a timestamp and the success message shows", async ({ page }) => {
  await page.goto("/");
  const email = `pw-${Date.now()}@example.com`;
  await page.getByLabel("Company name or ticker", { exact: true }).fill("Costco");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption("CIO");

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/requests")),
    page.getByRole("button", { name: "Request a company" }).click(),
  ]);
  expect(res.status()).toBe(200);
  await expect(page.getByText(/Recorded\./)).toBeVisible();

  const db = new Database(DB_PATH, { readonly: true });
  const row = db.prepare("SELECT * FROM company_requests WHERE email = ?").get(email);
  db.close();
  expect(row.company).toBe("Costco");
  expect(row.role).toBe("CIO");
  expect(new Date(row.created_at).toString()).not.toBe("Invalid Date");
});

test("bad input is a 400, not stored", async ({ request }) => {
  const res = await request.post("/api/requests", { data: { company: "X", email: "nope", role: "CIO" } });
  expect(res.status()).toBe(400);
  const res2 = await request.post("/api/requests", { data: { company: "X", email: "a@b.co", role: "King" } });
  expect(res2.status()).toBe(400);
});
