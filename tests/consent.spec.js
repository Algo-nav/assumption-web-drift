import { test, expect } from "@playwright/test";
import { PILOT_HOST, PORT, REAL_GTAG } from "./test-env.js";

// Ported from the main site (scndorder-site tests/consent.spec.js). What differs: the env var is
// NEXT_PUBLIC_GA_ID, the consent default is this site's nonced inline script, gtag.js is not requested until
// the visitor accepts, and there are CSP checks because this site has a nonce policy.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// NEXT_PUBLIC_* is inlined at build time, so this spec only means something against a build made with it.
// playwright.config.js builds with a dummy id (tests/test-env.js).
test.skip(!GA_ID, "requires a build made with NEXT_PUBLIC_GA_ID set");

const GTAG = 'script[src*="googletagmanager.com/gtag/js"]';

// By default gtag.js is answered here and never fetched from Google, so dataLayer holds exactly what our code
// pushed. With REAL_GTAG=1 nothing is stubbed and Google's own loader runs.
async function stubGtag(page) {
  if (REAL_GTAG) return;
  await page.route(/googletagmanager\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__gtagRan = true;" })
  );
}
const gtagRan = (page) => page.waitForFunction(() => window.__gtagRan === true || Boolean(window.google_tag_manager));

// Every request the page makes to anything Google runs. Host suffixes, so a host we did not expect counts too.
const GOOGLE_RE = /(^|\.)(google|googletagmanager|google-analytics|doubleclick|gstatic|googleapis|googlesyndication|googleadservices)\.(com|net)$/;
function watchGoogle(page) {
  const seen = [];
  page.on("request", (r) => {
    const { hostname, origin, pathname } = new URL(r.url());
    if (GOOGLE_RE.test(hostname)) seen.push(`${r.method()} ${origin}${pathname}`);
  });
  return seen;
}

// Only what our own code pushed: `arguments` objects, as arrays. Google's loader adds plain objects of its own.
const readLayer = (page) =>
  page.evaluate(() =>
    (window.dataLayer || []).filter((e) => Object.prototype.toString.call(e) === "[object Arguments]").map((e) => Array.from(e))
  );

const readConsent = (page) => page.evaluate(() => localStorage.getItem("scnd_consent"));

// Analytics init has run and React has had two frames to settle, so "banner hidden" is not a pre-hydration false pass.
async function settled(page) {
  await page.waitForFunction(() => (window.dataLayer || []).some((e) => e[0] === "config"));
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

const banner = (page) => page.getByRole("dialog", { name: "Cookie choices" });

// The page fixture is a fresh browser context per test: no cookies, no localStorage.
test("a first visit makes no request to any Google host until analytics is accepted", async ({ page, context }) => {
  const google = watchGoogle(page);
  await stubGtag(page);

  const html = await (await page.request.get("/")).text();
  expect(html).not.toMatch(/<(script|link)[^>]*googletagmanager\.com/);

  for (const url of ["/", "/misses", "/company/NVDA", "/methodology"]) {
    await page.goto(url, { waitUntil: "networkidle" });
    await settled(page);
    await expect(banner(page)).toBeVisible();
    await expect(page.locator(GTAG)).toHaveCount(0);
  }
  // Long enough for a loader, had one been requested, to send its first hit.
  await page.waitForTimeout(REAL_GTAG ? 5000 : 500);
  expect(google).toEqual([]);
  expect(await context.cookies()).toEqual([]);

  await banner(page).getByRole("button", { name: "Accept analytics" }).click();
  await gtagRan(page);
  expect(google[0]).toBe("GET https://www.googletagmanager.com/gtag/js");
  if (REAL_GTAG) {
    // The real loader, now consented, reports the page view and sets its cookies.
    await expect.poll(() => google.some((u) => /^POST https:\/\/[a-z0-9.]*(google-analytics\.com|analytics\.google\.com)\/g\/collect$/.test(u)), { timeout: 15_000 }).toBe(true);
    await expect.poll(async () => (await context.cookies()).map((c) => c.name).filter((n) => n.startsWith("_ga")).length).toBe(2);
  }
});

test("declining makes no request to any Google host, on that page or the next", async ({ page, context }) => {
  const google = watchGoogle(page);
  await stubGtag(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toBeHidden();
  await page.goto("/misses", { waitUntil: "networkidle" });
  await settled(page);
  await page.waitForTimeout(REAL_GTAG ? 3000 : 300);
  await expect(page.locator(GTAG)).toHaveCount(0);
  expect(google).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("consent default is declared first, and gtag.js comes after it once accepted", async ({ page }) => {
  await stubGtag(page);

  const html = await (await page.request.get("/")).text();
  expect(html.search(/<script[^>]*id="consent-default"/)).toBeGreaterThan(-1);
  expect(html).not.toContain('role="dialog"');

  await page.goto("/");
  await settled(page);
  const layer = await readLayer(page);
  const indexOfCommand = (name) => layer.findIndex((entry) => entry[0] === name);
  const defaultIdx = layer.findIndex((entry) => entry[0] === "consent" && entry[1] === "default");
  expect(defaultIdx).toBe(0);
  expect(layer[defaultIdx][2]).toEqual({
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });
  expect(defaultIdx).toBeLessThan(indexOfCommand("js"));
  expect(defaultIdx).toBeLessThan(indexOfCommand("config"));
  // No consent update before a choice: nothing is granted on a first visit.
  expect(layer.some((entry) => entry[0] === "consent" && entry[1] === "update")).toBe(false);
  expect(layer[indexOfCommand("config")]).toEqual([
    "config",
    GA_ID,
    { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false },
  ]);

  await banner(page).getByRole("button", { name: "Accept analytics" }).click();
  await page.waitForSelector(GTAG, { state: "attached" });
  const domOrdered = await page.evaluate((sel) => {
    const first = document.getElementById("consent-default");
    const second = document.querySelector(sel);
    return Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING));
  }, GTAG);
  expect(domOrdered).toBe(true);
  // The grant is in the queue before the loader runs.
  await gtagRan(page);
  expect(await readLayer(page)).toContainEqual(["consent", "update", { analytics_storage: "granted" }]);
});

test("banner shows, accept persists, reload hides, cookie settings reopens, decline persists and clears the cookies", async ({
  page,
  context,
}) => {
  const problems = [];
  page.on("pageerror", (err) => problems.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(msg.text());
  });
  const google = watchGoogle(page);
  await stubGtag(page);

  await page.goto("/");
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText("It only runs if you accept.");
  // The policy lives on the main site.
  await expect(banner(page).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "https://scndorder.com/privacy");

  await banner(page).getByRole("button", { name: "Accept analytics" }).click();
  await expect(banner(page)).toBeHidden();
  expect(await readConsent(page)).toBe("granted");
  expect(await readLayer(page)).toContainEqual([
    "consent",
    "update",
    { analytics_storage: "granted" },
  ]);
  await gtagRan(page);

  await page.reload();
  await settled(page);
  await expect(banner(page)).toBeHidden();
  // A returning visitor who accepted: default first, then the grant, both before config; and the loader is requested.
  const layer = await readLayer(page);
  expect(layer.slice(0, 2).map((e) => e.slice(0, 2))).toEqual([["consent", "default"], ["consent", "update"]]);
  await page.waitForSelector(GTAG, { state: "attached" });
  await gtagRan(page);

  // The analytics cookies exist before the decline: the real loader's own, or stand-ins when it is stubbed.
  // "keep" and "_gat_keep" are not analytics cookies and must survive.
  if (!REAL_GTAG) await page.evaluate((id) => {
    document.cookie = "_ga=GA1.1.1.1; path=/";
    document.cookie = `_ga_${id.replace(/^G-/, "")}=GS1.1.1; path=/`;
  }, GA_ID);
  await page.evaluate(() => {
    document.cookie = "keep=1; path=/";
    document.cookie = "_gat_keep=1; path=/";
  });
  const cookieNames = async () => (await context.cookies()).map((c) => c.name).sort();
  await expect.poll(cookieNames, { timeout: 15_000 }).toEqual(["_ga", `_ga_${GA_ID.replace(/^G-/, "")}`, "_gat_keep", "keep"]);
  // No pause here on purpose. Google's loader holds a returning visitor's page view for about five seconds
  // before sending it, so this decline lands while that hit is still queued. It must never leave.

  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(banner(page)).toBeVisible();
  google.length = 0;
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toBeHidden();
  expect(await readConsent(page)).toBe("denied");
  // Denied first, then the cookies go: _ga and every _ga_*, nothing else.
  const afterDecline = await readLayer(page);
  expect(afterDecline.at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
  expect(await cookieNames()).toEqual(["_gat_keep", "keep"]);
  expect(await page.evaluate((id) => window[`ga-disable-${id}`], GA_ID)).toBe(true);

  // The loader is still in the page. It sends nothing more, not even for a new page view, and does not
  // write its cookies back.
  await page.getByRole("link", { name: "Misses" }).first().click();
  await expect(page).toHaveURL(/\/misses$/);
  await page.waitForTimeout(REAL_GTAG ? 8000 : 300);
  expect(google).toEqual([]);
  expect(await cookieNames()).toEqual(["_gat_keep", "keep"]);

  // The guard itself, by hand (stubbed run only; these are probes, not measurements): while declined, a
  // fetch or beacon addressed to Google is dropped and anything else still goes; accepting lets them through.
  if (!REAL_GTAG) {
    const probe = () =>
      page.evaluate(async () => {
        const res = await fetch("https://www.google-analytics.com/g/collect?probe=fetch", { method: "POST", mode: "no-cors" }).then((r) => r.status, () => "failed");
        const beacon = navigator.sendBeacon("https://region1.google-analytics.com/g/collect?probe=beacon", "x");
        const own = await fetch("/robots.txt").then((r) => r.status);
        await new Promise((r) => setTimeout(r, 200));
        return { res, beacon, own };
      });
    expect(await probe()).toEqual({ res: 204, beacon: true, own: 200 });
    expect(google).toEqual([]);
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await banner(page).getByRole("button", { name: "Accept analytics" }).click();
    expect((await probe()).own).toBe(200);
    expect(google).toEqual(["POST https://www.google-analytics.com/g/collect", "POST https://region1.google-analytics.com/g/collect"]);
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await banner(page).getByRole("button", { name: "Decline" }).click();
    expect(await readConsent(page)).toBe("denied");
  }

  // After the decline, the next load asks Google for nothing.
  await page.reload({ waitUntil: "networkidle" });
  await settled(page);
  google.length = 0;
  await page.goto("/misses", { waitUntil: "networkidle" });
  await settled(page);
  await expect(page.locator(GTAG)).toHaveCount(0);
  expect(google).toEqual([]);

  expect(problems.filter((text) => /hydrat|#418|#423|#425/i.test(text))).toEqual([]);
});

// On the production hostname (resolved to the local server), with cookies set the way GA4 sets them: on the
// parent domain, as left by this site or by scndorder.com. Declining from the banner removes them all.
test("declining deletes _ga cookies on the host and on .scndorder.com", async ({ page, context }) => {
  test.skip(REAL_GTAG, "uses seeded cookies; the real loader's are covered above");
  await stubGtag(page);
  const base = `http://${PILOT_HOST}:${PORT}`;
  const far = Math.floor(Date.now() / 1000) + 86400;
  await context.addCookies([
    { name: "_ga", value: "GA1.1.1.1", domain: ".scndorder.com", path: "/", expires: far },
    { name: "_ga_TEST0000000", value: "GS1.1.1", domain: ".scndorder.com", path: "/", expires: far },
    { name: "_ga_MAINSITE001", value: "GS1.1.2", domain: ".scndorder.com", path: "/", expires: far },
    { name: "_ga_HOSTDOMAIN1", value: "GS1.1.3", domain: `.${PILOT_HOST}`, path: "/", expires: far },
    { name: "_ga_HOSTONLY01", value: "GS1.1.4", url: base, expires: far },
    { name: "keep", value: "1", domain: ".scndorder.com", path: "/", expires: far },
  ]);
  await page.goto(`${base}/`);
  expect(new URL(page.url()).hostname).toBe(PILOT_HOST);
  expect((await context.cookies(base)).length).toBe(6);

  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toBeHidden();
  expect((await context.cookies()).map((c) => `${c.name} ${c.domain}`)).toEqual(["keep .scndorder.com"]);
  expect((await readLayer(page)).at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
});

test("the cookie settings link is in the footer's legal row on every kind of page", async ({ page }) => {
  await stubGtag(page);
  for (const url of ["/", "/misses", "/methodology", "/company/NVDA"]) {
    await page.goto(url);
    await expect(page.locator("footer .sf-legal").getByRole("button", { name: "Cookie settings" })).toBeVisible();
  }
});

// This site's nonce policy: both analytics scripts carry the page's nonce, gtag.js executes, nothing is refused.
test("the analytics scripts run under the nonce CSP with no violation", async ({ page }) => {
  const violations = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  await stubGtag(page);

  const res = await page.goto("/");
  const csp = res.headers()["content-security-policy"];
  const nonce = csp.match(/'nonce-([^']+)'/)[1];
  await settled(page);
  await banner(page).getByRole("button", { name: "Accept analytics" }).click();
  await gtagRan(page);
  if (REAL_GTAG) await page.waitForTimeout(4000);

  // The nonce attribute is hidden from the DOM after parsing; the property still holds it.
  const nonces = await page.evaluate((sel) => ({
    boot: document.getElementById("consent-default").nonce,
    gtag: document.querySelector(sel).nonce,
  }), GTAG);
  expect(nonces).toEqual({ boot: nonce, gtag: nonce });
  expect(violations).toEqual([]);

  // The policy lets a measurement through to each Google host it names and to no other. Not run against the
  // real hosts: these are probes, not measurements.
  test.skip(REAL_GTAG, "host probes are for the stubbed run");
  const reach = await page.evaluate(async () => {
    const attempt = async (url) => {
      const blocked = new Promise((resolve) =>
        document.addEventListener("securitypolicyviolation", (e) => e.blockedURI.startsWith(new URL(url).origin) && resolve("blocked"), { once: true })
      );
      const sent = fetch(url, { method: "POST", mode: "no-cors" }).then(() => "sent", () => "sent");
      return Promise.race([blocked, sent.then((v) => new Promise((r) => setTimeout(() => r(v), 150)))]);
    };
    const out = {};
    for (const host of [
      "www.google-analytics.com",
      "analytics.google.com",
      "region1.google-analytics.com",
      "region1.analytics.google.com",
      "stats.g.doubleclick.net",
      "evil.invalid",
    ]) out[host] = await attempt(`https://${host}/g/collect`);
    return out;
  });
  expect(reach).toEqual({
    "www.google-analytics.com": "sent",
    "analytics.google.com": "sent",
    "region1.google-analytics.com": "sent",
    "region1.analytics.google.com": "sent",
    "stats.g.doubleclick.net": "blocked",
    "evil.invalid": "blocked",
  });
});
