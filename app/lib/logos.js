import fs from "node:fs";
import path from "node:path";

// Logos are static files in public/logos/<TICKER>.svg (sources in public/logos/SOURCES.md), served from this origin.
const DIR = path.join(process.cwd(), "public", "logos");
const cache = new Map();

// The logo's aspect ratio (width / height, from its viewBox), or null when there is no usable logo file.
// Tickers come from the dataset, and only A-Z and "." are accepted here.
export function logoRatio(ticker) {
  if (!/^[A-Z.]{1,8}$/.test(ticker)) return null;
  if (!cache.has(ticker)) {
    let ratio = null;
    try {
      const svg = fs.readFileSync(path.join(DIR, `${ticker}.svg`), "utf8");
      const vb = /<svg\b[^>]*\bviewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(svg);
      if (vb && Number(vb[1]) > 0 && Number(vb[2]) > 0) ratio = Number(vb[1]) / Number(vb[2]);
    } catch {
      ratio = null;
    }
    cache.set(ticker, ratio);
  }
  return cache.get(ticker);
}
