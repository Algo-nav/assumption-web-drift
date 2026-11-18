import { test, expect } from "@playwright/test";
import { PILOT_HOST, PORT } from "./test-env.js";

// Microsoft Clarity sits behind the same consent as gtag.js (app/components/ClarityLoader.js, lib/consent.js).
// Ported from the main site (scndorder-site tests/clarity.spec.js). What differs: the routes, the GA env var
// (NEXT_PUBLIC_GA_ID), the Privacy Policy link (the policy lives on the main site) and the production hostname.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

// NEXT_PUBLIC_* is inlined at build time, so this spec only means something against a build made with it.
// playwright.config.js builds with dummy ids (tests/test-env.js).
test.skip(!CLARITY_ID, "requires a build made with NEXT_PUBLIC_CLARITY_ID set");

const TAG = 'script[src^="https://www.clarity.ms/tag/"]';
const GTAG = 'script[src*="googletagmanager.com/gtag/js"]';
const TAG_REQUEST = `GET https://www.clarity.ms/tag/${CLARITY_ID}`;

// Both tags are answered here and never fetched. The Clarity stand-in leaves the queue shim in place, so
// clarity.q holds exactly the calls our code made.
async function stubTags(page) {
  await page.route(/googletagmanager\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__gtagRan = true;" })
  );
  await page.route(/^https:\/\/www\.clarity\.ms\/tag\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__clarityRan = (window.__clarityRan || 0) + 1;" })
  );
}
const clarityRan = (page) => page.waitForFunction(() => window.__clarityRan > 0);

// Every request to a Clarity host: clarity.ms, any subdomain of it, and c.bing.com.
const CLARITY_RE = /(^|\.)clarity\.ms$|^c\.bing\.com$/;
function watchClarity(page) {
  const seen = [];
  page.on("request", (r) => {
    const { hostname, origin, pathname } = new URL(r.url());
    if (CLARITY_RE.test(hostname)) seen.push(`${r.method()} ${origin}${pathname}`);
  });
  return seen;
}

function watchCsp(page) {
  const violations = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  return violations;
}

const banner = (page) => page.getByRole("dialog", { name: "Cookie choices" });
const accept = (page) => banner(page).getByRole("button", { name: "Accept analytics" }).click();
const decline = (page) => banner(page).getByRole("button", { name: "Decline" }).click();
const reopen = (page) => page.getByRole("button", { name: "Cookie settings" }).click();
const queue = (page) => page.evaluate(() => Array.from(window.clarity?.q || [], (args) => Array.from(args)));
const cookieNames = async (context) => (await context.cookies()).map((c) => c.name).sort();

// What a loaded Clarity tag does to upload: XMLHttpRequest, sendBeacon, and fetch for good measure.
const upload = (page) =>
  page.evaluate(async () => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://k.clarity.ms/collect?probe=xhr", true);
    xhr.send("x");
    const beacon = navigator.sendBeacon("https://k.clarity.ms/collect?probe=beacon", "x");
    const fetched = await fetch("https://c.bing.com/c.gif?probe=fetch", { mode: "no-cors" }).then((r) => r.status, () => "failed");
    const own = await fetch("/robots.txt").then((r) => r.status);
    const ownXhr = await new Promise((resolve) => {
      const x = new XMLHttpRequest();
      x.open("GET", "/robots.txt");
      x.onloadend = () => resolve(x.status);
      x.send();
    });
    await new Promise((r) => setTimeout(r, 200));
    return { beacon, fetched, own, ownXhr };
  });

test("the banner names both tools", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_GA_ID, "the two-tool copy needs both ids");
  await page.goto("/");
  await expect(banner(page)).toContainText(
    "We use Google Analytics and Microsoft Clarity to see how visitors use this site. They only run if you accept. Essential cookies remember your choice."
  );
  // The policy lives on the main site, and names Clarity there.
  await expect(banner(page).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "https://scndorder.com/privacy");
});

test("a first visit makes no request to clarity.ms or bing until analytics is accepted; then the tag carries the nonce", async ({ page, context }) => {
  const clarity = watchClarity(page);
  await stubTags(page);

  const html = await (await page.request.get("/")).text();
  expect(html).not.toMatch(/clarity\.ms/);

  let nonce;
  for (const url of ["/", "/misses", "/company/NVDA", "/compare", "/methodology", "/no-such-page"]) {
    const res = await page.goto(url, { waitUntil: "networkidle" });
    nonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)[1];
    await expect(banner(page)).toBeVisible();
    await expect(page.locator(TAG)).toHaveCount(0);
    // No shim either: nothing of Clarity's exists before a choice.
    expect(await page.evaluate(() => typeof window.clarity)).toBe("undefined");
  }
  await page.waitForTimeout(500);
  expect(clarity).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  await accept(page);
  await clarityRan(page);
  expect(clarity).toEqual([TAG_REQUEST]);
  const tag = page.locator(TAG);
  await expect(tag).toHaveCount(1);
  expect(await tag.getAttribute("src")).toBe(`https://www.clarity.ms/tag/${CLARITY_ID}`);
  // The nonce attribute is hidden from the DOM after parsing; the property still holds it.
  expect(await tag.evaluate((el) => ({ nonce: el.nonce, async: el.async }))).toEqual({ nonce, async: true });
  // The shim queued the consent signal for the tag to pick up.
  expect(await queue(page)).toEqual([["consent"]]);

  // Never ahead of gtag.js.
  if (process.env.NEXT_PUBLIC_GA_ID) {
    const after = await page.evaluate(
      ([g, c]) => Boolean(document.querySelector(g).compareDocumentPosition(document.querySelector(c)) & Node.DOCUMENT_POSITION_FOLLOWING),
      [GTAG, TAG]
    );
    expect(after).toBe(true);
  }
});

test("a returning visitor with a stored grant gets the tag on load, with that page's nonce", async ({ page }) => {
  const clarity = watchClarity(page);
  await stubTags(page);
  await page.goto("/");
  await accept(page);
  await clarityRan(page);
  clarity.length = 0;

  const res = await page.goto("/misses");
  const nonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)[1];
  await clarityRan(page);
  await expect(banner(page)).toBeHidden();
  expect(clarity).toEqual([TAG_REQUEST]);
  expect(await page.locator(TAG).evaluate((el) => el.nonce)).toBe(nonce);
  expect(await queue(page)).toEqual([["consent"]]);
});

test("declining makes no request to clarity.ms or bing, on that page or the next", async ({ page, context }) => {
  const clarity = watchClarity(page);
  await stubTags(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await decline(page);
  await expect(banner(page)).toBeHidden();
  await page.goto("/misses", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await expect(banner(page)).toBeHidden();
  await expect(page.locator(TAG)).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.clarity)).toBe("undefined");
  // Even an upload attempted by hand goes nowhere.
  expect(await upload(page)).toEqual({ beacon: true, fetched: 204, own: 200, ownXhr: 200 });
  expect(clarity).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("declining after the tag has loaded withdraws consent, clears _clck and _clsk and blocks every send; accepting again restores it", async ({
  page,
  context,
}) => {
  const clarity = watchClarity(page);
  await stubTags(page);
  await page.goto("/");
  await accept(page);
  await clarityRan(page);

  // Stand-ins for the cookies the real tag would have set. "keep" and "_clck_keep" are not Clarity's.
  await page.evaluate(() => {
    for (const name of ["_clck", "_clsk", "keep", "_clck_keep"]) document.cookie = `${name}=1; path=/`;
  });
  expect(await cookieNames(context)).toEqual(["_clck", "_clck_keep", "_clsk", "keep"]);

  await reopen(page);
  clarity.length = 0;
  await decline(page);
  await expect(banner(page)).toBeHidden();
  expect((await queue(page)).at(-1)).toEqual(["consent", false]);
  expect(await cookieNames(context)).toEqual(["_clck_keep", "keep"]);

  // The tag is still in the page. Nothing it sends leaves, by XHR, beacon or fetch; our own requests still do.
  expect(await upload(page)).toEqual({ beacon: true, fetched: 204, own: 200, ownXhr: 200 });
  // A client-side navigation: same page, same loaded tag.
  await page.getByRole("link", { name: "Misses" }).first().click();
  await expect(page).toHaveURL(/\/misses$/);
  await page.waitForTimeout(300);
  expect(clarity).toEqual([]);

  // Accept again: consent is signalled again and sends go through. The tag is not requested a second time.
  await reopen(page);
  await accept(page);
  await expect(banner(page)).toBeHidden();
  await expect.poll(async () => (await queue(page)).at(-1)).toEqual(["consent"]);
  await upload(page);
  expect(clarity.sort()).toEqual([
    "GET https://c.bing.com/c.gif",
    "POST https://k.clarity.ms/collect",
    "POST https://k.clarity.ms/collect",
  ]);

  // Decline, and the next load asks Clarity for nothing.
  await reopen(page);
  await decline(page);
  clarity.length = 0;
  await page.reload({ waitUntil: "networkidle" });
  await page.goto("/methodology", { waitUntil: "networkidle" });
  await expect(page.locator(TAG)).toHaveCount(0);
  expect(clarity).toEqual([]);
});

// On the production hostname (resolved to the local server), with the cookies on the parent domain and on the host.
test("declining deletes _clck and _clsk on the host and on .scndorder.com", async ({ page, context }) => {
  await stubTags(page);
  const base = `http://${PILOT_HOST}:${PORT}`;
  const far = Math.floor(Date.now() / 1000) + 86400;
  await context.addCookies([
    { name: "_clck", value: "a", domain: ".scndorder.com", path: "/", expires: far },
    { name: "_clsk", value: "b", domain: ".scndorder.com", path: "/", expires: far },
    { name: "_clck", value: "c", url: base, expires: far },
    { name: "_clsk", value: "d", url: base, expires: far },
    { name: "_clck", value: "e", domain: `.${PILOT_HOST}`, path: "/", expires: far },
    { name: "keep", value: "1", domain: ".scndorder.com", path: "/", expires: far },
  ]);
  await page.goto(`${base}/`);
  expect(new URL(page.url()).hostname).toBe(PILOT_HOST);
  expect((await context.cookies(base)).length).toBe(6);

  await decline(page);
  await expect(banner(page)).toBeHidden();
  expect((await context.cookies()).map((c) => `${c.name} ${c.domain}`)).toEqual(["keep .scndorder.com"]);
});

test("accept, decline, accept runs under the nonce CSP with no violation, and the policy reaches Clarity's hosts only", async ({ page }) => {
  const violations = watchCsp(page);
  await stubTags(page);
  await page.goto("/");
  await accept(page);
  await clarityRan(page);
  await reopen(page);
  await decline(page);
  await expect(banner(page)).toBeHidden();
  await reopen(page);
  await accept(page);
  await expect(banner(page)).toBeHidden();
  await page.goto("/misses");
  await clarityRan(page);
  expect(violations).toEqual([]);

  const reach = await page.evaluate(async () => {
    const attempt = async (url) => {
      const blocked = new Promise((resolve) =>
        document.addEventListener("securitypolicyviolation", (e) => e.blockedURI.startsWith(new URL(url).origin) && resolve("blocked"), { once: true })
      );
      const sent = fetch(url, { method: "POST", mode: "no-cors" }).then(() => "sent", () => "sent");
      return Promise.race([blocked, sent.then((v) => new Promise((r) => setTimeout(() => r(v), 150)))]);
    };
    const out = {};
    for (const host of ["www.clarity.ms", "k.clarity.ms", "c.bing.com", "www.bing.com", "clarity.ms.evil.invalid"]) {
      out[host] = await attempt(`https://${host}/collect`);
    }
    return out;
  });
  expect(reach).toEqual({
    "www.clarity.ms": "sent",
    "k.clarity.ms": "sent",
    "c.bing.com": "sent",
    "www.bing.com": "blocked",
    "clarity.ms.evil.invalid": "blocked",
  });
});
