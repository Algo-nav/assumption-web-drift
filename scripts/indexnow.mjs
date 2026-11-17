// Submits this site's URLs to IndexNow.
//
//   node scripts/indexnow.mjs --all                 every URL in the live sitemap (index, then its children)
//   node scripts/indexnow.mjs --changed <path>      a file of record_ids, one per line: those row pages plus
//                                                   the company pages they belong to
//   --host <host>   overrides INDEXNOW_HOST         --dry-run   lists what would be sent and sends nothing
//
// INDEXNOW_KEY and INDEXNOW_HOST come from the environment (node --env-file=.env scripts/indexnow.mjs ...).
// Without INDEXNOW_KEY nothing is submitted. The key must already be live at https://<host>/<key>.txt.
// Exits non-zero on any response other than 200 or 202.
import fs from "node:fs";
import path from "node:path";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10_000;
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function fail(message) {
  console.error(`indexnow: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { all: false, changed: null, host: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : fail(`${a} needs a value`));
    if (a === "--all") args.all = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--changed") args.changed = value();
    else if (a === "--host") args.host = value();
    else if (a.startsWith("--changed=")) args.changed = a.slice("--changed=".length);
    else if (a.startsWith("--host=")) args.host = a.slice("--host=".length);
    else fail(`unknown argument ${a}`);
  }
  if (args.all === Boolean(args.changed)) fail("give exactly one of --all or --changed <path>");
  return args;
}

const unescapeXml = (s) =>
  s.replace(/&(lt|gt|amp|apos|quot);/g, (_, e) => ({ lt: "<", gt: ">", amp: "&", apos: "'", quot: '"' })[e]);
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => unescapeXml(m[1]));

async function fetchXml(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) fail(`GET ${url} returned ${res.status}`);
  return res.text();
}

// The sitemap at /sitemap.xml is an index; a plain urlset there is accepted too.
async function sitemapUrls(host) {
  const root = await fetchXml(`https://${host}/sitemap.xml`);
  if (!root.includes("<sitemapindex")) return locs(root);
  const urls = [];
  for (const child of locs(root)) {
    if (new URL(child).host !== host) fail(`sitemap index lists ${child}, which is not on ${host}`);
    urls.push(...locs(await fetchXml(child)));
  }
  return urls;
}

// Row and company URLs are built as app/lib/sitemaps.js builds them. The ticker of each record comes from
// the release file the site is built from.
function changedUrls(host, file) {
  const ids = [...new Set(fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean))];
  if (!ids.length) return [];
  const release = process.env.DATA_FILE || path.join(process.cwd(), "data", "release.jsonl");
  const tickerById = new Map();
  for (const line of fs.readFileSync(release, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    tickerById.set(r.record_id, r.ticker);
  }
  const unknown = ids.filter((id) => !tickerById.has(id));
  if (unknown.length) fail(`${unknown.length} record_id(s) not in ${release}: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? ", ..." : ""}`);
  const tickers = [...new Set(ids.map((id) => tickerById.get(id)))];
  return [
    ...ids.map((id) => `https://${host}/row/${encodeURIComponent(id)}`),
    ...tickers.map((t) => `https://${host}/company/${encodeURIComponent(t)}`),
  ];
}

const args = parseArgs(process.argv.slice(2));
const key = process.env.INDEXNOW_KEY;
if (!key) fail("INDEXNOW_KEY is not set; nothing submitted");
if (!KEY_RE.test(key)) fail("INDEXNOW_KEY must be 8 to 128 characters of a-z, A-Z, 0-9 and dash; nothing submitted");
const host = args.host || process.env.INDEXNOW_HOST;
if (!host) fail("no host: set INDEXNOW_HOST or pass --host");
if (!HOST_RE.test(host)) fail(`host must be a bare hostname such as pilot.scndorder.com, got ${JSON.stringify(host)}`);

let urlList = [...new Set(args.all ? await sitemapUrls(host) : changedUrls(host, args.changed))];
const foreign = urlList.filter((u) => new URL(u).host !== host);
if (foreign.length) fail(`${foreign.length} URL(s) are not on ${host}, for example ${foreign[0]}; nothing submitted`);
if (!urlList.length) {
  if (args.all) fail("the sitemap lists no URLs");
  console.log("indexnow: no record_ids in the file; nothing to submit");
  process.exit(0);
}

const keyLocation = `https://${host}/${key}.txt`;
let failed = false;
for (let i = 0; i < urlList.length; i += BATCH) {
  const batch = urlList.slice(i, i + BATCH);
  if (args.dryRun) {
    console.log(`indexnow: dry run, would submit ${batch.length} URLs for ${host}`);
    for (const u of batch) console.log(u);
    continue;
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList: batch }),
    signal: AbortSignal.timeout(60_000),
  });
  console.log(`indexnow: status ${res.status}, ${batch.length} URLs for ${host}`);
  if (res.status !== 200 && res.status !== 202) {
    const text = (await res.text()).trim();
    if (text) console.error(text.slice(0, 500));
    failed = true;
    break;
  }
}
process.exit(failed ? 1 : 0);
