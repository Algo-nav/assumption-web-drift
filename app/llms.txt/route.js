import { getAllRows, getCompanies, summarise } from "../lib/data";
import { CONTACT_URL, DATASET_URL, GITHUB_URL, MAIN_URL, PRIVACY_URL, PRODUCT_NAME, SITE_NAME, SITE_URL, SPACE_URL, TERMS_URL } from "../lib/site";
import { SITEMAP_INDEX_URL } from "../lib/sitemaps";

// /llms.txt, in the shape of the main site's (scndorder-site public/llms.txt): title, one-paragraph summary,
// short sections, the pages, contact. Written once at build time; every count comes from the release file.
export const dynamic = "force-static";

export function GET() {
  const s = summarise(getAllRows());
  const companies = getCompanies();
  const n = (v) => v.toLocaleString("en-US");
  const body = `# ${PRODUCT_NAME}

> What ${companies.length} companies guided in their SEC filings, and what they reported next. Each row is one guidance statement from an 8-K earnings release, matched to the figure the company later reported, with links to both filings.

${PRODUCT_NAME} is a public pilot from ${SITE_NAME} (${MAIN_URL}). The dataset is released under the CC-BY-4.0 licence. The site makes no model calls; it serves the published release file.

## What is in the record

- ${n(s.rows)} rows across ${companies.length} companies.
- ${n(s.resolved)} resolved: ${n(s.met)} met and ${n(s.missed)} missed.
- Of the misses, ${n(s.missedWorse)} were worse than guided and ${n(s.missedBetter)} better.
- ${n(s.acknowledged)} misses were acknowledged in a later filing; ${n(s.neverAcknowledged)} were not.

## What a row holds

- The claim as stated, the metric, the fiscal period, the guided range and its unit.
- The date it was stated and the filing it came from, with the excerpt.
- The reported figure, its date and filing, once the period has been reported.
- A status: met, missed, unresolved or withdrawn.

## Pages

- [Home](${SITE_URL}/): the question, the company search and the headline counts
- [Misses](${SITE_URL}/misses): every missed row
- [Compare](${SITE_URL}/compare): two periods of one company and metric, side by side
- [Methodology](${SITE_URL}/methodology): the write-up published with the dataset, and provenance
- Row pages: ${SITE_URL}/row/{record_id}, one per row, listed in ${SITE_URL}/sitemap-rows.xml
- [Sitemap](${SITEMAP_INDEX_URL})

## Companies

${companies.map((c) => `- [${c.name} (${c.ticker})](${SITE_URL}/company/${c.ticker}): ${n(c.rows)} rows`).join("\n")}

## Data and code

- [Dataset](${DATASET_URL})
- [Space](${SPACE_URL})
- [Code](${GITHUB_URL})

## Legal

- [Privacy Policy](${PRIVACY_URL})
- [Terms of Use](${TERMS_URL})

## Contact

${CONTACT_URL}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
