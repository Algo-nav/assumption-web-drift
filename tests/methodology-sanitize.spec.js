import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderWriteup } from "../app/lib/writeup.js";
import Methodology from "../app/methodology/page.js";

const FIXTURE = path.join(process.cwd(), "tests", "fixtures", "hostile-writeup.md");
const hostile = fs.readFileSync(FIXTURE, "utf8");

test.describe("renderWriteup", () => {
  const html = renderWriteup(hostile);

  test("nothing executable survives", () => {
    expect(html).not.toMatch(/<script|<iframe|<style|<img|<div|<form|<svg|<object|<embed/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:text/i);
    expect(html).not.toContain("__pwned");
    expect(html).not.toContain("display: none");
    expect(html).not.toContain("//evil.example");
  });

  test("the allowed structure is kept", () => {
    expect(html).toContain("<h1>What the model got wrong (fixture)</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>emphasis</em>");
    expect(html).toContain("<code>inline code</code>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<table>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("fenced code");
  });

  test("links keep an https href and get rel=noopener", () => {
    expect(html).toMatch(/<a [^>]*href="https:\/\/example\.com\/page"[^>]*>/);
    for (const tag of html.match(/<a\b[^>]*>/g)) expect(tag).toContain('rel="noopener"');
  });

  test("a hand-written rel is replaced, not kept", () => {
    const out = renderWriteup('<a href="https://example.com/" rel="opener">x</a>');
    expect(out).toContain('rel="noopener"');
    expect(out).not.toContain('rel="opener"');
  });
});

test("server-rendering the methodology page with a hostile write-up emits no script", () => {
  const before = process.env.WRITEUP_FILE;
  process.env.WRITEUP_FILE = FIXTURE;
  try {
    const page = renderToStaticMarkup(createElement(Methodology));
    expect(page).toContain("What the model got wrong (fixture)");
    expect(page).not.toMatch(/<script/i);
    expect(page).not.toMatch(/\son[a-z]+\s*=/i);
    expect(page).not.toContain("__pwned");
    expect(page).not.toMatch(/javascript:/i);
  } finally {
    if (before === undefined) delete process.env.WRITEUP_FILE;
    else process.env.WRITEUP_FILE = before;
  }
});

test("the built /methodology page has no script, handler or non-https link inside the article", async ({ page }) => {
  await page.goto("/methodology");
  const article = page.locator("article.prose");
  await expect(article).toBeVisible();
  expect(await article.locator("script, iframe, style, img, form, object, embed").count()).toBe(0);
  const bad = await article.evaluate((el) =>
    [el, ...el.querySelectorAll("*")].flatMap((n) => [...n.attributes].map((a) => a.name)).filter((n) => n.startsWith("on"))
  );
  expect(bad).toEqual([]);
  const hrefs = await article.locator("a").evaluateAll((els) => els.map((e) => [e.getAttribute("href"), e.getAttribute("rel")]));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const [href, rel] of hrefs) {
    expect(href).toMatch(/^(https?:|mailto:)/);
    expect(rel).toContain("noopener");
  }
});
