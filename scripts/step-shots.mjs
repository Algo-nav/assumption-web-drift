// Viewport screenshots for a design step: top and bottom of each page at 1280 and 390.
// Needs the site running: node scripts/step-shots.mjs <label> [base] [name=path ...]
//   node scripts/step-shots.mjs step1 http://localhost:3000 home=/ company=/company/NVDA
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [label = "shot", base = "http://localhost:3000", ...rest] = process.argv.slice(2);
const pages = rest.length ? rest.map((s) => s.split(/=(.*)/s).slice(0, 2)) : [["home", "/"], ["company", "/company/NVDA"]];
const out = path.join(process.cwd(), "data", "_work", "screens", label);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [w, h] of [[1280, 800], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const [name, url] of pages) {
    await page.goto(base + url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: path.join(out, `${name}-${w}-top.png`) });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(out, `${name}-${w}-bottom.png`) });
    console.log(`${name} ${w}: overflow ${overflow}px`);
  }
  await ctx.close();
}
await browser.close();
console.log(out);
