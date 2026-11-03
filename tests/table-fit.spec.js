import { test, expect } from "@playwright/test";

// Rows that are not one line tall: a cell whose text runs to a second line, or a row two text lines high.
async function tallRows(page) {
  return page.evaluate(() => {
    document.querySelectorAll("details.year").forEach((d) => (d.open = true));
    const bad = [];
    for (const tr of document.querySelectorAll("table.data tbody tr")) {
      const lh = parseFloat(getComputedStyle(tr.children[0]).lineHeight);
      if (tr.getBoundingClientRect().height >= lh * 2) bad.push(`row ${Math.round(tr.getBoundingClientRect().height)}px: ${tr.textContent.slice(0, 60)}`);
      for (const td of tr.children) {
        const tops = [];
        const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 0) tops.push(r.top);
        }
        tops.sort((a, b) => a - b);
        let lines = tops.length ? 1 : 0;
        for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > lh * 0.6) lines++;
        if (lines > 1) bad.push(`cell on ${lines} lines: ${td.textContent.trim()}`);
      }
    }
    return bad;
  });
}

test.describe("tables at 1280", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const url of ["/misses", "/misses?side=better", "/company/NVDA"]) {
    test(`${url}: every row is one line tall and the table fits without a scroll cue`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      expect(await tallRows(page)).toEqual([]);
      for (const box of await page.locator(".table-scroll").all()) {
        expect(await box.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await expect(box).not.toHaveAttribute("data-overflows");
      }
      await expect(page.locator(".scroll-hint:visible")).toHaveCount(0);
    });
  }
});

test.describe("tables at 1024", () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test("the misses table is wider than its box, so the hint and the fade show", async ({ page }) => {
    await page.goto("/misses");
    const box = page.locator(".table-scroll");
    await expect(box).toHaveAttribute("data-overflows", "");
    await expect(page.locator(".scroll-hint")).toBeVisible();
  });
});
