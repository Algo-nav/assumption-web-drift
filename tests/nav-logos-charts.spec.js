import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { readRecords } from "./helpers.js";
import { monogram } from "../app/lib/monogram.js";
import { niceTicks, logTicks, yDomain } from "../app/lib/chart.js";

const records = readRecords();
const tickers = [...new Set(records.map((r) => r.ticker))].sort();

test.describe("logos", () => {
  test("every logo file has a source line, and every file is plain SVG", () => {
    const sources = fs.readFileSync("public/logos/SOURCES.md", "utf8");
    for (const f of fs.readdirSync("public/logos").filter((f) => f.endsWith(".svg"))) {
      const t = f.replace(/\.svg$/, "");
      expect(tickers).toContain(t);
      expect(sources).toMatch(new RegExp(`^\\| ${t} \\| .*https://`, "m"));
      const svg = fs.readFileSync(`public/logos/${f}`, "utf8");
      expect(svg).toMatch(/<svg\b[^>]*viewBox=/);
      expect(svg).not.toMatch(/<script|<foreignObject|<image\b|\son\w+\s*=|javascript:/i);
      expect(svg.match(/href\s*=\s*["']([^"']*)/g)?.filter((h) => !/["']#/.test(h)) ?? []).toEqual([]);
    }
  });

  // Fits inside both caps, touching at least one of them (never stretched or squashed), left of its text and
  // centred on its line.
  const fits = (m, h, w) => {
    expect(m.height).toBeLessThanOrEqual(h + 0.01);
    expect(m.width).toBeLessThanOrEqual(w + 0.01);
    expect(Math.abs(m.height - h) < 0.5 || Math.abs(m.width - w) < 0.5).toBe(true);
  };
  const centred = (m, t) => expect(Math.abs(m.y + m.height / 2 - (t.y + t.height / 2))).toBeLessThanOrEqual(1.5);

  test("a company tile shows its logo inside 20px tall by 56px wide, left of the ticker", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".company-card");
    await expect(cards).toHaveCount(tickers.length);
    for (const card of await cards.all()) {
      const mark = card.locator("[data-logo], [data-logo-mono]");
      const ticker = card.locator(".top .mono");
      const [m, t] = [await mark.boundingBox(), await ticker.boundingBox()];
      fits(m, 20, 56);
      centred(m, t);
      expect(m.x + m.width).toBeLessThanOrEqual(t.x);
      const img = card.locator("img[data-logo]");
      if (await img.count()) {
        // The box is the image itself: drawn at its own aspect ratio, so it is left-aligned with nothing padding it.
        const [nw, nh] = await img.evaluate((el) => [el.naturalWidth, el.naturalHeight]);
        expect(nw).toBeGreaterThan(0);
        expect(Math.abs(m.width / m.height - nw / nh)).toBeLessThan(0.05);
      }
    }
  });

  test("the company page shows the logo inside 40px tall by 200px wide, left of the name", async ({ page }) => {
    for (const t of ["TGT", "NVDA", "UNH", "AMZN", "HON"]) {
      await page.goto(`/company/${t}`);
      const mark = page.locator(".company-title [data-logo], .company-title [data-logo-mono]");
      const [m, h] = [await mark.boundingBox(), await page.locator(".company-title h1").boundingBox()];
      fits(m, 40, 200);
      centred(m, h);
      expect(m.x + m.width).toBeLessThanOrEqual(h.x);
    }
  });

  test("a logo that would fit under 14px tall shows the monogram tile instead", async ({ page }) => {
    await page.goto("/");
    // Wide wordmarks in the 56px tile cap: Honeywell 56 x 9.9, Qualcomm 56 x 10.3, UnitedHealth 56 x 4.3.
    for (const [t, letters] of [["HON", "HO"], ["QCOM", "QC"], ["UNH", "UN"]]) {
      const card = page.locator(".company-card").filter({ has: page.locator(".top .mono", { hasText: new RegExp(`^${t}$`) }) });
      await expect(card.locator("img[data-logo]")).toHaveCount(0);
      const mono = card.locator(`[data-logo-mono="${t}"]`);
      await expect(mono).toHaveText(letters);
      const b = await mono.boundingBox();
      expect([Math.round(b.width), Math.round(b.height)]).toEqual([20, 20]);
    }
    // Everything else on the tiles renders its file at 14px tall or more.
    for (const img of await page.locator(".company-card img[data-logo]").all()) {
      expect((await img.boundingBox()).height).toBeGreaterThanOrEqual(14);
    }
    await expect(page.locator(".company-card img[data-logo]")).toHaveCount(tickers.length - 3);
    // On the company page the 200px cap fits them: Honeywell 200 x 35.4, Qualcomm 200 x 36.8, UnitedHealth 200 x 15.3.
    for (const t of ["HON", "QCOM", "UNH"]) {
      await page.goto(`/company/${t}`);
      const img = page.locator(`.company-title img[data-logo="${t}"]`);
      await expect(img).toHaveCount(1);
      expect((await img.boundingBox()).height).toBeGreaterThanOrEqual(14);
    }
  });

  test("symbols where the brand has one, wordmarks otherwise", () => {
    const ratio = (t) => {
      const vb = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(fs.readFileSync(`public/logos/${t}.svg`, "utf8"));
      return Number(vb[1]) / Number(vb[2]);
    };
    // A symbol is roughly square; a wordmark is wide.
    for (const t of ["ADBE", "AMD", "AVGO", "CRM", "HD", "LOW", "META", "MSFT", "NVDA", "TGT", "WMT"]) expect(ratio(t), t).toBeLessThan(2.2);
    for (const t of ["AMZN", "HON", "QCOM", "UNH"]) expect(ratio(t), t).toBeGreaterThan(2.9);
  });

  test("logos come from this origin as SVG, inside the existing img-src 'self'", async ({ request }) => {
    const res = await request.get("/logos/NVDA.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^image\/svg\+xml/);
  });

  test("the monogram is the first two letters of the ticker", () => {
    expect(monogram("HON")).toBe("HO");
    expect(monogram("QCOM")).toBe("QC");
    expect(monogram("UNH")).toBe("UN");
    expect(monogram("HD")).toBe("HD");
    expect(monogram("BRK.B")).toBe("BR");
  });
});

test.describe("search with no match", () => {
  test("offers to request the typed company, and the button fills the form", async ({ page }) => {
    await page.goto("/");
    const line = page.getByTestId("search-miss");
    await expect(line).toHaveCount(0);
    const box = page.locator("#company-search");
    await box.fill("NVDA");
    await expect(line).toHaveCount(0);
    await box.fill("Costco Wholesale");
    await expect(line).toHaveText("Not here yet. Request Costco Wholesale");
    await line.getByRole("button", { name: "Request Costco Wholesale" }).click();
    await expect(page.locator("#req-company")).toHaveValue("Costco Wholesale");
    await expect(page.locator("#req-company")).toBeFocused();
    await expect(page.locator("#request")).toBeInViewport();
    await box.fill("");
    await expect(line).toHaveCount(0);
  });
});

test.describe("compare from the company page", () => {
  test("links to /compare with the company in the first slot", async ({ page }) => {
    await page.goto("/company/TGT");
    const link = page.getByTestId("compare-with");
    await expect(link).toHaveText("Compare with…");
    await expect(link).toHaveAttribute("href", "/compare?t=TGT");
    await link.click();
    await expect(page).toHaveURL(/\/compare\?t=TGT$/);
    await expect(page.locator("#cmp-company")).toHaveValue("TGT");
    await expect(page.locator(".empty")).toContainText("Choose a company, a metric and two periods");
  });
});

test.describe("navigation map", () => {
  test("header nav, CTA and the footer Company column", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" }).getByRole("link");
    await expect(nav).toHaveText(["Companies", "Misses", "Compare", "Methodology", "Contact"]);
    await expect(nav.last()).toHaveAttribute("href", "https://scndorder.com/contact");
    await expect(page.locator("header").getByRole("link", { name: "Request a company" })).toHaveAttribute("href", "/#request");
    const col = page.locator(".footer-cols > div").filter({ has: page.getByRole("heading", { name: "Company" }) });
    await expect(col.getByRole("link")).toHaveText(["scndorder.com", "About", "Contact"]);
    expect(await col.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual([
      "https://scndorder.com",
      "https://scndorder.com/about",
      "https://scndorder.com/contact",
    ]);
    await expect(page.locator("a[href='/about']")).toHaveCount(0);
  });

  test("footer spacing: 48px from content to the columns, 120px to the legal row, 72px to the wordmark", async ({ page }) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const url of ["/", "/methodology", "/company/NVDA"]) {
        await page.goto(url);
        const m = await page.evaluate(() => {
          const r = (sel) => document.querySelector(sel).getBoundingClientRect();
          const cols = document.querySelector(".footer-cols");
          // The column block ends at its tallest column's last line.
          const colsBottom = Math.max(...[...cols.children].map((c) => c.lastElementChild.getBoundingClientRect().bottom));
          return {
            border: getComputedStyle(document.querySelector("footer")).borderTopWidth,
            content: r(".footer-cols").top - document.querySelector("main").lastElementChild.getBoundingClientRect().bottom,
            legal: r(".footer-legal").top - colsBottom,
            mark: r(".footer-mark").top - r(".footer-legal").bottom,
          };
        });
        expect(m.border, `${url} at ${width}`).toBe("0px");
        expect(Math.round(m.content), `${url} at ${width}`).toBe(48);
        expect(Math.round(m.legal), `${url} at ${width}`).toBe(120);
        expect(Math.round(m.mark), `${url} at ${width}`).toBe(72);
      }
    }
  });
});

test.describe("chart rules", () => {
  test("ticks: three to five round values", () => {
    for (const [a, b] of [[0, 1], [-5.2, 4.6], [0.4, 3.1], [57, 81], [1e9, 9.7e9]]) {
      const t = niceTicks(a, b);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.length).toBeLessThanOrEqual(5);
    }
    const lt = logTicks(2e9, 1.1e11);
    expect(lt.length).toBeGreaterThanOrEqual(3);
    expect(lt.length).toBeLessThanOrEqual(5);
  });

  test("the median cluster keeps at least half the plot height", () => {
    const vals = [7, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.1, 2];
    const d = yDomain(vals);
    const s = [...vals].sort((a, b) => a - b);
    const q = (p) => { const i = (s.length - 1) * p, l = Math.floor(i); return s[l] + (s[Math.ceil(i)] - s[l]) * (i - l); };
    expect((q(0.9) - q(0.1)) / (d.hi - d.lo)).toBeGreaterThanOrEqual(0.5);
    expect(d.lo).toBeGreaterThan(2);
  });

  for (const t of ["NVDA", "TGT"]) {
    test(`${t}: every chart follows the checklist`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/company/${t}`);
      await page.evaluate(() => document.querySelectorAll("section[aria-labelledby=charts-h] details").forEach((d) => (d.open = true)));
      const charts = page.locator("[data-chart]");
      expect(await charts.count()).toBeGreaterThan(1);
      // One key for the section, none inside a chart.
      await expect(page.locator("section[aria-labelledby=charts-h] .chart-key")).toHaveCount(1);
      await expect(page.locator("[data-chart] .chart-key")).toHaveCount(0);
      let years = null;
      for (const c of await charts.all()) {
        const grid = await c.locator(".grid-line").count();
        expect(grid).toBeGreaterThanOrEqual(3);
        expect(grid).toBeLessThanOrEqual(5);
        const info = await c.evaluate((el) => {
          const svg = el.querySelector("svg").getBoundingClientRect();
          const plotLeft = el.querySelector(".grid-line").getBoundingClientRect().left;
          const ticks = [...el.querySelectorAll(".y-tick")].map((n) => n.getBoundingClientRect());
          const marks = [...el.querySelectorAll(".bar, .bar-open, .dot, .edge")].map((n) => n.getBoundingClientRect());
          const head = el.querySelector(".chart-head").getBoundingClientRect();
          const title = el.querySelector(".chart-head h3").getBoundingClientRect();
          const note = el.querySelector(".chart-note")?.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            font: getComputedStyle(el.querySelector(".y-tick")).fontFamily,
            anchor: el.querySelector(".y-tick").getAttribute("text-anchor"),
            overlap: ticks.some((r) => r.right > plotLeft),
            rightEdges: new Set(ticks.map((r) => Math.round(r.right))).size,
            outside: marks.filter((r) => r.top < svg.top - 1 || r.bottom > svg.bottom + 1).length,
            sameLine: !note || Math.abs(note.top + note.height / 2 - (title.top + title.height / 2)) < 6,
            headOneLine: head.height < 40,
            pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
            years: [...el.querySelectorAll(".x-label")].map((n) => [n.textContent, Math.round(n.getBoundingClientRect().left - el.getBoundingClientRect().left)]),
          };
        });
        expect(info.font).toMatch(/Plex Mono/i);
        expect(info.anchor).toBe("end");
        expect(info.overlap).toBe(false);
        expect(info.rightEdges).toBe(1);
        expect(info.outside).toBe(0);
        expect(info.sameLine && info.headOneLine).toBe(true);
        expect(new Set(info.pad).size).toBe(1);
        // One label per fiscal year, consecutive, at the same x in every chart of the company.
        const fys = info.years.map(([s]) => Number(s.slice(2)));
        fys.forEach((y, i) => i && expect(y).toBe(fys[i - 1] + 1));
        if (years) expect(info.years.map(([s]) => s)).toEqual(years.map(([s]) => s));
        years ??= info.years;

        // Unresolved: hollow bar, no dot. Beyond the axis: counted in the note.
        for (const pt of await c.locator('[data-status="unresolved"]').all()) {
          await expect(pt.locator(".bar-open")).toHaveCount(1);
          await expect(pt.locator(".dot, .link-line")).toHaveCount(0);
        }
        const beyond = Number(await c.getAttribute("data-beyond"));
        if (beyond) await expect(c.locator(".chart-note")).toContainText(`axis trimmed; ${beyond} point${beyond === 1 ? "" : "s"} beyond`);
        else await expect(c.getByText(/axis trimmed/)).toHaveCount(0);
      }
    });
  }

  test("no hairline joins a dot that touches its bar", async ({ page }) => {
    await page.goto("/company/TGT");
    const bad = await page.evaluate(() => {
      let n = 0;
      for (const a of document.querySelectorAll("[data-chart] [data-point]")) {
        const dot = a.querySelector(".dot");
        const bar = a.querySelector(".bar");
        if (!dot || !bar) continue;
        const d = dot.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const touch = d.left <= b.right + 1 && d.right >= b.left - 1 && d.top <= b.bottom + 1 && d.bottom >= b.top - 1;
        if (touch && a.querySelector(".link-line")) n++;
      }
      return n;
    });
    expect(bad).toBe(0);
  });
});
