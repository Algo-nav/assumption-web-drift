import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const records = readRecords();
const nvda = records.filter((r) => r.ticker === "NVDA");

test.describe("company header", () => {
  test("logo, name, ticker, sector and fiscal year end; summary and bar; Compare with", async ({ page }) => {
    await page.goto("/company/NVDA");
    await expect(page.locator(".company-title h1")).toHaveText("NVIDIA Corporation");
    await expect(page.getByTestId("company-meta").locator("span")).toHaveText(["NVDA", "technology", "fiscal year ends on the last Sunday of January"]);
    await expect(page.getByTestId("summary")).toContainText("NVIDIA guided 212 times since");
    await expect(page.getByTestId("compare-with")).toHaveAttribute("href", "/compare?t=NVDA");
    // The bar: its caption and its label say what it is a share of, with this company's counts.
    const better = nvda.filter((r) => r.status === "missed").length;
    const caption = page.getByTestId("bar-caption");
    await expect(caption).toHaveText(/^Share of all statements:\d+ missed better\d+ missed worse$/);
    const [b, w] = (await caption.textContent()).match(/\d+/g).map(Number);
    expect(b + w).toBe(better);
    await expect(page.locator(".company-bar .dirbar")).toHaveAttribute("aria-label", `Share of all statements: ${b} missed better, ${w} missed worse`);
    // Each segment is that share of the company's statements.
    const widths = await page.locator(".company-bar .dirbar i").evaluateAll((els) => els.map((e) => parseFloat(e.style.width)));
    expect(widths[0]).toBeCloseTo((b / nvda.length) * 100, 3);
    expect(widths[1]).toBeCloseTo((w / nvda.length) * 100, 3);
    // The three kinds of rule in the fiscal table each have their own wording.
    await page.goto("/company/TGT");
    await expect(page.getByTestId("company-meta")).toContainText("fiscal year ends on the Saturday nearest 31 January");
    await page.goto("/company/META");
    await expect(page.getByTestId("company-meta")).toContainText("fiscal year ends 31 December");
  });
});

test.describe("filter rail", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sits left of the charts and the table, 216px wide, and stays in view while the column scrolls", async ({ page }) => {
    await page.goto("/company/NVDA");
    const rail = await page.locator(".rail").boundingBox();
    const main = await page.locator(".split-main").boundingBox();
    expect(rail.x + rail.width).toBeLessThanOrEqual(main.x + 4);
    expect(Math.round(main.x - 40)).toBe(216 + 24);
    await expect(page.locator(".rail")).toHaveCSS("position", "sticky");
    await page.locator("details.year").first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId("rail-toggle")).toBeInViewport();
  });

  test("the three-line toggle folds it to a 44px strip, the state is in the URL, and filters keep it", async ({ page }) => {
    await page.goto("/company/NVDA");
    const toggle = page.getByTestId("rail-toggle");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAccessibleName("Collapse filters");
    await expect(toggle.locator("i")).toHaveCount(3);
    const wide = (await page.locator(".split-main").boundingBox()).width;

    await toggle.click();
    await expect(page).toHaveURL(/\/company\/NVDA\?rail=0$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAccessibleName("Expand filters");
    await expect(page.getByTestId("split")).toHaveAttribute("data-rail", "collapsed");
    await expect(page.locator("#rail-filters")).toBeHidden();
    const strip = await page.locator(".rail-top").boundingBox();
    expect(Math.round(strip.width)).toBe(44);
    expect((await page.locator(".split-main").boundingBox()).width).toBeGreaterThan(wide + 150);

    // A direct link to a collapsed, filtered view: the strip shows which group has a filter on.
    await page.goto("/company/NVDA?status=worse&rail=0");
    await expect(page.getByTestId("split")).toHaveAttribute("data-rail", "collapsed");
    // The strip carries the number of filters on, in Plex Mono, with their names as its tooltip.
    const count = page.getByTestId("rail-count");
    await expect(count).toHaveText(/^1/);
    await expect(count).toHaveAttribute("title", "Status: Missed, worse");
    expect(await count.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Plex Mono/i);
    await page.goto("/company/NVDA?metric=revenue&status=met&fy=2024&rail=0");
    await expect(count).toHaveText(/^3/);
    await expect(count).toHaveAttribute("title", "Metric: revenue; Status: Met; Fiscal year: FY2024");
    // With no filter on, the strip shows nothing but the toggle.
    await page.goto("/company/NVDA?rail=0");
    await expect(count).toHaveCount(0);
    await expect(page.locator(".rail-top > *")).toHaveCount(1);
    await page.goto("/company/NVDA?status=worse&rail=0");

    // Opening it again keeps the filter; a filter clicked while open keeps the rail open.
    await toggle.click();
    await expect(page).toHaveURL(/\/company\/NVDA\?status=worse$/);
    await expect(page.getByRole("group", { name: "Status" }).getByRole("link", { name: "Missed, worse", exact: true })).toHaveAttribute("aria-current", "true");
  });

  test("the layout is not animated: no width or grid transition on the split or the rail", async ({ page }) => {
    await page.goto("/company/NVDA");
    const props = await page.getByTestId("split").evaluate((el) =>
      [el, ...el.querySelectorAll(".rail, .rail *")].map((n) => getComputedStyle(n).transitionProperty).join(",")
    );
    for (const p of new Set(props.split(",").map((s) => s.trim()))) expect(["all", "none", "transform", "opacity"]).toContain(p);
    expect(await page.getByTestId("split").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });

  test("status and fiscal year dim the chart points that do not match, and the chart says how many match", async ({ page }) => {
    await page.goto("/company/NVDA");
    await expect(page.getByTestId("chart-filter")).toHaveCount(0);
    await expect(page.locator("[data-chart] [data-point][data-dim]")).toHaveCount(0);
    const plotted = await page.locator("[data-chart] [data-point]").count();

    await page.goto("/company/NVDA?status=worse");
    // Every chart is still drawn in full: the same points, some of them dimmed.
    await expect(page.locator("[data-chart] [data-point]")).toHaveCount(plotted);
    const lit = page.locator("[data-chart] [data-point]:not([data-dim])");
    const n = await lit.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(plotted);
    await expect(page.getByTestId("chart-filter")).toContainText(`${n} of ${plotted} plotted statements match Missed, worse; the rest are dimmed.`);
    // The table is a long way down: the caption links to it.
    const rowCount = Number((await page.getByTestId("row-count").textContent()).match(/Showing (\d+) of/)[1]);
    await expect(page.getByTestId("chart-filter").getByRole("link")).toHaveText(`${rowCount} rows below`);
    await expect(page.getByTestId("chart-filter").getByRole("link")).toHaveAttribute("href", "#rows");
    // Lit points are worse-side misses, in brick; dimmed ones are at a quarter strength.
    for (const pt of await lit.all()) await expect(pt).toHaveAttribute("data-status", "missed");
    expect(await lit.first().locator(".bar").evaluate((el) => getComputedStyle(el).stroke)).toBe("rgb(180, 35, 24)");
    expect(await page.locator("[data-chart] [data-point][data-dim]").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("0.25");

    // Fiscal year dims too; the metric filter still chooses which charts are drawn.
    await page.goto("/company/NVDA?fy=2024");
    await expect(page.getByTestId("chart-filter")).toContainText("match FY2024");
    await page.goto("/company/NVDA?metric=revenue");
    await expect(page.getByTestId("chart-filter")).toHaveCount(0);
    for (const c of await page.locator("[data-chart]").all()) await expect(c).toHaveAttribute("data-metric", /^revenue/);
  });

  test("the table has no direction column: the status says it", async ({ page }) => {
    await page.goto("/company/NVDA");
    await expect(page.locator("details.year").first().getByRole("columnheader")).toHaveText(
      ["Metric", "Basis", "Period", "Guided range", "Stated", "Reported", "Outcome date", "Status", "Acknowledged"]
    );
    const worse = nvda.filter((r) => r.status === "missed").length;
    expect(worse).toBeGreaterThan(0);
    await expect(page.locator("tr[data-row] td[data-direction]")).toHaveCount(worse);
  });
});

test.describe("filter rail at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sits above the column, and folds to a 44px row", async ({ page }) => {
    await page.goto("/company/NVDA");
    const rail = await page.locator(".rail").boundingBox();
    const main = await page.locator(".split-main").boundingBox();
    expect(rail.y + rail.height).toBeLessThanOrEqual(main.y + 4);
    await page.getByTestId("rail-toggle").click();
    await expect(page).toHaveURL(/rail=0/);
    expect(Math.round((await page.locator(".rail-top").boundingBox()).height)).toBe(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe("row page, 404 and scarlet", () => {
  test("the summary panel is a raised card inside a powder hairline, with no green edge", async ({ page }) => {
    const r = records.find((x) => x.status === "met" && x.outcome);
    await page.goto(`/row/${r.record_id}`);
    const panel = page.getByTestId("what-this-means");
    await expect(panel).toHaveCSS("background-color", "rgb(18, 39, 71)");
    await expect(panel).toHaveCSS("box-shadow", /rgba\(188, 211, 234, 0\.4\).*inset/);
    await expect(panel).toHaveCSS("border-top-width", "0px");
    expect(await panel.evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
    // The excerpt keeps its hairline all the way round.
    const quote = page.locator("[data-excerpt]").first();
    await expect(quote).toHaveCSS("border-top-width", "1px");
    await expect(quote).toHaveCSS("border-left-width", "1px");
    await expect(quote).toHaveText(r.assumption.evidence.excerpt);
  });

  test("an unknown address is a 404 written as a record entry, with a way back", async ({ page }) => {
    const res = await page.goto("/company/NOPE");
    expect(res.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We could not find that page");
    await expect(page.getByTestId("not-found-entry")).toContainText("lookup, not found");
    await expect(page.getByTestId("not-found-path")).toHaveText("404, /company/NOPE");
    await expect(page.getByRole("link", { name: "Back to all companies" })).toHaveAttribute("href", "/");
  });

  test("scarlet is the request button and the never-acknowledged count, and never a worse row", async ({ page }) => {
    const SCARLET = "rgb(255, 36, 0)";
    const scarlet = (page) =>
      page.evaluate((SCARLET) => {
        const out = [];
        for (const el of document.querySelectorAll("main *, header *")) {
          if (el.closest(".sf")) continue;
          const cs = getComputedStyle(el);
          if (!el.checkVisibility?.()) continue;
          const hit = cs.backgroundColor === SCARLET || cs.fill === SCARLET || cs.stroke === SCARLET || (cs.color === SCARLET && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) || cs.boxShadow.includes(SCARLET);
          if (hit) {
            const cls = typeof el.className === "string" ? el.className : el.className.baseVal;
            const g = el.dataset.g || el.closest("[data-g]")?.dataset.g || el.closest("[data-tile]")?.dataset.tile;
            out.push(cls || `${el.tagName.toLowerCase()}:${g}`);
          }
        }
        return [...new Set(out)];
      }, SCARLET);

    await page.goto("/");
    // The nav button and the form's button; the never-acknowledged figure; its squares and the hollow
    // acknowledged squares in the unit chart, with their legend marks.
    expect((await scarlet(page)).sort()).toEqual(["btn", "btn sm", "i:acknowledged", "i:silent", "mono", "path:acknowledged", "path:silent"]);
    await expect(page.locator('[data-tile="never"] .mono')).toHaveCSS("color", SCARLET);
    // A company page and Misses carry worse rows; the only scarlet is the nav button.
    for (const url of ["/company/NVDA", "/misses"]) {
      await page.goto(url);
      expect(await scarlet(page)).toEqual(["btn sm"]);
    }
    // Target is where the acknowledged rows are: their mark is the hollow scarlet square.
    await page.goto("/company/TGT?status=acknowledged");
    expect((await scarlet(page)).sort()).toEqual(["btn sm", "sw ack"]);
  });
});
