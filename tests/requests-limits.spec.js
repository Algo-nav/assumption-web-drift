import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { LIMITS_DB_PATH } from "./test-env.js";

// One shared database, filled in order, so these run serially.
test.describe.configure({ mode: "serial" });

const count = () => {
  const db = new Database(LIMITS_DB_PATH, { readonly: true });
  const n = db.prepare("SELECT COUNT(*) AS n FROM company_requests").get().n;
  db.close();
  return n;
};

const post = (request, ip, extra = {}) =>
  request.post("/api/requests", {
    headers: { "x-real-ip": ip },
    data: { company: "Costco", email: "a@example.com", role: "CIO", ...extra },
  });

test("honeypot: a filled hidden field looks like success and stores nothing", async ({ request }) => {
  const res = await post(request, "10.0.0.1", { website: "http://spam.example" });
  expect(res.status()).toBe(200);
  expect((await res.json()).ok).toBe(true);
  // The database file does not exist until something real is stored.
  const ok = await post(request, "10.0.0.2");
  expect(ok.status()).toBe(200);
  expect(count()).toBe(1);
});

test("honeypot field is in the form but not visible", async ({ page }) => {
  await page.goto("/");
  const field = page.locator("#req-website");
  await expect(field).toHaveCount(1);
  expect(await field.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThan(0);
});

test("per-IP limit: the 6th request in an hour is refused, other IPs are not", async ({ request }) => {
  const ip = "10.0.1.1";
  for (let i = 0; i < 5; i++) expect((await post(request, ip)).status()).toBe(200);
  const sixth = await post(request, ip);
  expect(sixth.status()).toBe(429);
  expect(count()).toBe(6);
  expect((await post(request, "10.0.1.2")).status()).toBe(200);
  expect(count()).toBe(7);
});

test("daily total: after 50 requests the form returns 503 and the failure message shows", async ({ request, page }) => {
  let i = 0;
  while (count() < 50) {
    expect((await post(request, `10.1.${Math.floor(i / 250)}.${(i % 250) + 1}`)).status()).toBe(200);
    i++;
  }
  expect(count()).toBe(50);

  const refused = await post(request, "10.9.9.9");
  expect(refused.status()).toBe(503);
  expect((await refused.json()).error).toBe("requests unavailable");
  expect(count()).toBe(50);

  await page.goto("/");
  await page.getByLabel("Company name or ticker", { exact: true }).fill("Costco");
  await page.getByLabel("Email").fill("late@example.com");
  await page.getByLabel("Role").selectOption("Analyst");
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/requests")),
    page.getByRole("button", { name: "Request a company" }).click(),
  ]);
  expect(res.status()).toBe(503);
  await expect(page.getByText("Something went wrong. Try again shortly.")).toBeVisible();
  await expect(page.getByText(/Recorded\./)).toHaveCount(0);
});
