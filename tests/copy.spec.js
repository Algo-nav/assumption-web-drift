import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const records = readRecords();
const EM_DASH = "\u2014";

// Every string in the data that carries an em-dash. Quoted evidence keeps its original characters,
// so these are the only places an em-dash may appear: inside <blockquote data-excerpt>, and in the
// page data (RSC payload) that renders it.
const quoted = new Set();
(function walk(o) {
  if (typeof o === "string") {
    if (o.includes(EM_DASH)) quoted.add(o);
  } else if (o && typeof o === "object") {
    Object.values(o).forEach(walk);
  }
})(records);

function withoutExcerpts(html) {
  let out = html.replace(/<blockquote\b[^>]*\bdata-excerpt\b[^>]*>[\s\S]*?<\/blockquote>/g, "");
  for (const q of quoted) {
    // Raw, and as escaped inside the JSON the page ships with.
    out = out.split(q).join("").split(JSON.stringify(q).slice(1, -1)).join("");
  }
  return out;
}

test.describe("copy rules", () => {
  test("no em-dash and no buy-side in any page source", async ({ request }) => {
    test.setTimeout(180_000);
    const urls = ["/", "/compare", "/methodology", "/about", "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025"];
    for (const t of new Set(records.map((r) => r.ticker))) urls.push(`/company/${t}`);
    for (const r of records) urls.push(`/row/${r.record_id}`);

    const bad = [];
    for (let i = 0; i < urls.length; i += 25) {
      await Promise.all(
        urls.slice(i, i + 25).map(async (u) => {
          const res = await request.get(u);
          const html = withoutExcerpts(await res.text());
          if (res.status() !== 200) bad.push(`${u} status ${res.status()}`);
          if (html.includes(EM_DASH) || /&mdash;|&#8212;|&#x2014;/i.test(html)) bad.push(`${u} has an em-dash`);
          if (/buy-side/i.test(html)) bad.push(`${u} says buy-side`);
        })
      );
    }
    expect(bad).toEqual([]);
  });
});

test.describe("excerpts are quoted exactly", () => {
  const withDash = records.filter((r) =>
    [r.assumption.evidence, r.outcome?.evidence, r.acknowledgement_evidence].some((e) => e?.excerpt.includes(EM_DASH))
  );

  test("there are rows with em-dashes in the data", () => {
    expect(withDash.length).toBeGreaterThan(0);
  });

  for (const r of withDash) {
    test(`row ${r.record_id} renders the original characters`, async ({ page }) => {
      await page.goto(`/row/${r.record_id}`);
      const shown = await page.locator("[data-excerpt]").allTextContents();
      for (const e of [r.assumption.evidence, r.outcome?.evidence, r.acknowledgement_evidence]) {
        if (e?.excerpt.includes(EM_DASH)) expect(shown).toContain(e.excerpt);
      }
    });
  }

  test("the check still catches an em-dash in our own copy", () => {
    const html = `<main><blockquote class="excerpt" data-excerpt>a ${EM_DASH} b</blockquote><p>our ${EM_DASH} copy</p></main>`;
    expect(withoutExcerpts(html)).toContain(EM_DASH);
    expect(withoutExcerpts(html.replace("our " + EM_DASH + " copy", "ours"))).not.toContain(EM_DASH);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });
  for (const url of ["/", "/company/NVDA", "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025", "/methodology", "/about"]) {
    test(`no horizontal page scroll at 375px: ${url}`, async ({ page }) => {
      await page.goto(url);
      const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scroll).toBeLessThanOrEqual(inner);
    });
  }

  test("the company table scrolls inside its card", async ({ page }) => {
    await page.goto("/company/NVDA");
    const box = page.locator(".table-scroll").first();
    const [sw, cw] = await box.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(sw).toBeGreaterThan(cw);
  });
});
