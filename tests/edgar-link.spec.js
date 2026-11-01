import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import EdgarLink from "../app/components/EdgarLink.js";
import Excerpt from "../app/components/Excerpt.js";
import { isSecUrl } from "../app/lib/edgar.js";

// renderToStaticMarkup / renderToString are the server render path (Fizz), the one the client-side react-dom
// sanitizer in the browser build does not cover.
const render = (url) => renderToStaticMarkup(createElement(EdgarLink, { evidence: { url } }));

test("a www.sec.gov https URL renders as a link", () => {
  const url = "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000029/nvda-20240128.htm";
  const html = render(url);
  expect(html).toContain(`<a href="${url}"`);
  expect(html).toContain("data-edgar-link");
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("data-edgar-unlinked");
});

const hostile = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "\u0001 javascript:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "http://www.sec.gov/Archives/edgar/x.htm",
  "https://sec.gov/Archives/edgar/x.htm",
  "https://www.sec.gov.evil.example/Archives/x.htm",
  "https://www.sec.gov@evil.example/x",
  "https://evil.example/https://www.sec.gov/x",
  "//www.sec.gov/Archives/x.htm",
  "/relative/path",
  "",
  null,
  undefined,
];

for (const url of hostile) {
  test(`server render: ${JSON.stringify(url)} is plain text with a note and no link`, () => {
    const html = render(url);
    expect(html).not.toMatch(/<a[\s>]/i);
    expect(html).not.toMatch(/href=/i);
    expect(html).toContain("data-edgar-unlinked");
    expect(html).toContain("not linked: the source is not an sec.gov address");
    expect(isSecUrl(url)).toBe(false);
  });
}

test("server render of a javascript: URL through Excerpt and renderToString emits no anchor or href", () => {
  const evidence = {
    url: "javascript:alert(document.domain)",
    excerpt: "Guidance sentence",
    filingType: "8-K",
    accession: "0000000000-00-000000",
    filedAt: "2024-01-01",
  };
  for (const html of [renderToStaticMarkup(createElement(Excerpt, { evidence })), renderToString(createElement(Excerpt, { evidence }))]) {
    expect(html).toContain("Guidance sentence");
    expect(html).not.toMatch(/<a[\s>]/i);
    expect(html).not.toMatch(/href=/i);
    // the URL text is present only as escaped, inert text
    expect(html).toContain("javascript:alert(document.domain)");
  }
});

test("markup in the URL is escaped in the plain-text branch", () => {
  const html = render('"><script>alert(1)</script>');
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
