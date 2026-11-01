import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";
import { SECTORS } from "../app/lib/data/sectors.js";
import { scaleFor } from "../app/lib/chart.js";

const records = readRecords();
const fy = (r) => /FY(\d{4})/.exec(r.assumption.target_period)[1];
const periodKey = (p) => {
  const m = /^(?:Q([1-4]) )?FY(\d{4})$/.exec(p);
  return Number(m[2]) * 10 + (m[1] ? Number(m[1]) : 5);
};

test.describe("1. company table grouped by fiscal year", () => {
  const nvda = records.filter((r) => r.ticker === "NVDA");
  const years = [...new Set(nvda.map(fy))].sort().reverse();

  test("newest year first, two open, older collapsed, headers show year and count", async ({ page }) => {
    await page.goto("/company/NVDA");
    const groups = page.locator("details.year");
    await expect(groups).toHaveCount(years.length);
    for (const [i, y] of years.entries()) {
      const g = groups.nth(i);
      const n = nvda.filter((r) => fy(r) === y).length;
      await expect(g.locator("summary")).toContainText(`FY${y}`);
      await expect(g.locator("summary")).toContainText(`${n} rows`);
      if (i < 2) await expect(g).toHaveAttribute("open", "");
      else await expect(g).not.toHaveAttribute("open", "");
    }
    await expect(page.getByTestId("row-count")).toHaveText("Showing 212 of 212 rows");
  });

  test("an older year opens on click", async ({ page }) => {
    await page.goto("/company/NVDA");
    const old = page.locator("details.year").nth(2);
    await expect(old.locator("tbody tr").first()).toBeHidden();
    await old.locator("summary").click();
    await expect(old).toHaveAttribute("open", "");
    await expect(old.locator("tbody tr").first()).toBeVisible();
  });

  test("pill filters apply across all years and the counts follow", async ({ page }) => {
    await page.goto("/company/NVDA");
    await page.getByRole("group", { name: "Status" }).getByRole("link", { name: "Met", exact: true }).click();
    const met = nvda.filter((r) => r.status === "met");
    await expect(page.getByTestId("row-count")).toHaveText(`Showing ${met.length} of 212 rows`);
    const groups = page.locator("details.year");
    const metYears = [...new Set(met.map(fy))].sort().reverse();
    await expect(groups).toHaveCount(metYears.length);
    for (const [i, y] of metYears.entries()) {
      await expect(groups.nth(i).locator("summary")).toContainText(`${met.filter((r) => fy(r) === y).length} row`);
    }
  });
});

test.describe("2. charts", () => {
  test("taller, with log axis only where the range exceeds 10x, and marks keep their pixel size", async ({ page }) => {
    await page.goto("/company/NVDA?metric=revenue");
    const chart = page.locator('[data-chart][data-metric^="revenue"]').first();
    await expect(chart).toHaveAttribute("data-scale", "log");
    await expect(chart.locator("svg")).toContainText("log scale");
    expect(await chart.locator("svg").getAttribute("viewBox")).toBe("0 0 520 480");

    const sizes = async () =>
      chart.evaluate((el) => {
        const px = (sel) => parseFloat(getComputedStyle(el.querySelector(sel)).strokeWidth);
        return { bar: px(".bar"), dot: px(".dot") / 2 };
      });
    const desktop = await sizes();
    expect(desktop.bar).toBeGreaterThanOrEqual(3);
    expect(desktop.dot).toBeGreaterThanOrEqual(4);

    await page.setViewportSize({ width: 375, height: 800 });
    const phone = await sizes();
    expect(phone.bar).toBeGreaterThanOrEqual(2);
    expect(phone.dot).toBeGreaterThanOrEqual(3);
    expect(phone.bar).toBeLessThanOrEqual(desktop.bar);
  });

  test("percent metrics stay linear", async ({ page }) => {
    await page.goto("/company/NVDA?metric=gross%20margin");
    const charts = page.locator("[data-chart]");
    expect(await charts.count()).toBeGreaterThan(0);
    for (const c of await charts.all()) await expect(c).toHaveAttribute("data-scale", "linear");
  });

  test("the scale rule", () => {
    const group = (family, vals) => ({ family, points: vals.map((v) => ({ lo: v, hi: v, rep: null })) });
    expect(scaleFor(group("USD", [1, 10]))).toBe("linear");
    expect(scaleFor(group("USD", [1, 10.5]))).toBe("log");
    expect(scaleFor(group("percent", [1, 500]))).toBe("linear");
    expect(scaleFor(group("USD per share", [-1, 500]))).toBe("linear");
  });
});

test.describe("3. sectors", () => {
  test("six sectors, as on the dataset card", () => {
    const counts = {};
    for (const s of Object.values(SECTORS)) counts[s] = (counts[s] || 0) + 1;
    expect(counts).toEqual({
      technology: 7,
      "consumer discretionary": 3,
      "consumer staples": 2,
      "communication services": 1,
      "health care": 1,
      industrials: 1,
    });
  });

  test("the company page and the home card show the config sector", async ({ page }) => {
    await page.goto("/company/TGT");
    await expect(page.locator("main")).toContainText("consumer staples");
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Meta Platforms/ })).toContainText("communication services");
  });
});

test.describe("4. previous and next order", () => {
  test("by stated date, then period", async ({ page }) => {
    // Find a company and metric with two statements on the same day for different periods.
    const seen = new Map();
    let tie = null;
    for (const r of records) {
      const k = `${r.ticker}|${r.assumption.metric}|${r.assumption.stated_at}`;
      if (seen.has(k) && seen.get(k).assumption.target_period !== r.assumption.target_period) {
        tie = [seen.get(k), r];
        break;
      }
      seen.set(k, r);
    }
    expect(tie).not.toBeNull();
    const [first, second] = [...tie].sort((a, b) => periodKey(a.assumption.target_period) - periodKey(b.assumption.target_period));
    await page.goto(`/row/${first.record_id}`);
    await page.locator('a[data-nav="next"]').waitFor();
    const list = records
      .filter((r) => r.ticker === first.ticker && r.assumption.metric === first.assumption.metric)
      .sort((a, b) =>
        a.assumption.stated_at.localeCompare(b.assumption.stated_at) ||
        periodKey(a.assumption.target_period) - periodKey(b.assumption.target_period) ||
        a.record_id.localeCompare(b.record_id)
      );
    const i = list.findIndex((r) => r.record_id === first.record_id);
    expect(list[i + 1].record_id).toBe(second.record_id);
    await expect(page.locator('a[data-nav="next"]')).toHaveAttribute("href", `/row/${second.record_id}`);
    await page.goto(`/row/${second.record_id}`);
    await expect(page.locator('a[data-nav="prev"]')).toHaveAttribute("href", `/row/${first.record_id}`);
  });
});

test.describe("5. /misses", () => {
  const missed = records.filter((r) => r.status === "missed");
  const worseSide = (r) => {
    const a = r.assumption;
    const hib = !/expenses|tax rate|capital expenditures/.test(a.metric);
    const v = r.outcome.reported_value;
    const below = a.target_low != null && v < a.target_low;
    const above = a.target_high != null && v > a.target_high;
    return hib ? below : above;
  };
  const worse = missed.filter(worseSide);

  test("is in the nav between Companies and Compare, and the first tile links to it", async ({ page }) => {
    await page.goto("/");
    const nav = await page.getByRole("navigation", { name: "Main" }).getByRole("link").allTextContents();
    expect(nav.slice(0, 3)).toEqual(["Companies", "Misses", "Compare"]);
    await expect(page.locator('[data-tile="worse-never"]')).toHaveAttribute("href", "/misses");
    await page.locator('[data-tile="worse-never"]').click();
    await expect(page).toHaveURL(/\/misses$/);
  });

  test("worse side by default, toggle to better side", async ({ page }) => {
    await page.goto("/misses");
    await expect(page.locator("tr[data-row]")).toHaveCount(worse.length);
    await expect(page.getByTestId("row-count")).toContainText(`Showing ${worse.length} of ${worse.length}`);
    await page.getByRole("group", { name: "Side" }).getByRole("link", { name: /Better than guided/ }).click();
    await expect(page.locator("tr[data-row]")).toHaveCount(missed.length - worse.length);
    await expect(page.getByRole("columnheader")).toHaveText(
      ["Company", "Metric", "Period", "Guided range", "Reported", "By", "Beyond range \u2193", "Stated", "Acknowledged"],
      { useInnerText: true }
    );
  });

  test("sorts by percent beyond the guide and by stated date", async ({ page }) => {
    await page.goto("/misses");
    const pcts = async () => (await page.locator("td[data-pct]").evaluateAll((els) => els.map((e) => e.dataset.pct))).filter(Boolean).map(Number);
    const desc = await pcts();
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    await page.getByRole("link", { name: /Beyond range/ }).click();
    await expect(page).toHaveURL(/sort=pct&dir=asc/);
    const asc = await pcts();
    expect(asc).toEqual([...asc].sort((a, b) => a - b));

    await page.getByRole("link", { name: /^Stated/ }).click();
    await expect(page).toHaveURL(/sort=stated&dir=desc/);
    const dates = await page.locator("tr[data-row] td.mono:nth-child(8)").allTextContents();
    expect(dates).toEqual([...dates].sort().reverse());
    await page.getByRole("link", { name: /^Stated/ }).click();
    await expect(page).toHaveURL(/sort=stated&dir=asc/);
    const up = await page.locator("tr[data-row] td.mono:nth-child(8)").allTextContents();
    expect(up).toEqual([...up].sort());
  });

  test("company and metric pills filter, and each row links to its row page", async ({ page }) => {
    await page.goto("/misses");
    await page.getByRole("group", { name: "Company" }).getByRole("link", { name: "UNH", exact: true }).click();
    const unh = worse.filter((r) => r.ticker === "UNH").length;
    await expect(page.locator("tr[data-row]")).toHaveCount(unh);
    await page.getByRole("group", { name: "Metric" }).getByRole("link", { name: "revenue", exact: true }).click();
    const unhRev = worse.filter((r) => r.ticker === "UNH" && r.assumption.metric === "revenue").length;
    await expect(page.locator("tr[data-row]")).toHaveCount(unhRev);
    await page.locator("tr[data-row] a").first().click();
    await expect(page).toHaveURL(/\/row\//);
  });

  test("the By column shows the distance in the metric's unit, and percent metrics sort by points", async ({ page }) => {
    // UNH FY2020 revenue: guided $260 to $262 billion, reported $257.1 billion, so $2.9 billion short.
    await page.goto("/misses?company=UNH&metric=revenue");
    await expect(page.locator("tr[data-row]", { hasText: "FY2020" }).first()).toContainText("$2.9 billion");

    // Walmart FY2023 tax rate: guided 25% to 26%, reported 33.6%, so 7.6 points over.
    await page.goto("/misses?company=WMT&metric=tax%20rate");
    await expect(page.locator("tr[data-row]", { hasText: "FY2023" })).toContainText("7.6 points");

    // A percent-type metric defaults to points, and the By header carries the sort.
    await page.goto("/misses?metric=tax%20rate");
    await expect(page.getByRole("columnheader", { name: /^By/ }).first()).toHaveAttribute("aria-sort", "descending");
    const by = async () => (await page.locator("td[data-by]").evaluateAll((els) => els.map((e) => e.dataset.by))).filter(Boolean).map(Number);
    const desc = await by();
    expect(desc.length).toBeGreaterThan(1);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));

    // A dollar metric defaults to percent, and both headers still toggle.
    await page.goto("/misses?metric=revenue");
    await expect(page.getByRole("columnheader", { name: /^Beyond range/ })).toHaveAttribute("aria-sort", "descending");
    await page.getByRole("link", { name: /^By( |$)/ }).click();
    await expect(page).toHaveURL(/sort=by&dir=desc/);
    const byRev = await by();
    expect(byRev).toEqual([...byRev].sort((a, b) => b - a));
    await page.getByRole("link", { name: /^By( |$)/ }).click();
    await expect(page).toHaveURL(/sort=by&dir=asc/);
    const asc = await by();
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    await page.getByRole("link", { name: /^Beyond range/ }).click();
    await expect(page).toHaveURL(/sort=pct&dir=desc/);
  });
});
