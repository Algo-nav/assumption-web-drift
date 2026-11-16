// The sitemaps, built from the dataset. The three routes that serve them are static, so they are written at
// build time from the release file the build fetched: a data refresh and rebuild updates them.
//   /sitemap.xml        index of the two below
//   /sitemap-pages.xml  home, misses, compare, methodology and one page per company
//   /sitemap-rows.xml   every published row
import { getAllRows, getCompanies, getCompanyRows } from "./data";
import { SITE_URL } from "./site";

export const SITEMAP_INDEX_URL = `${SITE_URL}/sitemap.xml`;
export const SITEMAP_PAGES_URL = `${SITE_URL}/sitemap-pages.xml`;
export const SITEMAP_ROWS_URL = `${SITE_URL}/sitemap-rows.xml`;

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

// A row last changed when its outcome was reported; a row with no outcome yet, when it was stated.
// Both are ISO dates (YYYY-MM-DD), which is a valid lastmod and sorts as text.
export const rowLastmod = (r) => r.reportedAt || r.statedAt;

const latest = (rows) => rows.reduce((max, r) => (rowLastmod(r) > max ? rowLastmod(r) : max), "");

export function pageEntries() {
  const all = latest(getAllRows());
  return [
    { loc: `${SITE_URL}/`, lastmod: all },
    { loc: `${SITE_URL}/misses`, lastmod: all },
    { loc: `${SITE_URL}/compare`, lastmod: all },
    { loc: `${SITE_URL}/methodology`, lastmod: all },
    ...getCompanies().map((c) => ({
      loc: `${SITE_URL}/company/${encodeURIComponent(c.ticker)}`,
      lastmod: latest(getCompanyRows(c.ticker)),
    })),
  ];
}

export function rowEntries() {
  return getAllRows().map((r) => ({ loc: `${SITE_URL}/row/${encodeURIComponent(r.id)}`, lastmod: rowLastmod(r) }));
}

const entry = (tag, { loc, lastmod }) =>
  `<${tag}><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ""}</${tag}>`;

export function urlsetXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => entry("url", e))
    .join("\n")}\n</urlset>\n`;
}

export function indexXml() {
  const pages = pageEntries();
  const rows = rowEntries();
  const newest = (list) => list.reduce((max, e) => (e.lastmod > max ? e.lastmod : max), "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    { loc: SITEMAP_PAGES_URL, lastmod: newest(pages) },
    { loc: SITEMAP_ROWS_URL, lastmod: newest(rows) },
  ]
    .map((e) => entry("sitemap", e))
    .join("\n")}\n</sitemapindex>\n`;
}

export const xmlResponse = (body) =>
  new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
