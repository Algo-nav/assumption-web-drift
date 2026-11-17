import { test, expect } from "@playwright/test";

// The nav and the footer are the main site's components, copied in. These are the main site's own tests for
// them (scndorder-site tests/nav.spec.js and the footer tests in tests/pages.spec.js), with this site's links.
const nav = (page) => page.getByTestId("site-nav");
const bar = (page) => page.getByTestId("site-nav").locator("nav");
const LINKS = ["Companies", "Misses", "Compare", "Methodology", "Contact"];

async function scrollTo(page, y) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
}

// The layout animation runs for 600ms; wait for the bar's box to stop changing before measuring it.
async function settledBox(page) {
  let prev = null;
  for (let i = 0; i < 40; i++) {
    const box = await bar(page).boundingBox();
    if (prev && Math.abs(box.width - prev.width) < 0.5 && Math.abs(box.x - prev.x) < 0.5) return box;
    prev = box;
    await page.waitForTimeout(100);
  }
  return prev;
}

test.describe("nav state", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("full width at the top: no pill surface, wordmark at the left edge, the product label beside it", async ({ page }) => {
    await page.goto("/");
    await expect(nav(page)).toHaveAttribute("data-compact", "false");
    await expect(nav(page).locator(".nav-bg")).toHaveCSS("opacity", "0");

    const box = await settledBox(page);
    expect(box.width).toBeGreaterThanOrEqual(1199);
    const mark = await nav(page).locator(".nav-mark").boundingBox();
    expect(mark.x).toBeCloseTo(40, 0);
    const label = nav(page).locator(".nav-label");
    await expect(label).toHaveText("assumption-drift");
    await expect(label).toBeVisible();
    expect((await label.boundingBox()).x).toBeGreaterThan(mark.x + mark.width - 1);
  });

  test("still full width at 60px of scroll, a centred pill past 80px without the label, full again back at the top", async ({ page }) => {
    await page.goto("/");

    await scrollTo(page, 60);
    await page.waitForTimeout(150);
    await expect(nav(page)).toHaveAttribute("data-compact", "false");

    await scrollTo(page, 120);
    await expect(nav(page)).toHaveAttribute("data-compact", "true");
    await expect(nav(page).locator(".nav-bg")).toHaveCSS("opacity", "1");
    await expect(nav(page).locator(".nav-label")).toBeHidden();

    const pill = await settledBox(page);
    expect(pill.width).toBeLessThan(960);
    expect(pill.x + pill.width / 2).toBeCloseTo(640, 0);
    expect(pill.y).toBe(16);

    // The pill is sized to its content: the wordmark stays on one line and every link is inside it.
    const mark = await nav(page).locator(".nav-mark").boundingBox();
    expect(mark.height).toBeLessThan(48);
    for (const label of [...LINKS, "Request a company"]) {
      const link = await nav(page).getByRole("link", { name: label, exact: true }).boundingBox();
      expect(link.x).toBeGreaterThanOrEqual(pill.x);
      expect(link.x + link.width).toBeLessThanOrEqual(pill.x + pill.width + 0.5);
    }

    await scrollTo(page, 0);
    await expect(nav(page)).toHaveAttribute("data-compact", "false");
    const full = await settledBox(page);
    expect(full.width).toBeGreaterThanOrEqual(1199);
    await expect(nav(page).locator(".nav-label")).toBeVisible();
  });

  test("the move from bar to pill is transforms only: no layout property is transitioned", async ({ page }) => {
    await page.goto("/");
    const props = await nav(page).evaluate((el) =>
      [el, ...el.querySelectorAll("*")].map((n) => getComputedStyle(n).transitionProperty).join(",")
    );
    for (const p of new Set(props.split(",").map((s) => s.trim()))) {
      expect(["all", "none", "transform", "opacity"]).toContain(p);
    }
    const durations = await nav(page).evaluate((el) =>
      [el, el.querySelector("nav")].map((n) => getComputedStyle(n).transitionDuration)
    );
    expect(durations).toEqual(["0s", "0s"]);
  });

  test("links: wordmark to scndorder.com, Contact to the main site, no About, the section's link is current, the request stays here", async ({ page }) => {
    await page.goto("/");
    await expect(nav(page).locator(".nav-mark")).toHaveAttribute("href", "https://scndorder.com");
    await expect(nav(page).locator(".nav-label")).toHaveAttribute("href", "/");
    await expect(nav(page).locator(".nav-links a")).toHaveText(LINKS);
    await expect(nav(page).getByRole("link", { name: "About" })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "https://scndorder.com/contact");
    await expect(nav(page).getByRole("link", { name: "Companies" })).toHaveAttribute("aria-current", "page");
    await expect(nav(page).getByRole("link", { name: "Request a company" })).toHaveAttribute("href", "/#request");

    await page.goto("/misses");
    await expect(nav(page).getByRole("link", { name: "Misses" })).toHaveAttribute("aria-current", "page");
    await expect(nav(page).getByRole("link", { name: "Companies" })).not.toHaveAttribute("aria-current", "page");

    // A company page belongs to Companies.
    await page.goto("/company/NVDA");
    await expect(nav(page).getByRole("link", { name: "Companies" })).toHaveAttribute("aria-current", "page");
  });

  test("skip link is the first stop and lands on main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await expect(skip).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
  });

  test("the pill blurs what passes under it", async ({ page }) => {
    await page.goto("/");
    await expect(nav(page).locator(".nav-bg")).toHaveCSS("backdrop-filter", "blur(14px)");
  });

  test("one scarlet button at a time: the nav button steps aside while the request form is in the viewport", async ({ page }) => {
    await page.goto("/");
    const cta = nav(page).locator(".nav-cta");
    await expect(cta).toHaveAttribute("data-away", "false");
    await expect(cta).toHaveCSS("opacity", "1");

    await page.locator("#request").scrollIntoViewIfNeeded();
    await page.getByLabel("Email").scrollIntoViewIfNeeded();
    await expect(cta).toHaveAttribute("data-away", "true");
    await expect(cta).toHaveCSS("opacity", "0");
    await expect(cta).toHaveAttribute("inert", "");
    await expect(page.getByRole("button", { name: "Request a company" })).toBeInViewport();

    await scrollTo(page, 0);
    await expect(cta).toHaveAttribute("data-away", "false");
    await expect(cta).toHaveCSS("opacity", "1");
  });
});

test.describe("nav state under reduced motion", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });

  test("the pill state still applies; it arrives without travelling", async ({ page }) => {
    await page.goto("/");
    await scrollTo(page, 200);
    expect(await page.evaluate(() => window.scrollY)).toBe(200);
    await expect(nav(page)).toHaveAttribute("data-compact", "true");
    // No layout animation: the box is at its final size on the next frame.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const box = await bar(page).boundingBox();
    expect(box.width).toBeLessThan(960);
  });
});

test.describe("nav at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("links collapse into a full-height panel that opens, traps focus and closes on Escape", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Open menu" });
    const panel = page.locator("#nav-panel");

    await expect(nav(page).locator(".nav-links")).toBeHidden();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveAttribute("inert", "");

    await button.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toHaveCSS("opacity", "1");
    const box = await panel.boundingBox();
    expect(box.height).toBe(844);
    await expect(panel.getByRole("link")).toHaveCount(LINKS.length + 1);
    // Links arrive in order, 60ms apart.
    const delays = await panel.locator("li").evaluateAll((lis) => lis.map((li) => getComputedStyle(li).transitionDelay.split(",")[0]));
    expect(delays).toEqual(["0s", "0.06s", "0.12s", "0.18s", "0.24s", "0.3s"]);

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
    await expect(panel).toHaveCSS("opacity", "0");
  });

  test("the pill carries the request button once the hero has scrolled away, without overflowing", async ({ page }) => {
    await page.goto("/");
    const cta = nav(page).getByRole("link", { name: "Request a company" });
    await expect(cta).toBeHidden();
    await scrollTo(page, 900);
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

const ROUTES = ["/", "/misses", "/compare", "/methodology", "/company/NVDA", "/no-such-page"];

test.describe("every page sits on the same system", () => {
  for (const route of ROUTES) {
    test(`${route}: nav, main, footer, one h1, navy ground, a skip link`, async ({ page }) => {
      await page.goto(route);
      await expect(nav(page)).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(10, 26, 51)");
      await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
      // No grain on this site: no canvas anywhere.
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  }

  test("footer markup is identical on every route", async ({ page }) => {
    const footers = [];
    for (const route of ROUTES) {
      await page.goto(route);
      footers.push(await page.locator("footer").evaluate((el) => el.outerHTML));
    }
    for (const f of footers.slice(1)) expect(f).toBe(footers[0]);
  });

  test("footer wordmark fills the container on one line and rises once in view", async ({ page }) => {
    await page.goto("/methodology");
    const run = page.locator(".sf-mark-run");
    await run.scrollIntoViewIfNeeded();
    await expect(page.locator("html")).toHaveAttribute("data-foot-in", "");
    await expect(run.locator("i").first()).toHaveCSS("opacity", "1");
    const { text, container } = await page.evaluate(() => {
      const el = document.querySelector(".sf-mark-run");
      const range = document.createRange();
      range.selectNodeContents(el);
      return { text: range.getBoundingClientRect().width, container: el.parentElement.clientWidth };
    });
    expect(Math.abs(text - container)).toBeLessThan(4);
    expect(await run.locator("i").count()).toBe("SCND ORDER".length);
  });

  test("footer links: Product stays here, Company goes to the main site, Privacy and Terms too", async ({ page }) => {
    await page.goto("/");
    const col = (name) => page.locator(".sf-cols > div").filter({ has: page.getByRole("heading", { name }) });
    await expect(col("Product").getByRole("link")).toHaveText(["assumption-drift", "Misses", "Methodology", "Request a company"]);
    expect(await col("Product").getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual(["/", "/misses", "/methodology", "/#request"]);
    await expect(col("Company").getByRole("link")).toHaveText(["scndorder.com", "About", "Contact"]);
    expect(await col("Company").getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual([
      "https://scndorder.com",
      "https://scndorder.com/about",
      "https://scndorder.com/contact",
    ]);
    const legal = page.locator(".sf-legal");
    expect(await legal.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual([
      "https://scndorder.com/privacy",
      "https://scndorder.com/terms",
    ]);
    await expect(page.locator("a[href='/about']")).toHaveCount(0);
  });
});

test.describe("390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of ["/", "/misses", "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025", "/methodology", "/company/NVDA", "/company/NVDA?rail=0", "/no-such-page"]) {
    test(`no horizontal overflow: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  }
});
