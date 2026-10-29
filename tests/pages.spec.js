import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const records = readRecords();
const resolved = records.find((r) => r.status === "met" && r.outcome);

test.describe("pages load", () => {
  for (const [url, heading] of [
    ["/", /What companies guided/],
    ["/company/NVDA", /NVIDIA/],
    [`/row/${resolved.record_id}`, /./],
    ["/compare", /Compare two periods/],
    ["/methodology", /What 15 companies guided/],
    ["/about", /About/],
  ]) {
    test(`${url} loads with footer`, async ({ page }) => {
      const res = await page.goto(url);
      expect(res.status()).toBe(200);
      await expect(page.locator("h1").first()).toContainText(heading);
      await expect(page.locator("footer")).toContainText("CC-BY-4.0");
      await expect(page.locator("footer")).toContainText("SEC EDGAR");
    });
  }

  test("unknown ticker and row are 404", async ({ request }) => {
    expect((await request.get("/company/NOPE")).status()).toBe(404);
    expect((await request.get("/row/NOPE")).status()).toBe(404);
  });
});

test.describe("home", () => {
  test("headline numbers match the data file", async ({ page }) => {
    await page.goto("/");
    const missed = records.filter((r) => r.status === "missed");
    const never = missed.filter((r) => !r.acknowledged_at).length;
    await expect(page.locator('[data-stat="rows"]')).toHaveText(records.length.toLocaleString("en-US"));
    await expect(page.locator('[data-stat="met"]')).toHaveText(String(records.filter((r) => r.status === "met").length));
    await expect(page.locator('[data-stat="missed"]')).toHaveText(String(missed.length));
    await expect(page.locator('[data-stat="never"]')).toHaveText(`${((never / missed.length) * 100).toFixed(1)}%`);
  });

  test("search narrows by name and ticker", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("list", { name: "Companies" });
    await expect(list.getByRole("link")).toHaveCount(15);
    await page.getByLabel("Find a company").fill("nvda");
    await expect(list.getByRole("link")).toHaveCount(1);
    await page.getByLabel("Find a company").fill("home");
    await expect(list.getByRole("link")).toContainText(["Home Depot"]);
  });
});

test.describe("company page", () => {
  test("NVDA shows 212 rows", async ({ page }) => {
    await page.goto("/company/NVDA");
    await expect(page.getByTestId("row-count")).toHaveText("Showing 212 of 212 rows");
    await expect(page.locator("tr[data-row]")).toHaveCount(212);
  });

  test("a filter changes the count", async ({ page }) => {
    await page.goto("/company/NVDA");
    const before = await page.locator("tr[data-row]").count();
    await page.getByLabel("Metric").selectOption("revenue");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/metric=revenue/);
    const expected = records.filter((r) => r.ticker === "NVDA" && r.assumption.metric === "revenue").length;
    await expect(page.locator("tr[data-row]")).toHaveCount(expected);
    expect(expected).toBeLessThan(before);
    await page.getByLabel("Fiscal year").selectOption("2024");
    await page.getByRole("button", { name: "Apply filters" }).click();
    const both = records.filter(
      (r) => r.ticker === "NVDA" && r.assumption.metric === "revenue" && /FY2024$/.test(r.assumption.target_period)
    ).length;
    await expect(page.locator("tr[data-row]")).toHaveCount(both);
  });

  test("rows print units and link to the row page", async ({ page }) => {
    await page.goto("/company/NVDA?metric=revenue");
    await expect(page.locator("tr[data-row]").first()).toContainText("$");
    await page.locator("tr[data-row] a").first().click();
    await expect(page).toHaveURL(/\/row\//);
  });
});

test.describe("row page", () => {
  test("shows two EDGAR links, review label and the reviewer", async ({ page }) => {
    await page.goto(`/row/${resolved.record_id}`);
    await expect(page.locator("a[data-edgar-link]")).toHaveCount(2);
    for (const href of await page.locator("a[data-edgar-link]").evaluateAll((els) => els.map((e) => e.href))) {
      expect(href).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\//);
    }
    await expect(page.getByTestId("review-label")).toHaveText("review: hand-reviewed");
    await expect(page.getByText(resolved.record_id)).toBeVisible();
  });

  test("an acknowledged row shows a third link", async ({ page }) => {
    const ack = records.find((r) => r.acknowledgement_evidence);
    await page.goto(`/row/${ack.record_id}`);
    await expect(page.locator("a[data-edgar-link]")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "The acknowledgement" })).toBeVisible();
  });

  test("a worse miss is red and a better miss is not", async ({ page }) => {
    // UNH FY2020 revenue: guided $260 to $262 billion, reported $257.1 billion, so worse than guided.
    const worse = records.find(
      (r) => r.ticker === "UNH" && r.status === "missed" && r.assumption.metric === "revenue" && r.assumption.target_period === "FY2020" && r.outcome.reported_value < r.assumption.target_low
    );
    await page.goto(`/row/${worse.record_id}`);
    const badge = page.locator("dl.facts .status");
    await expect(badge).toHaveClass(/status-worse/);
    await expect(badge).toHaveCSS("color", "rgb(185, 28, 28)");

    // NVDA revenue: higher is better, so only misses below the low end are red.
    const nv = records.filter((r) => r.ticker === "NVDA" && r.assumption.metric === "revenue" && r.status === "missed");
    const nvWorse = nv.filter((r) => r.outcome.reported_value < r.assumption.target_low).length;
    expect(nvWorse).toBeGreaterThan(0);
    expect(nv.length).toBeGreaterThan(nvWorse);
    await page.goto("/company/NVDA?metric=revenue");
    await expect(page.locator(".status-worse")).toHaveCount(nvWorse);
    await expect(page.locator("tr[data-row] td", { hasText: /^better$/ })).toHaveCount(nv.length - nvWorse);
  });
});

test.describe("compare", () => {
  test("shows two rows side by side", async ({ page }) => {
    await page.goto("/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025");
    await expect(page.locator("[data-compare-side]")).toHaveCount(2);
    await expect(page.locator("[data-compare-side]").first()).toContainText("Q1 FY2024");
    await expect(page.locator("[data-compare-side]").nth(1)).toContainText("Q1 FY2025");
    expect(await page.locator("a[data-edgar-link]").count()).toBeGreaterThanOrEqual(2);
  });

  test("the picker drives the page", async ({ page }) => {
    await page.goto("/compare");
    await page.getByLabel("Company").selectOption("NVDA");
    await page.getByLabel("Metric").selectOption("revenue");
    await page.getByRole("button", { name: "Compare" }).click();
    await expect(page).toHaveURL(/\/compare\?t=NVDA&m=revenue/);
    await expect(page.locator("[data-compare-side]")).toHaveCount(2);
  });
});

test.describe("methodology", () => {
  test("keeps the section on what the model got wrong", async ({ page }) => {
    await page.goto("/methodology");
    await expect(page.getByRole("heading", { name: "What the model got wrong" })).toBeVisible();
    await expect(page.getByText("Rejected by code guards before anyone read them")).toBeVisible();
  });
});

test.describe("about", () => {
  test("has the three links and the licence line", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText("assumption-drift is a product of SCND Order, built by Navneet")).toBeVisible();
    await expect(page.getByRole("link", { name: "dataset" })).toHaveAttribute("href", /huggingface\.co\/datasets\/Nav772\/assumption-drift/);
    await expect(page.getByRole("link", { name: "Space" })).toHaveAttribute("href", /huggingface\.co\/spaces\/Nav772\/assumption-drift/);
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", /github\.com\/Algo-nav\/assumption-drift/);
    await expect(page.locator("main")).toContainText("CC-BY-4.0");
  });
});
