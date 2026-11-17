import { test, expect } from "@playwright/test";
import { INDEXNOW_KEY } from "./test-env.js";

test("/<key>.txt returns the key as text/plain", async ({ request }) => {
  const res = await request.get(`/${INDEXNOW_KEY}.txt`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  expect(await res.text()).toBe(INDEXNOW_KEY);
});

test("any other key-shaped .txt is 404, and the key without .txt is not served", async ({ request }) => {
  expect((await request.get("/another-key-0123456789.txt")).status()).toBe(404);
  expect((await request.get(`/${INDEXNOW_KEY}`)).status()).toBe(404);
  // The existing text routes are untouched by the rewrite.
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect((await request.get("/llms.txt")).status()).toBe(200);
});
