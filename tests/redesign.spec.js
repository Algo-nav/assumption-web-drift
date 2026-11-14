import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const records = readRecords();
const resolved = records.find((r) => r.status === "met" && r.outcome && r.assumption.target_low !== r.assumption.target_high);

test.describe("home", () => {
  test("the hero has four figures from the data, each one links, and only never acknowledged is scarlet", async ({ page }) => {
    await page.goto("/");
    const missed = records.filter((r) => r.status === "missed");
    const never = missed.filter((r) => !r.acknowledged_at).length;
    const acked = records.filter((r) => r.acknowledged_at).length;
    const tiles = page.locator("[data-tile]");
    await expect(tiles).toHaveCount(4);
    for (const tile of await tiles.all()) {
      expect(await tile.evaluate((el) => el.tagName)).toBe("A");
      await expect(tile).toHaveAttribute("href", /.+/);
    }
    await expect(tiles.locator("b")).toHaveText([records.length.toLocaleString("en-US"), String(missed.length), String(never), String(acked)]);
    await expect(tiles.locator("span")).toHaveText(["statements", "missed", "never acknowledged", /^acknowledged, /]);
    const colours = await tiles.locator("b").evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
    expect(colours[2]).toBe("rgb(255, 36, 0)");
    expect(colours.filter((c) => c === "rgb(255, 36, 0)")).toHaveLength(1);
    // The figures are set in Plex Mono.
    expect(await tiles.locator("b").first().evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/Plex Mono/i);
  });

  test("the question, the search and the figures are on the first screen at 1280 by 800 and at 390 by 844", async ({ page }) => {
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Which companies miss their own guidance, and do they say so?");
      await expect(page.locator("#company-search")).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId("headline")).toBeInViewport({ ratio: 1 });
    }
  });

  test("the search box is first, a slash focuses it, and the how-to-read panel opens", async ({ page }) => {
    await page.goto("/");
    const box = page.getByPlaceholder("Search a company or ticker, or request one");
    await expect(box).toBeVisible();
    await expect(page.locator(".hero-key")).toHaveText("/");
    await page.locator("body").press("/");
    await expect(box).toBeFocused();
    await expect(box).toHaveValue("");
    await page.getByText("How to read a row", { exact: true }).click();
    await expect(page.locator("#how-to-read [data-excerpt]")).toHaveCount(3);
  });

  test("a search that matches says so under the box, and Enter opens the first match", async ({ page }) => {
    await page.goto("/");
    const box = page.locator("#company-search");
    const found = page.getByTestId("search-found");
    await expect(found.getByRole("link")).toHaveCount(0);
    await box.fill("nvi");
    await expect(found.getByRole("link")).toHaveText(["NVDANVIDIA"]);
    await expect(found).toBeInViewport();
    await expect(found.getByRole("link")).toHaveAttribute("href", "/company/NVDA");
    // More matches than fit: five, and a link to the rest in the grid.
    await box.fill("c");
    await expect(found.locator(".pill")).toHaveCount(5);
    await expect(found.getByRole("link", { name: /more below/ })).toHaveAttribute("href", "#companies");
    await box.fill("home");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/company\/HD$/);
  });

  test("fields have an edge that reaches 3:1 against the surface they sit on", async ({ page }) => {
    await page.goto("/");
    for (const sel of ["#company-search", "#req-company", "#req-role"]) {
      await expect(page.locator(sel)).toHaveCSS("box-shadow", /rgb\(127, 156, 191\).*inset/);
    }
  });

  test("the unit chart draws one square per statement and its legend carries the counts", async ({ page }) => {
    await page.goto("/");
    const n = (fn) => records.filter(fn).length;
    const want = {
      met: n((r) => r.status === "met"),
      acknowledged: n((r) => r.status === "missed" && r.acknowledged_at),
      never: n((r) => r.status === "missed" && !r.acknowledged_at),
      open: n((r) => r.status === "unresolved"),
      withdrawn: n((r) => r.status === "withdrawn"),
    };
    expect(Object.values(want).reduce((a, b) => a + b, 0)).toBe(records.length);
    const chart = page.getByTestId("unit-chart");
    for (const [key, count] of Object.entries(want)) {
      const squares = await chart.locator(`path[data-g="${key}"]`).evaluate((el) => (el.getAttribute("d").match(/M/g) || []).length);
      expect(squares, key).toBe(count);
      await expect(chart.locator(`.units-legend li[data-g="${key}"] b`)).toHaveText(count.toLocaleString("en-US"));
    }
    // Data colours: met is powder, never acknowledged is scarlet, acknowledged is a hollow scarlet outline.
    const css = (key, prop) => chart.locator(`path[data-g="${key}"]`).evaluate((el, prop) => getComputedStyle(el)[prop], prop);
    expect(await css("met", "fill")).toBe("rgb(188, 211, 234)");
    expect(await css("never", "fill")).toBe("rgb(255, 36, 0)");
    expect(await css("acknowledged", "fill")).toBe("none");
    expect(await css("acknowledged", "stroke")).toBe("rgb(255, 36, 0)");
    expect(await css("open", "opacity")).toBe("0.15");
  });

  test("the feed lists the four largest worse-side misses by percent beyond the range, in brick, and links to Misses", async ({ page }) => {
    await page.goto("/");
    const feed = page.getByTestId("feed");
    const rows = feed.locator("[data-feed-row]");
    await expect(rows).toHaveCount(4);
    const pcts = await rows.locator("[data-pct]").evaluateAll((els) => els.map((e) => Number(e.dataset.pct)));
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
    // The same four, in the same order, as the top of /misses.
    const ids = await rows.evaluateAll((els) => els.map((e) => e.dataset.feedRow));
    expect(await rows.locator("[data-pct]").first().evaluate((e) => getComputedStyle(e).color)).toBe("rgb(255, 159, 148)");
    const all = feed.getByTestId("feed-all");
    await expect(all).toHaveAttribute("href", "/misses");
    const total = Number((await all.textContent()).match(/All ([\d,]+) worse-side misses/)[1].replace(/,/g, ""));
    await page.goto("/misses");
    await expect(page.locator("tr[data-row]")).toHaveCount(total);
    const top = await page.locator("tr[data-row] a").evaluateAll((els) => els.slice(0, 4).map((e) => e.getAttribute("href").replace("/row/", "")));
    expect(ids).toEqual(top);
  });

  test("sector and order chips narrow and sort the company grid", async ({ page }) => {
    await page.goto("/");
    // The caption says what the tile bars are, and every bar's label uses the same words.
    await expect(page.getByTestId("grid-caption")).toHaveText("Bar: share of all statements: missed better, missed worse");
    const labels = await page.locator(".company-card .dirbar").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(labels).toHaveLength(15);
    for (const l of labels) expect(l).toMatch(/^Share of all statements: \d+ missed better, \d+ missed worse$/);
    const list = page.getByRole("list", { name: "Companies" });
    await page.getByRole("group", { name: "Sector" }).getByRole("button", { name: /^technology/ }).click();
    await expect(list.getByRole("link")).toHaveCount(7);
    await page.getByRole("group", { name: "Sector" }).getByRole("button", { name: "All" }).click();
    await page.getByRole("group", { name: "Order" }).getByRole("button", { name: "Most statements" }).click();
    await expect(list.getByRole("link").first()).toContainText("Salesforce");
    // The grid fills the row: five tiles across at 1280.
    const tops = await list.getByRole("link").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops.filter((t) => t === tops[0])).toHaveLength(5);
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
    await expect(chart.locator(".dot").first()).toBeAttached();
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
  const urls = ["/", "/company/NVDA", "/company/NVDA?metric=revenue", `/row/${resolved.record_id}`, "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025", "/methodology", "/company/TGT"];
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
