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

## Railway

- Build command: `npm install && npm run build`
- Start command: `npm run start -- -p $PORT`
- Environment variable: `REQUESTS_DB_PATH`, a file path on a mounted volume, for example `/data/requests.sqlite3`
- Run a single instance. The request limits are enforced in one SQLite write transaction, which is safe across processes on one
  file, but SQLite on a network volume shared by replicas is not supported.
- The request form keys its rate limit on the last `x-forwarded-for` entry (the hop Railway's proxy appends). If the app is ever
  served without a proxy that sets that header, clients can choose their own key.
