# assumption-drift web (pilot.scndorder.com, first half)

Serves the published assumption-drift dataset for its 15 companies. No model calls, no API keys.

## Run locally

    npm install
    npm run dev          # fetches the data first (predev), then starts on :3000
    # to store company requests locally:
    REQUESTS_DB_PATH=./data/requests.sqlite3 npm run dev

Without `REQUESTS_DB_PATH` the request form returns 503 and shows no success message.

## Data

`npm run fetch-data` (also runs before `dev` and `build`) downloads into `data/`:

- `release.jsonl` from `Nav772/assumption-drift` on Hugging Face (`data/assumption_drift.jsonl` in that repo)
- `WRITEUP.md` from `Algo-nav/assumption-drift` on GitHub

Both are pinned to a commit SHA, not a branch. The two revisions live in `scripts/data-sources.mjs`; to publish new data, change
them there, rebuild, and review the `data/` diff first. Downloads are size-capped, and the write-up is sanitized to a small
HTML allowlist before it is rendered (`app/lib/writeup.js`).

If a download fails and an earlier copy exists, the earlier copy is kept. Rows are read in
`app/lib/data/source.js`; replace that one file to read from Postgres.

## Tests

    npm run test:e2e     # builds, starts two servers, runs Playwright

## IndexNow

    node --env-file=.env scripts/indexnow.mjs --all                  # every URL in the live sitemap
    node --env-file=.env scripts/indexnow.mjs --changed ids.txt      # those rows (record_ids, one per line) and their companies

Needs `INDEXNOW_KEY` and a host (`INDEXNOW_HOST` or `--host pilot.scndorder.com`); `--dry-run` lists the URLs and sends
nothing. Without the key nothing is submitted. Exits non-zero on any response other than 200 or 202.

## Railway

- Build command: `npm install && npm run build`
- Start command: `npm run start -- -p $PORT`
- Environment variable: `REQUESTS_DB_PATH`, a file path on a mounted volume, for example `/data/requests.sqlite3`
- Environment variable: `NEXT_PUBLIC_GA_ID`, the GA4 measurement ID. Optional, and read at build time. Unset means no
  analytics script, no consent banner and no Google hosts in the CSP. See `.env.example`.
- Environment variable: `NEXT_PUBLIC_CLARITY_ID`, the Microsoft Clarity project id. Optional, and read at build time. The
  tag loads only after the visitor accepts analytics. Unset means no Clarity tag and no Clarity or Bing hosts in the CSP.
- Environment variable: `INDEXNOW_KEY`, the IndexNow key. Optional, and read at request time. The site serves it at
  `/<key>.txt`; unset means that address is 404.
- Run a single instance. The request limits are enforced in one SQLite write transaction, which is safe across processes on one
  file, but SQLite on a network volume shared by replicas is not supported.
- The request form keys its rate limit on the last `x-forwarded-for` entry (the hop Railway's proxy appends). If the app is ever
  served without a proxy that sets that header, clients can choose their own key.
