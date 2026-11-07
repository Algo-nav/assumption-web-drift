// Contact sheet of every company logo at the two sizes the site uses, sized exactly as Logo.js sizes them:
// tile (max 20px tall, 56px wide) and company page (max 40px tall, 200px wide); a logo that would fit under
// 14px tall shows the monogram tile instead. Rendered at 1x device pixel
// ratio, with a 16px ruler beside each row and the cap box outlined, so sizes read true.
// Needs the site running: node scripts/logo-sheet.mjs [base]  ->  data/_work/screens/logos.png
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { monogram } from "../app/lib/monogram.js";

const base = process.argv[2] || "http://localhost:3000";
const rows = fs.readFileSync("data/release.jsonl", "utf8").split("\n").filter(Boolean).map(JSON.parse);
const names = new Map(rows.map((r) => [r.ticker, r.company]));
const tickers = [...names.keys()].sort();
const out = path.join(process.cwd(), "data", "_work", "screens", "logos.png");
const CAPS = [["tile", 20, 56], ["page", 40, 200]];
const MIN_H = 14;

function ratio(t) {
  const f = path.join("public", "logos", `${t}.svg`);
  if (!fs.existsSync(f)) return null;
  const vb = /<svg\b[^>]*\bviewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(fs.readFileSync(f, "utf8"));
  return vb ? Number(vb[1]) / Number(vb[2]) : null;
}

// A 16px ruler: a vertical bar with ticks every 4px, the 16px mark labelled.
const ruler = `<span class="ruler"><i style="top:0"></i><i style="top:4px" class="s"></i><i style="top:8px" class="m"></i><i style="top:12px" class="s"></i><i style="top:15px"></i><em>16px</em></span>`;

const cell = (t) => {
  const r = ratio(t);
  const line = ([label, h, w]) => {
    let mark;
    const lw = r ? Math.min(w, h * r) : 0;
    const lh = r ? lw / r : 0;
    if (r && lh >= MIN_H) {
      mark = `<img src="logos/${t}.svg" style="width:${lw}px;height:${lh}px"><span class="dim">${Math.round(lw)} x ${Math.round(lh)}</span>`;
    } else {
      const why = r ? `monogram: logo would be ${Math.round(lw)} x ${lh.toFixed(1)}` : "monogram: no file";
      mark = `<span class="mono" style="width:${h}px;height:${h}px;font-size:${Math.round(h * 0.45)}px">${monogram(t)}</span><span class="dim">${why}</span>`;
    }
    return `<div class="r">${ruler}<b>${label}<br>${h} x ${w}</b><span class="cap" style="width:${w}px;height:${h}px">${mark}</span></div>`;
  };
  return `<div class="c"><div class="t">${t} <i>${names.get(t)}</i></div>${CAPS.map(line).join("")}</div>`;
};

const html = `<!doctype html><meta charset="utf-8"><base href="${base}/"><style>
body{margin:0;padding:24px;background:#eceae1;font:13px/1.4 system-ui,sans-serif;color:#141414}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:1552px}
.c{background:#fff;border:1px solid #d5d1c5;border-radius:8px;padding:16px}
.t{font-weight:600;margin-bottom:12px}.t i{font-weight:400;color:#5c5850;font-style:normal}
.r{display:flex;align-items:center;gap:12px;min-height:56px}
.r b{width:58px;font:500 11px/1.3 monospace;color:#5c5850}
.cap{position:relative;display:flex;align-items:center;outline:1px dashed #c9c4b6;flex:none}
.cap img{display:block}
.dim{position:absolute;left:calc(100% + 10px);white-space:nowrap;font:11px monospace;color:#5c5850}
.ruler{position:relative;width:40px;height:16px;border-left:1px solid #b91c1c;flex:none}
.ruler i{position:absolute;left:0;width:8px;height:1px;background:#b91c1c}.ruler i.s{width:4px}.ruler i.m{width:6px}
.ruler em{position:absolute;left:12px;top:2px;font:10px/1 monospace;color:#b91c1c;font-style:normal}
.mono{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;border:1px solid #141414;border-radius:4px;font:500 11px monospace}
</style><div class="g">${tickers.map(cell).join("")}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.locator(".g").screenshot({ path: out });
await browser.close();
console.log(out);
