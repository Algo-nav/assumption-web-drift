import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

// A page that loads already scrolled must paint the nav as the pill in its first frame: no full-width bar, no
// travel into place. The state is set by an inline script that runs as the HTML is parsed (SiteNav.js, BOOT),
// before the component hydrates.
test.describe("nav on first load", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a company page loaded at 600px of scroll is compact in the first frame and never animates in", async ({ page }) => {
    // Every animation frame of the next document is recorded from before its first paint.
    // Each frame is read from a ResizeObserver callback: those run after every animation-frame callback and
    // after layout, just before the frame is painted, so what is recorded is what was drawn.
    await page.addInitScript(() => {
      window.__frames = [];
      const t0 = performance.now();
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;left:-9px;top:0;width:1px;height:1px;pointer-events:none";
      let flip = false;
      new ResizeObserver(() => {
        const wrap = document.querySelector('[data-testid="site-nav"]');
        if (!wrap) return;
        const nav = wrap.querySelector("nav");
        const bg = wrap.querySelector(".nav-bg");
        window.__frames.push({
          y: Math.round(window.scrollY),
          width: Math.round(nav.getBoundingClientRect().width),
          bg: Number(getComputedStyle(bg).opacity),
          label: getComputedStyle(wrap.querySelector(".nav-label")).display,
          live: document.documentElement.hasAttribute("data-nav-live"),
        });
      }).observe(probe);
      const tick = () => {
        if (!probe.isConnected && document.body) document.body.appendChild(probe);
        probe.style.width = (flip = !flip) ? "2px" : "1px";
        if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/company/NVDA");
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForTimeout(300);
    // The browser restores the scroll position on reload.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-nav-live", "");
    await page.waitForTimeout(900);
    const frames = await page.evaluate(() => window.__frames);
    const scrolled = frames.filter((f) => f.y > 80);
    expect(scrolled.length).toBeGreaterThan(10);
    expect(scrolled[0].y).toBe(600);
    // The first frame, and every one after it: the pill, its surface fully shown, the product label dropped.
    expect(scrolled[0]).toMatchObject({ bg: 1, label: "none" });
    expect(scrolled[0].width).toBeLessThan(960);
    expect(scrolled.filter((f) => f.bg !== 1 || f.label !== "none")).toEqual([]);
    // It was the pill before the component mounted, and its width never changed: nothing travelled.
    expect(scrolled.some((f) => !f.live)).toBe(true);
    expect(new Set(scrolled.map((f) => f.width)).size).toBe(1);
    await expect(page.getByTestId("site-nav")).toHaveAttribute("data-compact", "true");
  });

  test("loaded at the top it is the full bar in the first frame, and the pill still travels on scroll after 300ms", async ({ page }) => {
    await page.goto("/company/NVDA");
    const nav = page.getByTestId("site-nav");
    await expect(nav).toHaveAttribute("data-compact", "false");
    await expect(nav.locator(".nav-bg")).toHaveCSS("opacity", "0");
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
    await expect(nav).toHaveAttribute("data-compact", "true");
    // Mid-way through the 600ms move the bar is between its two widths.
    await page.waitForTimeout(120);
    const mid = (await nav.locator(".nav-bg").boundingBox()).width;
    expect(mid).toBeGreaterThan(900);
    expect(mid).toBeLessThan(1199);
  });

  test("the boot script carries the page's nonce", async ({ request }) => {
    const res = await request.get("/company/NVDA");
    const nonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)[1];
    const html = await res.text();
    // The boot script that reads scrollY, and the one-line sync after the nav: both inline, both nonced.
    const tags = html.match(/<script\b[^>]*>[^<]*/g);
    const boot = tags.filter((t) => />document\.documentElement\.dataset\.js=/.test(t));
    const sync = tags.filter((t) => />window\.__navSync&&/.test(t));
    expect([boot.length, sync.length]).toEqual([1, 1]);
    for (const t of [...boot, ...sync]) expect(t).toContain(`nonce="${nonce}"`);
    // The boot script comes before the nav's markup.
    expect(html.indexOf("dataset.nav")).toBeLessThan(html.indexOf('data-testid="site-nav"'));
  });
});

test.describe("reading measure", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  const records = readRecords();
  const row = records.find((r) => r.status === "met" && r.outcome);

  test("the write-up is a centred 680px column, headings included; tables may run wider", async ({ page }) => {
    await page.goto("/methodology");
    const box = (sel) => page.locator(sel).first().boundingBox();
    const centre = (b) => b.x + b.width / 2;
    for (const sel of ["article.prose > h1", "article.prose > h2", "article.prose > p", "article.prose > ul", ".note", "#provenance"]) {
      const b = await box(sel);
      expect(b.x, sel).toBeCloseTo(300, 0);
      expect(b.x + b.width, sel).toBeLessThanOrEqual(980.5);
    }
    // Headings fill the measure; running text keeps to about 72 characters inside it.
    expect((await box("article.prose > h2")).width).toBeCloseTo(680, 0);
    expect((await box("article.prose > p")).width).toBeLessThanOrEqual(545);
    // Tables are centred on the column, at least as wide as it, and free to use the full content width.
    const tables = await page.locator("article.prose > table").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, width: r.width }; }));
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(centre(t)).toBeCloseTo(640, 0);
      expect(t.width).toBeGreaterThanOrEqual(679.5);
      expect(t.width).toBeLessThanOrEqual(1200.5);
    }
    // The figures in "The record in full" keep the full content width.
    expect((await box('[data-testid="record-grid"]')).width).toBeGreaterThan(1000);
  });

  test("the /about redirect target and the row page use the same column", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("#provenance")).toBeInViewport();
    const prov = await page.locator("#provenance").boundingBox();
    expect([Math.round(prov.x), Math.round(prov.width)]).toEqual([300, 680]);
    await page.goto(`/row/${row.record_id}`);
    for (const el of await page.locator("main > .reading > *").all()) {
      const b = await el.boundingBox();
      expect([Math.round(b.x), Math.round(b.width)]).toEqual([300, 680]);
    }
    await expect(page.locator("main > .reading > *")).not.toHaveCount(0);
  });
});

test.describe("reading measure at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the column is the full width less the gutters, and nothing overflows", async ({ page }) => {
    await page.goto("/methodology");
    const h = await page.locator("article.prose > h2").first().boundingBox();
    expect([Math.round(h.x), Math.round(h.width)]).toEqual([16, 358]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
