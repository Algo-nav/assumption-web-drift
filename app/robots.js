import { SITE_URL } from "./lib/site";
import { SITEMAP_INDEX_URL } from "./lib/sitemaps";

// Served at /robots.txt by Next.js App Router metadata routes. One rule for every crawler, Googlebot and
// Bingbot included: everything but the JSON API.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: SITEMAP_INDEX_URL,
    host: SITE_URL,
  };
}
