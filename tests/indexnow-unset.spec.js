import { test, expect } from "@playwright/test";
import { INDEXNOW_KEY } from "./test-env.js";

// Runs against the server started without INDEXNOW_KEY (see playwright.config.js).
test("/<key>.txt is 404 when INDEXNOW_KEY is unset", async ({ request }) => {
  const res = await request.get(`/${INDEXNOW_KEY}.txt`);
  expect(res.status()).toBe(404);
  expect(await res.text()).not.toContain(INDEXNOW_KEY);
});
