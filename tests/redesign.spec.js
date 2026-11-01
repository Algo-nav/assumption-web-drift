import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const records = readRecords();
const resolved = records.find((r) => r.status === "met" && r.outcome && r.assumption.target_low !== r.assumption.target_high);

test.describe("home", () => {
  test("has three stat tiles and each one links", async ({ page }) => {
    await page.goto("/");
    const tiles = page.locator("[data-tile]");
    await expect(tiles).toHaveCount(3);
    for (const tile of await tiles.all()) {
      expect(await tile.evaluate((el) => el.tagName)).toBe("A");
      await expect(tile).toHaveAttribute("href", /.+/);
    }
    const worse = records.filter((r) => r.status === "missed" && !r.acknowledged_at).length;
    await expect(tiles.nth(1)).toContainText(String(records.filter((r) => r.acknowledged_at).length));
    await expect(tiles.nth(2)).toContainText(records.length.toLocaleString("en-US"));
    expect(worse).toBeGreaterThan(0);
  });

  test("the search box is first and the how-to-read panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("Company name or ticker")).toBeVisible();
    await page.getByText("How to read a row", { exact: true }).click();
    await expect(page.locator("#how-to-read [data-excerpt]")).toHaveCount(3);
  });

  test("the header button goes to the request form", async ({ page }) => {
    await page.goto("/company/NVDA");
    await page.locator("header").getByRole("link", { name: "Request a company" }).click();
    await expect(page).toHaveURL(/\/#request$/);
    await expect(page.locator("#request")).toBeInViewport();
  });
});

test.describe("company page", () => {
  test("renders a chart for NVIDIA revenue", async ({ page }) => {
    await page.goto("/company/NVDA?metric=revenue");
    const chart = page.locator('[data-chart][data-metric^="revenue"]').first();
    await expect(chart).toBeVisible();
    expect(await chart.locator("[data-point]").count()).toBeGreaterThan(2);
    await expect(chart.locator("circle").first()).toBeAttached();
  });

  test("pill filters change the row count", async ({ page }) => {
    await page.goto("/company/NVDA");
    await expect(page.getByTestId("row-count")).toHaveText("Showing 212 of 212 rows");
    await page.getByRole("link", { name: "Missed, worse", exact: true }).click();
    const worse = records.filter((r) => r.ticker === "NVDA" && r.status === "missed" && r.outcome && worseSide(r)).length;
    await expect(page.getByTestId("row-count")).toHaveText(`Showing ${worse} of 212 rows`);
    await expect(page.locator("tr[data-row]")).toHaveCount(worse);
    // Clicking the active pill clears it.
    await page.getByRole("link", { name: "Missed, worse", exact: true }).click();
    await expect(page.getByTestId("row-count")).toHaveText("Showing 212 of 212 rows");
  });

  test("an empty filter combination says so in plain English", async ({ page }) => {
    await page.goto("/company/TGT?metric=tax%20rate&status=acknowledged");
    await expect(page.getByText("No statements match")).toBeVisible();
  });
});

// The worse side is derived the same way the site does it: revenue and EPS are higher-is-better.
function worseSide(r) {
  const a = r.assumption;
  const higherBetter = !/expenses|tax rate|capital expenditures/.test(a.metric);
  const v = r.outcome.reported_value;
  const below = a.target_low != null && v < a.target_low;
  const above = a.target_high != null && v > a.target_high;
  return higherBetter ? below : above;
}

test.describe("row page", () => {
  test("shows the what-this-means line", async ({ page }) => {
    await page.goto(`/row/${resolved.record_id}`);
    const line = page.getByTestId("what-this-means");
    await expect(line).toContainText("Guided");
    await expect(line).toContainText("reported");
    await expect(line).toContainText("inside the range");
  });

  test("a miss says how far outside the range", async ({ page }) => {
    // UNH FY2020 revenue: guided $260 to $262 billion, reported $257.1 billion.
    const r = records.find(
      (x) => x.ticker === "UNH" && x.status === "missed" && x.assumption.metric === "revenue" && x.assumption.target_period === "FY2020" && x.outcome.reported_value < x.assumption.target_low
    );
    await page.goto(`/row/${r.record_id}`);
    await expect(page.getByTestId("what-this-means")).toContainText(/below the range by [\d.]+%, worse than guided/);
  });

  test("links to the previous and next statement", async ({ page }) => {
    await page.goto("/company/NVDA?metric=revenue");
    const href = await page.locator("tr[data-row] a").nth(3).getAttribute("href");
    await page.goto(href);
    await expect(page.locator('a[data-nav="prev"]')).toBeVisible();
    await expect(page.locator('a[data-nav="next"]')).toBeVisible();
    await page.locator('a[data-nav="next"]').click();
    await expect(page).toHaveURL(/\/row\//);
  });
});

test.describe("compare", () => {
  test("shows the chart with both statements marked", async ({ page }) => {
    await page.goto("/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025");
    await expect(page.locator("[data-chart]").first()).toBeVisible();
    await expect(page.locator("[data-chart] .pick-label")).toHaveText(["A", "B"]);
  });
});

test.describe("no external loads", () => {
  const urls = ["/", "/company/NVDA", "/company/NVDA?metric=revenue", `/row/${resolved.record_id}`, "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025", "/methodology", "/about"];
  for (const url of urls) {
    test(`only same-origin scripts, styles and fonts: ${url}`, async ({ page, baseURL }) => {
      const origin = new URL(baseURL).origin;
      const external = [];
      page.on("request", (req) => {
        if (["script", "stylesheet", "font", "image", "media"].includes(req.resourceType()) && !req.url().startsWith(origin)) {
          external.push(req.url());
        }
      });
      await page.goto(url, { waitUntil: "networkidle" });
      const tags = await page.evaluate(() =>
        [...document.querySelectorAll("script[src], link[rel=stylesheet][href]")].map((el) => el.src || el.href)
      );
      expect(tags.filter((u) => !u.startsWith(origin))).toEqual([]);
      expect(external).toEqual([]);
    });
  }
});
