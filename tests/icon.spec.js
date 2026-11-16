import { test, expect } from "@playwright/test";
import fs from "node:fs";

const svg = fs.readFileSync("app/icon.svg", "utf8");

test("the icon is a 64px navy tile, an outlined S and a scarlet dot, with no text or font in it", async () => {
  expect(svg).toContain('viewBox="0 0 64 64"');
  expect(svg).toContain('<rect width="64" height="64" rx="14" fill="#0A1A33"/>');
  expect(svg).toContain('<circle cx="50" cy="44" r="5" fill="#FF2400"/>');
  expect(svg).toMatch(/<path fill="#E6EFF8" d="M[^"]+Z\s*"\/>/i);
  // The S is geometry. Nothing in the file can ask for a font.
  expect(svg).not.toMatch(/<text|<tspan|font|@import|<style|href|url\(/i);
});

test("the S sits on y=47 with a cap height of about 36", async ({ page }) => {
  await page.setContent(svg);
  const box = await page.evaluate(() => {
    const b = document.querySelector("path").getBBox();
    return { left: b.x, right: b.x + b.width, top: b.y, bottom: b.y + b.height };
  });
  // The round letter overshoots the baseline and the cap line by a fraction, as the font draws it.
  expect(box.bottom).toBeGreaterThanOrEqual(47);
  expect(box.bottom).toBeLessThan(47.6);
  expect(box.bottom - box.top).toBeGreaterThan(35.5);
  expect(box.bottom - box.top).toBeLessThan(37);
  // Clear of the dot (which starts at x=45) and inside the tile.
  expect(box.right).toBeLessThan(45);
  expect(box.left).toBeGreaterThan(14);
});

// Same pixels whether or not a font can load: every font request is refused, and separately the page is told
// Boldonse and every generic family do not exist.
test("the icon renders identically with fonts blocked", async ({ browser }) => {
  const shot = async (block) => {
    const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 2 });
    let fontRequests = 0;
    if (block) {
      await page.route("**/*", (route) => {
        if (route.request().resourceType() === "font" || /\.(woff2?|ttf|otf)(\?|$)/.test(route.request().url())) {
          fontRequests++;
          return route.abort();
        }
        return route.continue();
      });
    }
    await page.goto("/icon.svg");
    const png = await page.screenshot();
    await page.close();
    return { png, fontRequests };
  };
  const open = await shot(false);
  const blocked = await shot(true);
  expect(blocked.fontRequests).toBe(0);
  expect(blocked.png.equals(open.png)).toBe(true);
});

test("pages link the SVG icon, the PNG fallbacks and the apple icon, and set the theme colour", async ({ page, request }) => {
  await page.goto("/");
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map((l) => ({
      rel: l.rel,
      href: new URL(l.href).pathname,
      type: l.type,
      sizes: l.getAttribute("sizes"),
    }))
  );
  expect(links).toContainEqual({ rel: "icon", href: "/icon.svg", type: "image/svg+xml", sizes: "any" });
  expect(links).toContainEqual({ rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" });
  expect(links).toContainEqual({ rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" });
  expect(links).toContainEqual({ rel: "apple-touch-icon", href: "/apple-icon.png", type: "image/png", sizes: "180x180" });
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0A1A33");

  // Each one is served, as the type it claims, at the size it claims (PNG width and height are at bytes 16-23).
  for (const [path, type, px] of [["/icon.svg", "image/svg+xml"], ["/favicon-32.png", "image/png", 32], ["/favicon-16.png", "image/png", 16], ["/apple-icon.png", "image/png", 180]]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain(type);
    if (px) {
      const body = await res.body();
      expect([body.readUInt32BE(16), body.readUInt32BE(20)], path).toEqual([px, px]);
    }
  }
  // The served SVG is the file in the repo.
  expect(await (await request.get("/icon.svg")).text()).toBe(svg);
});

// iOS masks the touch icon itself and paints transparency black, so the apple icon is a full navy square: no
// alpha channel, navy right into the corners, and the S and the dot where they are in the SVG.
test("the apple icon is a full-bleed opaque navy square with the S and dot in place", async ({ page, request }) => {
  const body = await (await request.get("/apple-icon.png")).body();
  // IHDR colour type at byte 25: 2 is RGB, with no alpha channel (6 would be RGBA).
  expect(body[25]).toBe(2);
  // A blank HTML document to decode the images in.
  await page.setContent("<!doctype html><title>icons</title>");
  const read = (b64, size) =>
    page.evaluate(async ([data, px]) => {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = data; });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = px;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, px, px);
      const at = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
      // Positions on the 64-unit tile, scaled.
      const unit = (x, y) => at(Math.round((x * px) / 64), Math.round((y * px) / 64));
      const ink = [];
      for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { const p = at(x, y); if (p[0] > 200 && p[2] > 200) ink.push([x, y]); }
      return {
        corners: [at(0, 0), at(px - 1, 0), at(0, px - 1), at(px - 1, px - 1)],
        dot: unit(50, 44),
        besideDot: unit(50, 30),
        s: { left: Math.min(...ink.map((p) => p[0])), right: Math.max(...ink.map((p) => p[0])), top: Math.min(...ink.map((p) => p[1])), bottom: Math.max(...ink.map((p) => p[1])) },
      };
    }, [b64, size]);
  const apple = await read("data:image/png;base64," + body.toString("base64"), 180);
  for (const corner of apple.corners) expect(corner).toEqual([10, 26, 51, 255]);
  expect(apple.dot).toEqual([255, 36, 0, 255]);
  expect(apple.besideDot).toEqual([10, 26, 51, 255]);
  // Same S, same place: its extent matches the SVG's own, rendered at the same size.
  const fromSvg = await read("data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"), 180);
  expect(apple.s).toEqual(fromSvg.s);
  expect(fromSvg.corners[0][3]).toBe(0); // the SVG itself keeps its rounded, transparent corners
});
