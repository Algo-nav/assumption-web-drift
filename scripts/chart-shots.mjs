// Screenshots every chart on a company page, one PNG per chart plus the whole chart section, for chart review.
// Needs the site running: node scripts/chart-shots.mjs <label> [base] [tickers...]
//   node scripts/chart-shots.mjs before http://localhost:3000 NVDA TGT
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [label = "shot", base = "http://localhost:3000", ...rest] = process.argv.slice(2);
const tickers = rest.length ? rest : ["NVDA", "TGT"];
const out = path.join(process.cwd(), "data", "_work", "screens", "charts", label);
fs.mkdirSync(out, { recursive: true });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const t of tickers) {
  await page.goto(`${base}/company/${t}`, { waitUntil: "networkidle" });
  // Open the "N more charts" panel so the folded charts are captured too.
  await page.evaluate(() => document.querySelectorAll("section[aria-labelledby=charts-h] details").forEach((d) => (d.open = true)));
  await page.waitForTimeout(300);
  const section = page.locator("section[aria-labelledby=charts-h]");
  await section.screenshot({ path: path.join(out, `${t}-section.png`) });
  const charts = page.locator("[data-chart]");
  const n = await charts.count();
  for (let i = 0; i < n; i++) {
    const c = charts.nth(i);
    const title = await c.getAttribute("data-metric");
    const scale = await c.getAttribute("data-scale");
    const file = path.join(out, `${t}-${String(i + 1).padStart(2, "0")}-${slug(title)}-${scale}.png`);
    await c.screenshot({ path: file });
    console.log(file);
  }
}
await browser.close();
