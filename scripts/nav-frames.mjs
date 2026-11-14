// Frames of the nav while a page loads already scrolled: fresh browser (empty cache), CPU throttled 4x.
// The page is opened, scrolled to 600px and reloaded, so the browser restores the scroll position; frames of
// the top 120px are taken every 100ms from the moment the reload commits.
//   node scripts/nav-frames.mjs <label> [base] [path]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [label = "frames", base = "http://localhost:3000", route = "/company/NVDA"] = process.argv.slice(2);
const out = path.join(process.cwd(), "data", "_work", "screens", "nav", label);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(base + route, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
await page.waitForTimeout(1200);
await cdp.send("Network.clearBrowserCache");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const t0 = Date.now();
const reload = page.reload({ waitUntil: "commit" });
await reload;
const rows = [];
for (let i = 0; i < 10; i++) {
  const due = t0 + (i + 1) * 100;
  await page.waitForTimeout(Math.max(0, due - Date.now()));
  const state = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="site-nav"]');
    const n = w?.querySelector("nav");
    const bg = w?.querySelector(".nav-bg");
    return w ? { compact: w.dataset.compact, width: Math.round(n.getBoundingClientRect().width), bg: bg ? getComputedStyle(bg).opacity : null, scrollY: Math.round(window.scrollY) } : null;
  }).catch(() => null);
  await page.screenshot({ path: path.join(out, `f${String(i + 1).padStart(2, "0")}.png`), clip: { x: 0, y: 0, width: 1280, height: 120 } }).catch(() => {});
  rows.push({ ms: Date.now() - t0, ...state });
}
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();
console.log(out);
