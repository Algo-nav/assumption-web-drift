// Full-page screenshots for design review. Needs the site running: node scripts/screens.mjs http://localhost:3000
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] || "http://localhost:3000";
const out = path.join(process.cwd(), "data", "_work", "screens");
fs.mkdirSync(out, { recursive: true });

const rows = fs.readFileSync("data/release.jsonl", "utf8").split("\n").filter(Boolean).map(JSON.parse);
const row = rows.find((r) => r.status === "missed" && r.ticker === "UNH" && r.assumption.metric === "revenue" && r.assumption.target_period === "FY2020");
const pages = [
  ["home", "/"],
  ["company-nvda", "/company/NVDA"],
  ["row", `/row/${row.record_id}`],
  ["misses", "/misses"],
  ["compare", "/compare?t=NVDA&m=revenue&a=Q1%20FY2024&b=Q1%20FY2025"],
];

const browser = await chromium.launch();
for (const [w, h] of [[1280, 900], [375, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const [name, url] of pages) {
    await page.goto(base + url, { waitUntil: "networkidle" });
    const file = path.join(out, `${name}-${w}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
