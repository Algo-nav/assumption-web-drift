import { test, expect } from "@playwright/test";

test.describe("POST /api/requests with an unwritable database path", () => {
  test("returns 503, failure message renders, success message does not", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Company name or ticker", { exact: true }).fill("Costco");
    await page.getByLabel("Email").fill(`pw-unavailable-${Date.now()}@example.com`);
    await page.getByLabel("Role").selectOption("Analyst");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/requests")),
      page.getByRole("button", { name: "Request a company" }).click(),
    ]);

    expect(response.status()).toBe(503);
    expect((await response.json()).error).toBe("requests unavailable");
    await expect(page.getByText("Something went wrong. Try again shortly.")).toBeVisible();
    await expect(page.getByText(/Recorded\./)).toHaveCount(0);
  });
});
