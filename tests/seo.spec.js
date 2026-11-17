import { test, expect } from "@playwright/test";
import { readRecords } from "./helpers.js";

const SITE = "https://pilot.scndorder.com";
const records = readRecords();
const tickers = [...new Set(records.map((r) => r.ticker))];

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const entries = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}><loc>([^<]+)</loc><lastmod>([^<]+)</lastmod></${tag}>`, "g"))].map((m) => ({ loc: m[1], lastmod: m[2] }));

// A crawler's view of robots.txt: the group for its own name if there is one, otherwise the * group; the
// longest matching rule wins, and allow wins a tie.
function allowed(robots, agent, path) {
  const groups = [];
  let current = null;
  for (const line of robots.split("\n")) {
    const m = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [key, value] = [m[1].toLowerCase(), m[2]];
    if (key === "user-agent") {
      if (!current || current.rules.length) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) current.rules.push([key, value]);
  }
  const group = groups.find((g) => g.agents.includes(agent.toLowerCase())) || groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let best = ["allow", ""];
  for (const [kind, prefix] of group.rules) {
    if (!prefix || !path.startsWith(prefix)) continue;
    if (prefix.length > best[1].length || (prefix.length === best[1].length && kind === "allow")) best = [kind, prefix];
  }
  return best[0] === "allow";
}

test("robots.txt allows Googlebot and Bingbot everywhere but the API, and names the sitemap index", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const robots = await res.text();
  for (const agent of ["Googlebot", "Bingbot", "SomeOtherBot"]) {
    for (const path of ["/", "/misses", "/compare", "/methodology", "/company/NVDA", `/row/${records[0].record_id}`, "/sitemap.xml", "/llms.txt"]) {
      expect(allowed(robots, agent, path), `${agent} ${path}`).toBe(true);
    }
    expect(allowed(robots, agent, "/api/requests"), `${agent} /api/requests`).toBe(false);
  }
  expect(robots).toMatch(new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, "m"));
  // No Host directive: it is not part of the robots standard.
  expect(robots).not.toMatch(/^\s*host\s*:/im);
});

test("/sitemap.xml is an index of the pages and rows sitemaps", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/xml");
  const xml = await res.text();
  expect(xml).toContain("<sitemapindex");
  expect(locs(xml)).toEqual([`${SITE}/sitemap-pages.xml`, `${SITE}/sitemap-rows.xml`]);
});

test("/sitemap-pages.xml lists home, misses, compare, methodology and every company", async ({ request }) => {
  const res = await request.get("/sitemap-pages.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<urlset");
  const found = locs(xml);
  expect(tickers).toHaveLength(15);
  expect(found.slice(0, 4)).toEqual([`${SITE}/`, `${SITE}/misses`, `${SITE}/compare`, `${SITE}/methodology`]);
  expect(found.slice(4).sort()).toEqual(tickers.map((t) => `${SITE}/company/${t}`).sort());
  for (const e of entries(xml, "url")) expect(e.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(entries(xml, "url")).toHaveLength(19);
  // Every listed page is served.
  for (const loc of found) expect((await request.get(loc.replace(SITE, ""))).status(), loc).toBe(200);
});

test("/sitemap-rows.xml lists every published row, dated by its outcome or else its stated date", async ({ request }) => {
  const res = await request.get("/sitemap-rows.xml");
  expect(res.status()).toBe(200);
  const got = entries(await res.text(), "url");
  const want = records.map((r) => ({
    loc: `${SITE}/row/${r.record_id}`,
    lastmod: r.outcome?.reported_at || r.assumption.stated_at,
  }));
  const byLoc = (a, b) => a.loc.localeCompare(b.loc);
  expect(got.sort(byLoc)).toEqual(want.sort(byLoc));
  // Both kinds of row are present, so both branches of the date rule are exercised.
  expect(records.some((r) => r.outcome?.reported_at)).toBe(true);
  expect(records.some((r) => !r.outcome?.reported_at)).toBe(true);
  for (const e of [got[0], got[Math.floor(got.length / 2)], got.at(-1)]) {
    expect((await request.get(e.loc.replace(SITE, ""))).status(), e.loc).toBe(200);
  }
});

test("/llms.txt has the main site's shape and this site's counts", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const text = await res.text();
  expect(text.startsWith("# assumption-drift\n\n> ")).toBe(true);
  expect(text.match(/^## .+$/gm)).toEqual(["## What is in the record", "## What a row holds", "## Pages", "## Companies", "## Data and code", "## Legal", "## Contact"]);
  const missed = records.filter((r) => r.status === "missed").length;
  const met = records.filter((r) => r.status === "met").length;
  const n = (v) => v.toLocaleString("en-US");
  expect(text).toContain(`- ${n(records.length)} rows across 15 companies.`);
  expect(text).toContain(`- ${n(met + missed)} resolved: ${n(met)} met and ${n(missed)} missed.`);
  for (const t of tickers) expect(text).toContain(`](${SITE}/company/${t})`);
  // Every link to this site resolves.
  for (const [, path] of text.matchAll(/\]\(https:\/\/pilot\.scndorder\.com([^)]*)\)/g)) {
    expect((await request.get(path || "/")).status(), path).toBe(200);
  }
});
