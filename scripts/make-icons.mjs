// Builds the site icon from the Boldonse S as an outline, so nothing depends on a font at view time.
//   node scripts/make-icons.mjs
// Writes app/icon.svg, then renders public/favicon-32.png and public/favicon-16.png from that same SVG, and
// app/apple-icon.png (180) from the same drawing on a full-bleed square. Boldonse is fetched from Google Fonts (the project loads it through next/font and
// keeps no font file); the outputs are committed, so this only needs running when the mark changes.
import fs from "node:fs";
import opentype from "opentype.js";
import { chromium } from "@playwright/test";

const SIZE = 64;
const RADIUS = 14;
const NAVY = "#0A1A33";
const POWDER = "#E6EFF8";
const SCARLET = "#FF2400";
const BASELINE = 47;
const CAP_HEIGHT = 36;
const DOT = { cx: 50, cy: 44, r: 5 };
// Optical centring: with the dot sitting to its lower right, an S centred by its ink reads as pushed right,
// so its ink is centred this far left of the tile's middle.
const OPTICAL_SHIFT = -2;

// Without a browser user agent Google Fonts serves TrueType, which opentype.js reads directly.
const css = await (await fetch("https://fonts.googleapis.com/css2?family=Boldonse")).text();
const ttfUrl = /url\((https:\/\/[^)]+\.ttf)\)/.exec(css)?.[1];
if (!ttfUrl) throw new Error("No TrueType URL in the Google Fonts response");
const font = opentype.parse(await (await fetch(ttfUrl)).arrayBuffer());

// Scale so the font's cap height (the flat top of H) is CAP_HEIGHT; the S overshoots it slightly, as drawn.
const capUnits = font.tables.os2?.sCapHeight || font.charToGlyph("H").getBoundingBox().y2;
const fontSize = (CAP_HEIGHT / capUnits) * font.unitsPerEm;
const glyph = font.charToGlyph("S");
const box0 = glyph.getPath(0, BASELINE, fontSize).getBoundingBox();
// Placed by the ink of the letter, not its advance width.
const x = SIZE / 2 + OPTICAL_SHIFT - (box0.x1 + box0.x2) / 2;
const path = glyph.getPath(x, BASELINE, fontSize);
const box = path.getBoundingBox();
// The S is one contour. opentype.js leaves it open at the end (a fill closes it anyway); close it explicitly.
if (path.commands.filter((c) => c.type === "M").length !== 1) throw new Error("Expected the S to be a single contour");
const d = path.toPathData(2).replace(/Z?\s*$/i, "Z");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="${NAVY}"/>
  <path fill="${POWDER}" d="${d}"/>
  <circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${SCARLET}"/>
</svg>
`;
fs.writeFileSync("app/icon.svg", svg);
console.log(`S: x ${box.x1.toFixed(2)} to ${box.x2.toFixed(2)}, y ${box.y1.toFixed(2)} to ${box.y2.toFixed(2)}; cap height ${CAP_HEIGHT}, baseline ${BASELINE}, font size ${fontSize.toFixed(2)}`);

const browser = await chromium.launch();
// iOS applies its own mask to the touch icon and paints transparency black, so that one is the same S and dot
// on a square with no rounded corners, written without an alpha channel.
const appleSvg = svg.replace(` rx="${RADIUS}"`, "");
if (appleSvg === svg) throw new Error("The tile's corner radius was not found");
for (const [file, px, source, opaque] of [
  ["app/apple-icon.png", 180, appleSvg, true],
  ["public/favicon-32.png", 32, svg, false],
  ["public/favicon-16.png", 16, svg, false],
]) {
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:${opaque ? NAVY : "transparent"}}svg{display:block;width:${px}px;height:${px}px}</style>${source}`);
  await page.screenshot({ path: file, omitBackground: !opaque });
  await page.close();
  console.log(file);
}
await browser.close();
